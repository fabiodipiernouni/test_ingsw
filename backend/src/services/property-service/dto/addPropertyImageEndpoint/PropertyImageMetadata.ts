import { IsBoolean, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { Type } from 'class-transformer';

// PropertyImageInput.ts
export interface PropertyImageMetadataInterface {
  isPrimary: boolean;
  order: number;
  caption?: string;
  altText?: string;
}

// nell'implementazione ci sono i controlli di validazione di 'class-validator' / 'class-transformer';

export class PropertyImageMetadata implements PropertyImageMetadataInterface {
  @IsBoolean({ message: 'isPrimary must be a boolean' })
  isPrimary: boolean;

  @Type(() => Number)
  @IsInt({ message: 'order must be an integer' })
  @Min(0, { message: 'order must be at least 0' })
  @Max(99, { message: 'order must not exceed 99' })
  order: number;

  @IsOptional()
  @IsString({ message: 'caption must be a string' })
  @MaxLength(500, { message: 'caption must not exceed 500 characters' })
  caption?: string;

  @IsOptional()
  @IsString({ message: 'altText must be a string' })
  @MaxLength(255, { message: 'altText must not exceed 255 characters' })
  altText?: string;

  constructor(
    isPrimary: boolean,
    order: number,
    caption?: string,
    altText?: string
  ) {
    this.isPrimary = isPrimary;
    this.order = order;
    this.caption = caption;
    this.altText = altText;
  }
}
