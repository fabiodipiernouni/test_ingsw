import { IsEmail, IsString } from 'class-validator';
import { Transform } from 'class-transformer';

export class ConfirmEmailDto {
  @Transform(({ value }) => value?.trim().toLowerCase())
  @IsEmail({}, { message: 'Invalid email format' })
  email: string;

  @IsString({ message: 'The code must be a string' })
  code: string;
}