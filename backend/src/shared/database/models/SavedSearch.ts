import {
  Table,
  Column,
  Model,
  DataType,
  PrimaryKey,
  Default,
  AllowNull,
  ForeignKey,
  BelongsTo
} from 'sequelize-typescript';
import { v4 as uuidv4 } from 'uuid';
import { User } from './User';
import { ListingType, PropertyType, PropertyStatus, PROPERTY_TYPES, LISTING_TYPES, PROPERTY_STATUS } from '@shared/types/property.types';
import { GeoJSONPoint } from '@shared/types/geojson.types';
import { SavedSearchFilters } from '@services/search-service/dto/SavedSearchFilters';
import { SearchPropertiesFilters } from '@services/property-service/dto/SearchPropertiesFilters';
import { GeoSearchPropertiesFilters } from '@services/property-service/dto/GeoSearchPropertiesFilters';

@Table({
  tableName: 'saved_searches',
  timestamps: true
})
export class SavedSearch extends Model {
  @PrimaryKey
  @Default(() => uuidv4())
  @Column(DataType.UUID)
  id!: string;

  @ForeignKey(() => User)
  @AllowNull(false)
  @Column({ type: DataType.UUID, field: 'user_id' })
  userId!: string;

  @BelongsTo(() => User)
  user!: User;

  @AllowNull(false)
  @Column(DataType.STRING(200))
  name!: string;

  // Search Filters - Basic
  @AllowNull(true)
  @Column(DataType.STRING(100))
  location?: string;

  @AllowNull(true)
  @Column(DataType.ENUM(...PROPERTY_TYPES))
  propertyType?: PropertyType;

  @AllowNull(true)
  @Column(DataType.ENUM(...LISTING_TYPES))
  listingType?: ListingType;

  @AllowNull(true)
  @Column(DataType.ENUM(...PROPERTY_STATUS))
  status?: PropertyStatus;

  @AllowNull(true)
  @Column({ type: DataType.UUID, field: 'agency_id' })
  agencyId?: string;

  // Price filters
  @AllowNull(true)
  @Column({ type: DataType.DECIMAL(10, 2), field: 'price_min' })
  priceMin?: number;

  @AllowNull(true)
  @Column({ type: DataType.DECIMAL(10, 2), field: 'price_max' })
  priceMax?: number;

  // Room filters
  @AllowNull(true)
  @Column(DataType.INTEGER)
  rooms?: number;

  @AllowNull(true)
  @Column(DataType.INTEGER)
  bedrooms?: number;

  @AllowNull(true)
  @Column(DataType.INTEGER)
  bathrooms?: number;

  // Property features
  @AllowNull(true)
  @Column({ type: DataType.BOOLEAN, field: 'has_elevator' })
  hasElevator?: boolean;

  @AllowNull(true)
  @Column({ type: DataType.BOOLEAN, field: 'has_balcony' })
  hasBalcony?: boolean;

  @AllowNull(true)
  @Column({ type: DataType.BOOLEAN, field: 'has_garden' })
  hasGarden?: boolean;

  @AllowNull(true)
  @Column({ type: DataType.BOOLEAN, field: 'has_parking' })
  hasParking?: boolean;

  // Geo filters - Polygon (stored as JSON array of GeoJSON points)
  @AllowNull(true)
  @Column(DataType.JSON)
  polygon?: GeoJSONPoint[];

  // Geo filters - Radius search
  @AllowNull(true)
  @Column({ type: DataType.JSON, field: 'radius_search_center' })
  radiusSearchCenter?: GeoJSONPoint;

  @AllowNull(true)
  @Column({ type: DataType.DECIMAL(8, 2), field: 'radius_search_radius' })
  radiusSearchRadius?: number;

  // Sorting
  @AllowNull(false)
  @Default('createdAt')
  @Column({ type: DataType.STRING(50), field: 'sort_by' })
  sortBy!: string;

  @AllowNull(false)
  @Default('DESC')
  @Column(DataType.ENUM('ASC', 'DESC'))
  sortOrder!: 'ASC' | 'DESC';

  // Notification settings
  @AllowNull(false)
  @Default(false)
  @Column({ type: DataType.BOOLEAN, field: 'is_notification_enabled' })
  isNotificationEnabled!: boolean;

  // Last searched date
  @AllowNull(true)
  @Column({ type: DataType.DATE, field: 'last_searched_at' })
  lastSearchedAt?: Date;

  // Instance methods
  
  /**
   * Converte i filtri in un oggetto strutturato per il frontend
   */
  getFiltersObject(): SavedSearchFilters {
    // Costruisce l'oggetto filters solo con i campi non-null
    const basicFilters: SearchPropertiesFilters = {};
    if (this.location !== null && this.location !== undefined) basicFilters.location = this.location;
    if (this.propertyType !== null && this.propertyType !== undefined) basicFilters.propertyType = this.propertyType;
    if (this.listingType !== null && this.listingType !== undefined) basicFilters.listingType = this.listingType;
    if (this.priceMin !== null && this.priceMin !== undefined) basicFilters.priceMin = this.priceMin;
    if (this.priceMax !== null && this.priceMax !== undefined) basicFilters.priceMax = this.priceMax;
    if (this.rooms !== null && this.rooms !== undefined) basicFilters.rooms = this.rooms;
    if (this.bedrooms !== null && this.bedrooms !== undefined) basicFilters.bedrooms = this.bedrooms;
    if (this.bathrooms !== null && this.bathrooms !== undefined) basicFilters.bathrooms = this.bathrooms;
    if (this.hasElevator !== null && this.hasElevator !== undefined) basicFilters.hasElevator = this.hasElevator;
    if (this.hasBalcony !== null && this.hasBalcony !== undefined) basicFilters.hasBalcony = this.hasBalcony;
    if (this.hasGarden !== null && this.hasGarden !== undefined) basicFilters.hasGarden = this.hasGarden;
    if (this.hasParking !== null && this.hasParking !== undefined) basicFilters.hasParking = this.hasParking;

    // Costruisce l'oggetto geoFilters solo con i campi non-null
    const geoFilters: GeoSearchPropertiesFilters = {};
    if (this.polygon !== null && this.polygon !== undefined) geoFilters.polygon = this.polygon;
    if (this.radiusSearchCenter && this.radiusSearchRadius) {
      geoFilters.radiusSearch = {
        center: this.radiusSearchCenter,
        radius: this.radiusSearchRadius
      };
    }

    // Costruisce l'oggetto finale
    const filters: SavedSearchFilters = {
      sortBy: this.sortBy,
      sortOrder: this.sortOrder
    };

    // Aggiungi filters solo se ha almeno un campo
    if (Object.keys(basicFilters).length > 0) {
      filters.filters = basicFilters;
    }

    // Aggiungi geoFilters solo se ha almeno un campo
    if (Object.keys(geoFilters).length > 0) {
      filters.geoFilters = geoFilters;
    }

    // Aggiungi status e agencyId solo se presenti
    if (this.status !== null && this.status !== undefined) filters.status = this.status;
    if (this.agencyId !== null && this.agencyId !== undefined) filters.agencyId = this.agencyId;

    return filters;
  }

  // Static methods
  static async getUserSavedSearches(userId: string): Promise<SavedSearch[]> {
    return await SavedSearch.findAll({
      where: {
        userId
      },
      order: [['createdAt', 'DESC']]
    });
  }

}
