import { IsEmail } from "class-validator";
import { Trim, ToLowerCase } from "@shared/decorators";

export class ForgotPasswordDto {
  @Trim()
  @ToLowerCase()
  @IsEmail({}, { message: 'The email is not valid' })
  email: string;
}