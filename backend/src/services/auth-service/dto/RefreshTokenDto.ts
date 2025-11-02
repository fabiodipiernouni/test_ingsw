import { IsString } from "class-validator";
import { Trim } from '@shared/decorators';

export class RefreshTokenDto {
  @Trim()
  @IsString({ message: 'The refresh token must be a string' })
  refreshToken: string;
}
