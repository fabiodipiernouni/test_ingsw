import { IsArray, ValidateNested, ArrayMinSize, ArrayMaxSize } from 'class-validator';
import { Type } from 'class-transformer';
import { PropertyImageMetadata } from './PropertyImageMetadata';
import { OnlyOnePrimary, UniqueOrders } from '@property/validators/PropertyImageValidators';

/**
 * Classe wrapper per validare un array di PropertyImageMetadata
 * Usa i decorator di class-validator per validare l'array e i suoi elementi
 */
export class PropertyImageMetadataArray {
  @IsArray({ message: 'metadata must be an array' })
  @ArrayMinSize(1, { message: 'At least one image metadata is required' })
  @ArrayMaxSize(10, { message: 'Maximum 10 image metadata items allowed' })
  @ValidateNested({ each: true })
  @Type(() => PropertyImageMetadata)
  @OnlyOnePrimary({ message: 'Only one image can be marked as primary' })
  @UniqueOrders({ message: 'Each image must have a unique order value' })
  metadata!: PropertyImageMetadata[];
}

