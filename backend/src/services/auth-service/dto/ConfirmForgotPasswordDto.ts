import { IsString, MinLength, Matches, IsEmail } from 'class-validator';
import { Transform } from 'class-transformer';
import { ToLowerCase, Trim } from '@shared/decorators';

export class ConfirmForgotPasswordDto {
  @Trim()
  @ToLowerCase()
  @IsEmail({}, { message: 'The email is not valid' })
  email: string;

  @Trim()
  @IsString({ message: 'The code must be a string' })
  code: string;

  @Trim()
  @IsString({ message: 'The password must be a string' })
  @MinLength(8, { message: 'The password must contain at least 8 characters' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message: 'The password must contain at least one uppercase letter, one lowercase letter, and one number'
  })
  newPassword: string;
}