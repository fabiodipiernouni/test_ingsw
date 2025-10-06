import { IsEmail, IsString, MinLength, IsBoolean, IsOptional, Matches, MaxLength } from 'class-validator';

export class RegisterDto {
  @IsEmail({}, { message: 'Email non valida' })
  email: string;

  @IsString({ message: 'La password deve essere una stringa' })
  @MinLength(8, { message: 'La password deve contenere almeno 8 caratteri' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message: 'La password deve contenere almeno una lettera maiuscola, una minuscola e un numero'
  })
  password: string;

  @IsString({ message: 'Il nome deve essere una stringa' })
  @MinLength(2, { message: 'Il nome deve contenere almeno 2 caratteri' })
  @MaxLength(50, { message: 'Il nome non può superare 50 caratteri' })
  firstName: string;

  @IsString({ message: 'Il cognome deve essere una stringa' })
  @MinLength(2, { message: 'Il cognome deve contenere almeno 2 caratteri' })
  @MaxLength(50, { message: 'Il cognome non può superare 50 caratteri' })
  lastName: string;

  @IsBoolean({ message: 'Devi accettare i termini e condizioni' })
  acceptTerms: boolean;

  @IsBoolean({ message: 'Devi accettare la privacy policy' })
  acceptPrivacy: boolean;

  @IsOptional()
  @IsString({ message: 'Il numero di telefono deve essere una stringa' })
  @Matches(/^[\d\s\+\-\(\)]+$/, { message: 'Formato numero di telefono non valido' })
  phone?: string;
}