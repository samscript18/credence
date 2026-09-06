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

export class CreateDraftDto {
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

  @IsEnum(["PUBLIC", "LOCKED"] as const)
  visibility!: "PUBLIC" | "LOCKED";

}

export class CreatePredictionDto extends CreateDraftDto {
  @IsNumber()
  @Min(0)
  @Max(1)
  marketProbabilityAtEntry!: number;

  @Matches(/^0x[a-f\d]{64}$/i)
  transactionHash!: `0x${string}`;
}
