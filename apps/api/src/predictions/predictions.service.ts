import type { PredictionFeedItem, PredictorSummary } from "@credence/shared";
import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";

import { DreamDexService } from "../dreamdex/dreamdex.service.js";
import { LeaderboardService } from "../leaderboard/leaderboard.service.js";
import { isVerifiedPredictor, User } from "../users/schemas/user.schema.js";
import { PredictionUnlock } from "../unlocks/schemas/prediction-unlock.schema.js";
import { CreateDraftDto, CreatePredictionDto } from "./dto/create-prediction.dto.js";
import { toGatedPredictionDto, toPredictorSummary, toVisiblePredictionDto } from "./prediction.dto.js";
import { Prediction, type PredictionDocument } from "./schemas/prediction.schema.js";
import { ReputationService } from "../reputation/reputation.service.js";
import { BackedPrediction } from "../backs/schemas/backed-prediction.schema.js";

@Injectable()
export class PredictionsService {
	constructor(
		@InjectModel(Prediction.name) private readonly predictionModel: Model<Prediction>,
		@InjectModel(User.name) private readonly userModel: Model<User>,
		@InjectModel(PredictionUnlock.name)
		private readonly unlockModel: Model<PredictionUnlock>,
		@InjectModel(BackedPrediction.name)
		private readonly backModel: Model<BackedPrediction>,
		private readonly dreamDex: DreamDexService,
		private readonly leaderboard: LeaderboardService,
		private readonly reputation?: ReputationService,
	) {}

	async create(walletAddress: string, input: CreatePredictionDto): Promise<PredictionDocument> {
		const canonicalAddress = walletAddress.toLowerCase();
		const existing = await this.predictionModel.findOne({ transactionHash: input.transactionHash.toLowerCase() }).exec();
		if (existing) {
			if (existing.predictorAddress !== canonicalAddress || existing.marketId !== input.marketId) throw new ConflictException("This transaction is already linked to another prediction.");
			return existing;
		}
		throw new BadRequestException("Create a server draft before trading. This endpoint only recovers existing records.");
	}

	async createDraft(walletAddress: string, input: CreateDraftDto): Promise<PredictionDocument> {
		const canonicalAddress = walletAddress.toLowerCase();
		if (!Number.isFinite(Number(input.stakeAmount)) || Number(input.stakeAmount) <= 0) throw new BadRequestException("Stake must be positive");
		const market = await this.dreamDex.getEventMarket(input.marketId);
		if (market.marketId.toLowerCase() !== input.marketId.toLowerCase()) throw new BadRequestException("Exact draft market mismatch");
		await this.dreamDex.assertTradingWindow(market.marketId, market.marketAddress);
		const user = await this.userModel
			.findOneAndUpdate({ walletAddress: canonicalAddress }, { $setOnInsert: { walletAddress: canonicalAddress } }, { upsert: true, returnDocument: "after", setDefaultsOnInsert: true })
			.orFail()
			.exec();
		if (input.visibility === "LOCKED" && !isVerifiedPredictor(user)) {
			throw new BadRequestException({
				message: "Only Verified Predictors can publish locked predictions",
				code: "VERIFIED_PREDICTOR_REQUIRED",
			});
		}

		const probabilities = await this.dreamDex.getMarketProbabilities(market.marketId);
		const draftBlockNumber = await this.dreamDex.draftBlock();
		// Repeat after slow metadata/quote reads; do not create a draft after close.
		await this.dreamDex.assertTradingWindow(market.marketId, market.marketAddress);
		if (Date.now() >= Date.parse(market.expiryAt)) throw new BadRequestException("This window has ended");
		const probability = input.direction === "UP" ? probabilities.yes : probabilities.no;
		return await this.predictionModel.create({
			predictor: user._id,
			predictorAddress: canonicalAddress,
			source: "LIVE",
			marketId: market.marketId,
			marketAddress: market.marketAddress.toLowerCase(),
			poolAddress: market.poolAddress.toLowerCase(),
			windowSeconds: Math.round((new Date(market.expiryAt).getTime() - new Date(market.tradingStartAt).getTime()) / 1000),
			expiry: new Date(market.expiryAt),
			side: input.direction === "UP" ? "Up" : "Down",
			entryPrice: probabilities.yes,
			draftBlockNumber,
			marketStatus: "closed",
			venueId: market.venueId ?? undefined,
			symbol: market.underlying,
			underlying: market.underlying,
			marketTitle: market.title,
			marketStartAt: new Date(market.tradingStartAt),
			marketExpiryAt: new Date(market.expiryAt),
			direction: input.direction,
			confidence: input.confidence,
			reasoning: input.reasoning?.trim() || undefined,
			visibility: input.visibility,
			marketProbabilityAtEntry: probability,
			stakeAmount: input.stakeAmount,
			collateralSymbol: market.collateralSymbol,
			collateralTokenAddress: market.collateralTokenAddress,
			collateralDecimals: market.collateralDecimals,
			status: "PENDING_TRADE",
		});
	}

	async confirmDraft(id: string, wallet: string, hash: `0x${string}`): Promise<PredictionDocument> {
		const row = await this.predictionModel.findById(id).exec();
		if (!row || row.predictorAddress !== wallet.toLowerCase() || !row.draftBlockNumber) throw new NotFoundException("Draft was not found");
		const canonicalHash = hash.toLowerCase();
		if (row.transactionHash === canonicalHash) return row;
		if (row.status !== "PENDING_TRADE") throw new ConflictException("Draft is no longer pending");
		if (row.submittedTransactionHash && row.submittedTransactionHash !== canonicalHash) throw new ConflictException("Draft is bound to a different transaction");
		const bound = await this.predictionModel
			.findOneAndUpdate(
				{ _id: row._id, status: "PENDING_TRADE", $or: [{ submittedTransactionHash: { $exists: false } }, { submittedTransactionHash: canonicalHash }] },
				{ $set: { submittedTransactionHash: canonicalHash } },
				{ returnDocument: "after" },
			)
			.exec();
		if (!bound) throw new ConflictException("Draft confirmation changed; retry the same transaction");
		let proof;
		try {
			proof = await this.dreamDex.verifyPredictionTrade({
				transactionHash: hash,
				marketId: row.marketId,
				marketAddress: row.marketAddress,
				afterBlock: row.draftBlockNumber,
				notBefore: row.createdAt,
				sender: row.predictorAddress,
				direction: row.direction,
			});
		} catch (error) {
			// Only definitive invalid receipts fail a draft. RPC/indexer outages remain
			// recoverable and must never destroy proof of a pre-expiry forecast.
			if (error instanceof BadRequestException) await this.predictionModel.updateOne({ _id: row._id, status: "PENDING_TRADE" }, { $set: { status: "FAILED", marketStatus: "dead" } }).exec();
			throw error;
		}
		const cost = await this.dreamDex.entryCost(hash, row.collateralTokenAddress!, row.predictorAddress);
		const live = await this.dreamDex
			.assertTradingWindow(row.marketId, row.marketAddress)
			.then(() => true)
			.catch(() => false);
		try {
			const updated = await this.predictionModel
				.findOneAndUpdate(
					{ _id: row._id, status: "PENDING_TRADE", submittedTransactionHash: canonicalHash },
					{
						$set: {
							transactionHash: canonicalHash,
							entryTx: canonicalHash,
							orderId: proof.orderId,
							positionReference: proof.filledQuantity,
							entryCostBaseUnits: cost,
							status: "ACTIVE",
							marketStatus: live ? "live" : "closed",
						},
					},
					{ returnDocument: "after", runValidators: true },
				)
				.exec();
			if (updated) return updated;
			const current = await this.predictionModel.findById(id).exec();
			if (current?.transactionHash === canonicalHash) return current;
			throw new ConflictException("Draft confirmation changed");
		} catch (error) {
			if (typeof error === "object" && error && "code" in error && error.code === 11000) throw new ConflictException("Transaction already linked to another prediction");
			throw error;
		}
	}

	async listMine(walletAddress: string): Promise<PredictionDocument[]> {
		return this.predictionModel.find({ predictorAddress: walletAddress.toLowerCase() }).sort({ createdAt: -1 }).exec();
	}

	async confirmClaim(id: string, walletAddress: string, hash: `0x${string}`): Promise<void> {
		const prediction = await this.predictionModel.findById(id).exec();
		if (!prediction || prediction.predictorAddress !== walletAddress.toLowerCase()) throw new NotFoundException("Prediction was not found");
		if (prediction.status !== "RESOLVED" || prediction.source !== "LIVE" || !prediction.marketAddress || !prediction.positionReference || prediction.entryCostBaseUnits === undefined || prediction.collateralDecimals === undefined)
			throw new BadRequestException("This record needs verified settlement and entry accounting before claim recording.");
		if (prediction.claimTransactionHash) {
			if (prediction.claimTransactionHash === hash.toLowerCase()) return;
			throw new ConflictException("This prediction already has a recorded claim.");
		}
		const pnl = await this.dreamDex.verifyClaim({
			hash,
			marketId: prediction.marketId,
			marketAddress: prediction.marketAddress,
			direction: prediction.direction,
			quantity: prediction.positionReference,
			cost: prediction.entryCostBaseUnits,
			decimals: prediction.collateralDecimals,
			wallet: walletAddress,
		});
		await this.predictionModel.updateOne({ _id: prediction._id, claimTransactionHash: { $exists: false } }, { $set: { claimTransactionHash: hash.toLowerCase(), realizedPnl: pnl } }).exec();
		await this.reputation?.recalculate(walletAddress);
	}

	async getFeed(viewerAddress?: string): Promise<PredictionFeedItem[]> {
		const predictions = await this.predictionModel.find({ status: "ACTIVE" }).sort({ createdAt: -1 }).limit(50).exec();
		return this.secureDtos(predictions, viewerAddress);
	}

	async getById(id: string, viewerAddress?: string): Promise<PredictionFeedItem> {
		const prediction = await this.predictionModel.findById(id).exec();
		if (!prediction || (prediction.status === "PENDING_TRADE" && prediction.predictorAddress !== viewerAddress?.toLowerCase())) throw new NotFoundException("Prediction was not found");
		const [dto] = await this.secureDtos([prediction], viewerAddress);
		if (!dto) throw new NotFoundException("Prediction was not found");
		return dto;
	}

	async getForProfile(predictorAddress: string, viewerAddress?: string): Promise<{ active: PredictionFeedItem[]; resolved: PredictionFeedItem[] }> {
		const canonicalPredictorAddress = predictorAddress.toLowerCase();
		const canonicalViewerAddress = viewerAddress?.toLowerCase();
		const ownBackedPredictionIds = canonicalViewerAddress === canonicalPredictorAddress ? await this.backModel.find({ backerAddress: canonicalViewerAddress, status: "CONFIRMED" }).distinct("prediction").exec() : [];
		const predictions = await this.predictionModel
			.find({ predictorAddress: predictorAddress.toLowerCase(), status: { $in: ["ACTIVE", "RESOLVED"] } })
			.sort({ createdAt: -1 })
			.exec();
		const backedActivePredictions = ownBackedPredictionIds.length ? await this.predictionModel.find({ _id: { $in: ownBackedPredictionIds }, status: "ACTIVE" }).exec() : [];
		const predictionById = new Map(predictions.map((prediction) => [prediction._id.toString(), prediction]));
		backedActivePredictions.forEach((prediction) => predictionById.set(prediction._id.toString(), prediction));
		const secured = await this.secureDtos([...predictionById.values()], viewerAddress);
		return {
			active: secured.filter((prediction) => prediction.status === "ACTIVE"),
			resolved: secured.filter((prediction) => prediction.status === "RESOLVED"),
		};
	}

	private async secureDtos(predictions: PredictionDocument[], viewerAddress?: string): Promise<PredictionFeedItem[]> {
		if (predictions.length === 0) return [];
		const addresses = [...new Set(predictions.map((prediction) => prediction.predictorAddress))];
		const users = await this.userModel.find({ walletAddress: { $in: addresses } }).exec();
		const ranks = await this.leaderboard.ranks(addresses);
		const summaries = new Map<string, PredictorSummary>(users.map((user) => [user.walletAddress, { ...toPredictorSummary(user), rank: ranks.get(user.walletAddress) }]));
		const viewer = viewerAddress?.toLowerCase();
		const unlocked = new Set<string>();
		if (viewer) {
			const rows = await this.unlockModel
				.find({
					buyerAddress: viewer,
					status: "CONFIRMED",
					prediction: { $in: predictions.map((prediction) => prediction._id) },
				})
				.select("prediction")
				.exec();
			rows.forEach((row) => unlocked.add(row.prediction.toString()));
		}

		const windows = new Map<string, Promise<boolean>>();
		for (const prediction of predictions) {
			if (prediction.status === "ACTIVE" && prediction.source === "LIVE" && !windows.has(prediction.marketId)) {
				windows.set(
					prediction.marketId,
					this.dreamDex
						.assertTradingWindow(prediction.marketId, prediction.marketAddress)
						.then(() => true)
						.catch(() => false),
				);
			}
		}
		return Promise.all(
			predictions.map(async (prediction) => {
				prediction.marketStatus = prediction.status === "RESOLVED" ? "resolved" : prediction.status === "FAILED" ? "dead" : prediction.source === "LIVE" && (await windows.get(prediction.marketId)) ? "live" : "closed";
				const predictor = summaries.get(prediction.predictorAddress) ?? {
					walletAddress: prediction.predictorAddress,
					reputationScore: 50,
					resolvedPredictions: 0,
					accuracy: 0,
					verified: false,
				};
				const canView = prediction.status === "RESOLVED" || prediction.visibility === "PUBLIC" || viewer === prediction.predictorAddress || unlocked.has(prediction._id.toString());
				return canView ? toVisiblePredictionDto(prediction, predictor) : toGatedPredictionDto(prediction, predictor);
			}),
		);
	}
}
