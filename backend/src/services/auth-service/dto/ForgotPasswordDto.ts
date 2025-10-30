import { IsEmail } from "class-validator";
import { Transform } from 'class-transformer';

export class ForgotPasswordDto {
  @Transform(({ value }) => value?.trim().toLowerCase())
  @IsEmail({}, { message: 'The email is not valid' })
  email: string;
}