import { IsOptional, IsString, Matches, MaxLength } from "class-validator";

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MaxLength(32)
  displayName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2048)
  @Matches(/^(?:https:\/\/[^\s]+)?$/)
  avatarUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  avatarSeed?: string;
}
