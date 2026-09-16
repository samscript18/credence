import { IsIn, IsInt, Matches, Max, Min } from "class-validator";

export class EnableAutoClaimDto {
  @Matches(/^0x[a-f\d]{40}$/i) module!: string;
  @Matches(/^0x[a-f\d]{64}$/i) marketId!: string;
  @IsIn([0, 1]) outcomeIdx!: 0 | 1;
  @Matches(/^\d+$/) amount!: string;
  @Matches(/^\d+$/) nonce!: string;
  @Matches(/^\d+$/) deadline!: string;
  @IsInt() @Min(0) @Max(4_294_967_295) operatorId!: number;
  @Matches(/^0x[a-f\d]{64}$/i) venueId!: string;
  @Matches(/^0x[a-f\d]{130}$/i) signature!: string;
}
