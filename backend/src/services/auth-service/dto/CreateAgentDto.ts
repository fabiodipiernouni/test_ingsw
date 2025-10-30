import { IsEmail, IsString, MinLength, MaxLength, IsOptional, Matches } from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateAgentDto {
  @Transform(({ value }) => value?.trim().toLowerCase())
  @IsEmail({}, { message: 'Email is invalid' })
  email: string;

  @IsString({ message: 'First name must be a string' })
  @MinLength(2, { message: 'First name must be at least 2 characters long' })
  @MaxLength(50, { message: 'First name cannot exceed 50 characters' })
  firstName: string;

  @IsString({ message: 'Last name must be a string' })
  @MinLength(2, { message: 'Last name must be at least 2 characters long' })
  @MaxLength(50, { message: 'Last name cannot exceed 50 characters' })
  lastName: string;

  @IsOptional()
  @IsString({ message: 'Phone number must be a string' })
  @Matches(/^\+\d{1,15}$/, { 
    message: 'Phone number must be in E.164 format (e.g., +391234567890)' 
  })
  phone?: string;

  @IsString({ message: 'License number must be a string' })
  @MinLength(3, { message: 'License number must be at least 3 characters long' })
  @MaxLength(50, { message: 'License number cannot exceed 50 characters' })
  licenseNumber: string;

  @IsOptional()
  @IsString({ message: 'Biography must be a string' })
  @MaxLength(1000, { message: 'Biography cannot exceed 1000 characters' })
  biography?: string;

  @IsOptional()
  specializations?: string[];
}
