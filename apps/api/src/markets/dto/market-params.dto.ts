import { Matches } from "class-validator";

export class MarketParamsDto {
  @Matches(/^0x[a-f\d]{64}$/i, { message: "marketId must be a bytes32 hex value" })
  marketId!: string;
}
