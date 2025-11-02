import { IsString, IsNotEmpty, MaxLength, MinLength } from 'class-validator';

export interface AddressInterface {
  street: string;
  city: string;
  province: string;
  zipCode: string;
  country: string;
}

export class Address implements AddressInterface {
  @IsString({ message: 'Street must be a string' })
  @IsNotEmpty({ message: 'Street is required and cannot be empty' })
  @MinLength(1, { message: 'Street must be at least 1 character long' })
  @MaxLength(200, { message: 'Street must not exceed 200 characters' })
  street: string;

  @IsString({ message: 'City must be a string' })
  @IsNotEmpty({ message: 'City is required and cannot be empty' })
  @MinLength(1, { message: 'City must be at least 1 character long' })
  @MaxLength(100, { message: 'City must not exceed 100 characters' })
  city: string;

  @IsString({ message: 'Province must be a string' })
  @IsNotEmpty({ message: 'Province is required and cannot be empty' })
  @MinLength(1, { message: 'Province must be at least 1 character long' })
  @MaxLength(100, { message: 'Province must not exceed 100 characters' })
  province: string;

  @IsString({ message: 'ZipCode must be a string' })
  @IsNotEmpty({ message: 'ZipCode is required and cannot be empty' })
  @MinLength(1, { message: 'ZipCode must be at least 1 character long' })
  @MaxLength(10, { message: 'ZipCode must not exceed 10 characters' })
  zipCode: string;

  @IsString({ message: 'Country must be a string' })
  @IsNotEmpty({ message: 'Country is required and cannot be empty' })
  @MinLength(1, { message: 'Country must be at least 1 character long' })
  @MaxLength(50, { message: 'Country must not exceed 50 characters' })
  country: string;
}