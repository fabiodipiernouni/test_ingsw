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
  HasMany,
  Index
} from 'sequelize-typescript';
import { v4 as uuidv4 } from 'uuid';
import { User } from './User';
import { PropertyImage } from './PropertyImage';
import { PropertyFavorite } from './PropertyFavorite';
import { PropertyView } from './PropertyView';

@Table({
  tableName: 'properties',
  timestamps: true,
  indexes: [
    {
      name: 'idx_properties_price',
      fields: ['price']
    },
    {
      name: 'idx_properties_type',
      fields: ['property_type']
    },
    {
      name: 'idx_properties_city',
      fields: ['city']
    }
  ]
})
export class Property extends Model {
  @PrimaryKey
  @Default(() => uuidv4())
  @Column(DataType.UUID)
  id!: string;

  @AllowNull(false)
  @Column(DataType.STRING(200))
  title!: string;

  @AllowNull(false)
  @Column(DataType.STRING(4000))
  description!: string;

  @AllowNull(false)
  @Column(DataType.DECIMAL(10, 2))
  price!: number;

  @AllowNull(false)
  @Column({ type: DataType.ENUM('apartment', 'villa', 'house', 'loft', 'office', 'commercial', 'land'), field: 'property_type' })
  propertyType!: 'apartment' | 'villa' | 'house' | 'loft' | 'office' | 'commercial' | 'land';

  @AllowNull(false)

  @Column({ type: DataType.ENUM('sale', 'rent'), field: 'listing_type' })
  listingType!: 'sale' | 'rent';

  @AllowNull(false)
  @Default('active')

  @Column(DataType.ENUM('active', 'pending', 'sold', 'rented', 'withdrawn'))
  status!: 'active' | 'pending' | 'sold' | 'rented' | 'withdrawn';

  @AllowNull(false)

  @Column(DataType.INTEGER)
  bedrooms!: number;

  @AllowNull(false)

  @Column(DataType.INTEGER)
  bathrooms!: number;

  @AllowNull(false)

  @Column(DataType.DECIMAL(8, 2))
  area!: number;

  @AllowNull(true)
  @Column(DataType.STRING(50))
  floor?: string;

  @AllowNull(true)

  @Column({ type: DataType.ENUM('A+', 'A', 'B', 'C', 'D', 'E', 'F', 'G'), field: 'energy_class' })
  energyClass?: 'A+' | 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G';

  @AllowNull(false)
  @Default(false)

  @Column({ type: DataType.BOOLEAN, field: 'has_elevator' })
  hasElevator!: boolean;

  @AllowNull(false)
  @Default(false)

  @Column({ type: DataType.BOOLEAN, field: 'has_balcony' })
  hasBalcony!: boolean;

  @AllowNull(false)
  @Default(false)

  @Column({ type: DataType.BOOLEAN, field: 'has_garden' })
  hasGarden!: boolean;

  @AllowNull(false)
  @Default(false)

  @Column({ type: DataType.BOOLEAN, field: 'has_parking' })
  hasParking!: boolean;

  @AllowNull(true)
  @Column(DataType.JSON)
  features?: string[];

  // Address fields
  @AllowNull(false)
  @Column(DataType.STRING(200))
  street!: string;

  @AllowNull(false)
  @Column(DataType.STRING(100))
  city!: string;

  @AllowNull(false)

  @Column(DataType.STRING(100))
  province!: string;

  @AllowNull(false)

  @Column({ type: DataType.STRING(10), field: 'zip_code' })
  zipCode!: string;

  @AllowNull(false)
  @Default('Italy')
  @Column(DataType.STRING(50))
  country!: string;

  // Location fields for geospatial queries
  @AllowNull(false)

  @Column(DataType.DECIMAL(10, 8))
  latitude!: number;

  @AllowNull(false)

  @Column(DataType.DECIMAL(11, 8))
  longitude!: number;

  // Agent reference
  @ForeignKey(() => User)
  @AllowNull(false)

  @Column({ type: DataType.UUID, field: 'agent_id' })
  agentId!: string;

  @BelongsTo(() => User)
  agent!: User;

  // Status and counters
  @AllowNull(false)
  @Default(true)

  @Column({ type: DataType.BOOLEAN, field: 'is_active' })
  isActive!: boolean;

  @AllowNull(false)
  @Default(0)
  @Column(DataType.INTEGER)
  views!: number;

  @AllowNull(false)
  @Default(0)
  @Column(DataType.INTEGER)
  favorites!: number;

  // Associations
  @HasMany(() => PropertyImage)
  images!: PropertyImage[];

  @HasMany(() => PropertyFavorite)
  propertyFavorites!: PropertyFavorite[];

  @HasMany(() => PropertyView)
  propertyViews!: PropertyView[];

  // Computed properties
  get address(): object {
    return {
      street: this.street,
      city: this.city,
      province: this.province,
      zipCode: this.zipCode,
      country: this.country
    };
  }

  get location(): object {
    return {
      latitude: this.latitude,
      longitude: this.longitude
    };
  }

  get primaryImage(): PropertyImage | undefined {
    return this.images?.find(img => img.isPrimary) || this.images?.[0];
  }

  // Instance methods
  async incrementViews(): Promise<void> {
    await this.increment('views');
  }

  async incrementFavorites(): Promise<void> {
    await this.increment('favorites');
  }

  async decrementFavorites(): Promise<void> {
    if (this.favorites > 0) {
      await this.decrement('favorites');
    }
  }

  isAvailable(): boolean {
    return this.isActive && this.status === 'active';
  }

  // JSON serialization
  toJSON(): any {
    const values = { ...this.get() };
    
    // Add computed fields
    values.address = this.address;
    values.location = this.location;
    values.primaryImage = this.primaryImage;
    
    return values;
  }
}
