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

  @AllowNull(false)
  @Column(DataType.TEXT)
  url!: string;

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
  @Column(DataType.STRING(100))
  filename?: string;

  @AllowNull(true)
  @Column({ type: DataType.STRING(50), field: 'mime_type' })
  mimeType?: string;

  @AllowNull(true)
  @Column({ type: DataType.INTEGER, field: 'file_size' })
  fileSize?: number;

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

  getImageVariants(): object {
    const baseUrl = this.url.replace(/\.[^/.]+$/, ''); // Remove file extension
    const extension = this.url.split('.').pop();
    
    return {
      original: this.url,
      thumbnail: `${baseUrl}_thumb.${extension}`,
      medium: `${baseUrl}_medium.${extension}`,
      large: `${baseUrl}_large.${extension}`
    };
  }

  // JSON serialization
  toJSON(): any {
    const values = { ...this.get() };
    values.variants = this.getImageVariants();
    return values;
  }
}
