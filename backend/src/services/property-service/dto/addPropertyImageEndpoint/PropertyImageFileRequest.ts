import { PropertyImageMetadata } from '@property/dto/addPropertyImageEndpoint/PropertyImageMetadata';
import { IsDefined, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export interface PropertyImageFileRequestInterface {
  file: Express.Multer.File;
  metadata: PropertyImageMetadata;
}

export class PropertyImageFileRequest implements PropertyImageFileRequestInterface {
  @IsDefined({ message: 'File must be defined' })
  file: Express.Multer.File;

  @IsDefined({ message: 'Metadata must be defined' })
  @ValidateNested()
  @Type(() => PropertyImageMetadata)
  metadata: PropertyImageMetadata;

  constructor(file: Express.Multer.File, metadata: PropertyImageMetadata) {
    this.file = file;
    this.metadata = metadata;
  }
}