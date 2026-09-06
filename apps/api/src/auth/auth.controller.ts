import type { CookieOptions, Request, Response } from "express";
import { Body, Controller, Get, HttpCode, Post, Query, Req, Res, UseGuards } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import { AuthGuard } from "./auth.guard.js";
import { AuthService } from "./auth.service.js";
import type { AuthenticatedRequest } from "./auth.types.js";
import { SESSION_COOKIE_NAME } from "./auth.types.js";
import { NonceQueryDto, VerifyWalletDto } from "./dto/auth.dto.js";

export function sessionCookieOptions(isProduction: boolean): CookieOptions {
	return {
		httpOnly: true,
		secure: isProduction,
		// The production web and API deployments use different HTTPS origins.
		// `None` is required for credentialed XHR; local HTTP remains Lax.
		sameSite: isProduction ? "none" : "lax",
		maxAge: 60 * 60 * 1000,
		path: "/",
	};
}

@Controller("auth")
export class AuthController {
	constructor(
		private readonly authService: AuthService,
		private readonly configService: ConfigService,
	) {}

	@Get("nonce")
	async nonce(@Query() query: NonceQueryDto) {
		return { data: await this.authService.createNonce(query.address) };
	}

	@Post("verify")
	@HttpCode(200)
	async verify(@Body() body: VerifyWalletDto, @Res({ passthrough: true }) response: Response) {
		const session = await this.authService.verifyWallet(body.address, body.nonce, body.signature);

		response.cookie(SESSION_COOKIE_NAME, session.token, this.cookieOptions());
		return { data: { user: session.user } };
	}

	@Post("logout")
	@HttpCode(200)
	logout(@Req() _request: Request, @Res({ passthrough: true }) response: Response) {
		response.clearCookie(SESSION_COOKIE_NAME, this.cookieOptions());
		return { data: { authenticated: false } };
	}

	@Get("me")
	@UseGuards(AuthGuard)
	me(@Req() request: AuthenticatedRequest) {
		return { data: { user: request.user } };
	}

	private cookieOptions() {
		const isProduction = this.configService.get<string>("NODE_ENV") === "production";
		return sessionCookieOptions(isProduction);
	}
}
