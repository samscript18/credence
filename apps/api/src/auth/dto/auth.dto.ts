import { IsEthereumAddress, IsString, Matches } from "class-validator";

export class NonceQueryDto {
  @IsEthereumAddress()
  address!: string;
}

export class VerifyWalletDto {
  @IsEthereumAddress()
  address!: string;

  @IsString()
  @Matches(/^[a-f\d]{48}$/i, { message: "nonce must be a 48-character hexadecimal string" })
  nonce!: string;

  @IsString()
  @Matches(/^0x[a-f\d]{130}$/i, { message: "signature must be a valid EVM signature" })
  signature!: `0x${string}`;
}
