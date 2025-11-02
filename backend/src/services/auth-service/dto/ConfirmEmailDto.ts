import { IsEmail, IsString } from 'class-validator';
import { Trim, ToLowerCase } from '@shared/decorators';

export class ConfirmEmailDto {
  @Trim()
  @ToLowerCase()
  @IsEmail({}, { message: 'Invalid email format' })
  email: string;

  @Trim()
  @IsString({ message: 'The code must be a string' })
  code: string;
}