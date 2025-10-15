import { IsString } from "class-validator";

export class RefreshTokenDto {
  @IsString({ message: 'The refresh token must be a string' })
  refreshToken: string;
}
