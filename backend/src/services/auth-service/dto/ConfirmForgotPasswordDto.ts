import { IsString, MinLength, Matches, IsEmail } from 'class-validator';
import { Transform } from 'class-transformer';

export class ConfirmForgotPasswordDto {
  @Transform(({ value }) => value?.trim().toLowerCase())
  @IsEmail({}, { message: 'The email is not valid' })
  email: string;

  @IsString({ message: 'The code must be a string' })
  code: string;

  @IsString({ message: 'The password must be a string' })
  @MinLength(8, { message: 'The password must contain at least 8 characters' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message: 'The password must contain at least one uppercase letter, one lowercase letter, and one number'
  })
  newPassword: string;
}