import { Matches } from "class-validator";

export class CreateBackDto {
  @Matches(/^0x[a-f\d]{64}$/i)
  transactionHash!: `0x${string}`;
}
