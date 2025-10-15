import { IsEmail } from "class-validator";

export class ForgotPasswordDto {
  @IsEmail({}, { message: 'The email is not valid' })
  email: string;
}