import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from "class-validator";

export class CreatePredictionDto {
  @Matches(/^0x[a-f\d]{64}$/i)
  marketId!: string;

  @IsEnum(["UP", "DOWN"])
  direction!: "UP" | "DOWN";

  @IsNumber()
  @Min(50)
  @Max(99)
  confidence!: number;

  @IsString()
  @Matches(/^\d+(?:\.\d+)?$/, { message: "stakeAmount must be a positive decimal string" })
  stakeAmount!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  reasoning?: string;

  @IsEnum(["PUBLIC"] as const, { message: "only PUBLIC predictions are available in this phase" })
  visibility!: "PUBLIC";

  @IsNumber()
  @Min(0)
  @Max(1)
  marketProbabilityAtEntry!: number;

  @Matches(/^0x[a-f\d]{64}$/i)
  transactionHash!: `0x${string}`;
}
