import { IsEmail, IsString } from 'class-validator';
import { Trim, ToLowerCase } from '@shared/decorators';

export class LoginDto {
  @Trim()
  @ToLowerCase()
  @IsEmail({}, { message: 'Email non valida' })
  email: string;

  @Trim()
  @IsString({ message: 'La password deve essere una stringa' })
  password: string;
}