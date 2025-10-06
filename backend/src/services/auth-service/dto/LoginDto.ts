import { IsEmail } from 'class-validator';

export class LoginDto {
  @IsEmail({}, { message: 'Email non valida' })
  email: string;

  password: string;
}