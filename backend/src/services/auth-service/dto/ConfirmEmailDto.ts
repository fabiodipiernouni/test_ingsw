import { IsString } from 'class-validator';

export class ConfirmEmailDto {
  @IsString({ message: 'The code must be a string' })
  code: string;
}