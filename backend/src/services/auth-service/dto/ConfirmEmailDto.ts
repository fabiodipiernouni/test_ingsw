import { IsEmail, IsString } from 'class-validator';

export class ConfirmEmailDto {
  @IsEmail({}, { message: 'Invalid email format' })
  email: string;

  @IsString({ message: 'The code must be a string' })
  code: string;
}