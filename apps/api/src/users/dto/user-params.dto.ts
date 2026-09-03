import { IsEthereumAddress } from "class-validator";

export class UserParamsDto {
  @IsEthereumAddress()
  address!: string;
}
