import { IsString, MinLength, MaxLength } from 'class-validator';

export class UpdateSavedSearchNameDto {
  @IsString()
  @MinLength(1, { message: 'Il nome deve contenere almeno 1 carattere' })
  @MaxLength(200, { message: 'Il nome non può superare i 200 caratteri' })
  name: string;
}
