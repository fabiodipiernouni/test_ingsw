import { IsEmail } from 'class-validator';

export class ResendVerificationCodeDto {
  @IsEmail({}, { message: 'The email is not valid' })
  email: string;
}