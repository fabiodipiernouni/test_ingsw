import { IsString, MinLength, Matches } from 'class-validator';
import { Trim } from '@shared/decorators';

export class ChangePasswordDto {
  @Trim()
  @IsString({ message: 'Current password must be a string' })
  currentPassword: string;

  @Trim()
  @IsString({ message: 'New password must be a string' })
  @MinLength(8, { message: 'New password must contain at least 8 characters' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/, {
    message: 'New password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
  })
  newPassword: string;
}