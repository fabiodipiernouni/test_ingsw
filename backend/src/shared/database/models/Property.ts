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
  HasMany
} from 'sequelize-typescript';
import { v4 as uuidv4 } from 'uuid';
import { User } from './User';
import { PropertyImage } from './PropertyImage';
import { PropertyFavorite } from './PropertyFavorite';
import { PropertyView } from './PropertyView';
import { GeoJSONPoint, createGeoJSONPoint } from '@shared/types/geojson.types';
import { EnergyClass, LISTING_TYPES, ListingType, PROPERTY_STATUS, PROPERTY_TYPES, PropertyStatus, PropertyType, ENERGY_CLASSES } from '@services/property-service/models/types';

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
  @Column({ type: DataType.ENUM(...PROPERTY_TYPES), field: 'property_type' })
  propertyType!: PropertyType;

  @AllowNull(false)
  @Column({ type: DataType.ENUM(...LISTING_TYPES), field: 'listing_type' })
  listingType!: ListingType;

  @AllowNull(false)
  @Default('active')
  @Column(DataType.ENUM(...PROPERTY_STATUS))
  status!: PropertyStatus;

  @AllowNull(false)
  @Column(DataType.INTEGER)
  rooms!: number;

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
  @Column({ type: DataType.ENUM(...ENERGY_CLASSES), field: 'energy_class' })
  energyClass?: EnergyClass;

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

  // GeoJSON location field per query geospaziali con Oracle Spatial
  // Formato: {"type":"Point","coordinates":[longitude,latitude]}
  @AllowNull(false)
  @Column({ 
    type: DataType.STRING(4000),
    field: 'geo_location',
    // Getter: converte stringa JSON → oggetto JavaScript
    get() {
      const rawValue = this.getDataValue('location' as any);
      if (!rawValue) return null;
      
      if (typeof rawValue === 'string') {
        try {
          return JSON.parse(rawValue);
        } catch (e) {
          return null;
        }
      }
      return rawValue;
    },
    // Setter: converte oggetto → stringa JSON per Oracle
    set(value: GeoJSONPoint | { longitude: number; latitude: number } | null) {
      if (!value) {
        this.setDataValue('location' as any, null);
        return;
      }
      
      // Supporta sia formato GeoJSON che oggetto semplice
      if ('type' in value && value.type === 'Point') {
        // È già GeoJSON
        this.setDataValue('location' as any, JSON.stringify(value));
      } else if ('longitude' in value && 'latitude' in value) {
        // Converte da formato semplice a GeoJSON
        const geoJson = createGeoJSONPoint(value.longitude, value.latitude);
        this.setDataValue('location' as any, JSON.stringify(geoJson));
      }
    }
  })
  location!: GeoJSONPoint;

  // Agent reference
  @ForeignKey(() => User)
  @AllowNull(false)
  @Column({ type: DataType.UUID, field: 'agent_id' })
  agentId!: string;

  @BelongsTo(() => User)
  agent!: User;

  // Status and counters
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

  // Helper getters per accesso semplificato alle coordinate
  // Estraggono lat/lng dal formato GeoJSON
  get latitude(): number {
    return this.location?.coordinates?.[1] || 0;
  }

  get longitude(): number {
    return this.location?.coordinates?.[0] || 0;
  }

  // Helper method per settare coordinate facilmente
  setCoordinates(longitude: number, latitude: number): void {
    this.location = createGeoJSONPoint(longitude, latitude);
  }

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

  // JSON serialization
  toJSON(): any {
    const values = { ...this.get() };
    
    // Add computed fields
    values.address = this.address;
    values.primaryImage = this.primaryImage;
    
    return values;
  }
}
