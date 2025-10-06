import { IsEmail } from 'class-validator';

export interface LoginDto {
  @IsEmail({}, { message: 'Email non valida' })
  email: string;

  password: string;
}