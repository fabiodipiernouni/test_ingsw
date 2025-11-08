import { ArrayMaxSize, ArrayMinSize, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { OnlyOnePrimary, UniqueOrders } from '@property/validators/PropertyImageValidators';
import { PropertyImageFileRequest } from '@property/dto/addPropertyImageEndpoint/PropertyImageFileRequest';

/**
 * Request tipizzata per l'upload di immagini di una proprietà
 * Quando si usa upload.array(), req.files è sempre Express.Multer.File[]
 */
export interface AddPropertyImageRequestInterface {
  propertyImages: PropertyImageFileRequest[];
}

export class AddPropertyImageRequest implements AddPropertyImageRequestInterface {
  @IsArray({ message: 'propertyImages must be an array' })
  @ArrayMinSize(1, { message: 'At least one property image is required' })
  @ArrayMaxSize(10, { message: 'Maximum 10 property images allowed' })
  @ValidateNested({ each: true })
  @Type(() => PropertyImageFileRequest)
  @OnlyOnePrimary({ message: 'Only one image can be marked as primary' })
  @UniqueOrders({ message: 'Each image must have a unique order value' })
  propertyImages: PropertyImageFileRequest[];
}