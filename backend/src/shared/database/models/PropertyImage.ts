import {
  Table,
  Column,
  Model,
  DataType,
  PrimaryKey,
  Default,
  AllowNull,
  ForeignKey,
  BelongsTo,
  Index
} from 'sequelize-typescript';
import { v4 as uuidv4 } from 'uuid';
import { Property } from './Property';

export interface ImageVariants {
  small: string;
  medium: string;
  large: string;
}

@Table({
  tableName: 'property_images',
  timestamps: true
})
export class PropertyImage extends Model {
  @PrimaryKey
  @Default(() => uuidv4())
  @Column(DataType.UUID)
  id!: string;

  @ForeignKey(() => Property)
  @AllowNull(false)
  @Column({ type: DataType.UUID, field: 'property_id' })
  propertyId!: string;

  @BelongsTo(() => Property)
  property!: Property;

  // S3 Keys for different image sizes
  @AllowNull(false)
  @Column({ type: DataType.STRING(500), field: 's3_key_original' })
  s3KeyOriginal!: string;

  @AllowNull(true)
  @Column({ type: DataType.STRING(500), field: 's3_key_small' })
  s3KeySmall?: string;

  @AllowNull(true)
  @Column({ type: DataType.STRING(500), field: 's3_key_medium' })
  s3KeyMedium?: string;

  @AllowNull(true)
  @Column({ type: DataType.STRING(500), field: 's3_key_large' })
  s3KeyLarge?: string;

  // S3 Bucket information
  @AllowNull(false)
  @Column({ type: DataType.STRING(255), field: 'bucket_name' })
  bucketName!: string;

  // File metadata
  @AllowNull(false)
  @Column({ type: DataType.STRING(255), field: 'file_name' })
  fileName!: string;

  @AllowNull(false)
  @Column({ type: DataType.STRING(100), field: 'content_type' })
  contentType!: string;

  @AllowNull(false)
  @Column({ type: DataType.DOUBLE, field: 'file_size' })
  fileSize!: number;

  @AllowNull(false)
  @Column({ type: DataType.DATE, field: 'upload_date' })
  uploadDate!: Date;

  // Display and organization
  @AllowNull(true)
  @Column(DataType.STRING(500))
  caption?: string;

  @AllowNull(true)
  @Column(DataType.STRING(255))
  alt?: string;

  @AllowNull(false)
  @Default(false)
  @Column({ type: DataType.BOOLEAN, field: 'is_primary' })
  isPrimary!: boolean;

  @AllowNull(false)
  @Default(0)
  @Column(DataType.INTEGER)
  order!: number;

  @AllowNull(true)
  @Column(DataType.INTEGER)
  width?: number;

  @AllowNull(true)
  @Column(DataType.INTEGER)
  height?: number;

  // Instance methods
  async setPrimary(): Promise<void> {
    // Remove primary flag from other images of the same property
    await PropertyImage.update(
      { isPrimary: false },
      { where: { propertyId: this.propertyId } }
    );
    
    // Set this image as primary
    this.isPrimary = true;
    await this.save();
  }

  getImageVariants(): ImageVariants {
    // Return S3 keys for different sizes with fallback to original
    // Note: original is kept internally for backup, not exposed to clients
    return {
      small: this.s3KeySmall || this.s3KeyOriginal,
      medium: this.s3KeyMedium || this.s3KeyOriginal,
      large: this.s3KeyLarge || this.s3KeyOriginal
    };
  }

  // JSON serialization
  toJSON(): any {
    const values = { ...this.get() };
    values.variants = this.getImageVariants();
    return values;
  }
}
