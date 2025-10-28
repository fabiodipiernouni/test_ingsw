//TODO: non richiesto, decidere se tenere o rimuovere
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
import { NotificationType } from './Notification';

@Table({
  tableName: 'user_preferences',
  timestamps: true
})
export class UserPreferences extends Model {
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

  // Notification preferences
  @AllowNull(false)
  @Default(true)
  @Column(DataType.BOOLEAN)
  emailNotifications!: boolean;

  @AllowNull(false)
  @Default(false)
  @Column(DataType.BOOLEAN)
  pushNotifications!: boolean;

  @AllowNull(true)
  @Column(DataType.JSON)
  notificationTypes?: NotificationType[];

  // Search preferences
  @AllowNull(false)
  @Default(10)
  @Column(DataType.FLOAT)
  searchRadius!: number; // km

  @AllowNull(true)
  @Column(DataType.JSON)
  preferredLocations?: string[];

  // Communication preferences
  @AllowNull(false)
  @Default(true)
  @Column(DataType.BOOLEAN)
  marketing!: boolean;

  @AllowNull(false)
  @Default(true)
  @Column(DataType.BOOLEAN)
  weeklyDigest!: boolean;

  // Localization
  @AllowNull(false)
  @Default('it')
  @Column(DataType.ENUM('it', 'en'))
  language!: 'it' | 'en';

  @AllowNull(false)
  @Default('EUR')
  @Column(DataType.ENUM('EUR', 'USD'))
  currency!: 'EUR' | 'USD';

  @AllowNull(false)
  @Default('Europe/Rome')
  @Column(DataType.STRING(50))
  timezone!: string;

  // Privacy preferences
  @AllowNull(false)
  @Default(true)
  @Column(DataType.BOOLEAN)
  profileVisibility!: boolean;

  // Display preferences
  @AllowNull(false)
  @Default('list')
  @Column(DataType.ENUM('list', 'grid', 'map'))
  defaultViewMode!: 'list' | 'grid' | 'map';

  @AllowNull(false)
  @Default(20)
  @Column(DataType.INTEGER)
  itemsPerPage!: number;

  @AllowNull(false)
  @Default('relevance')
  @Column(DataType.ENUM('price_asc', 'price_desc', 'area_asc', 'area_desc', 'date_desc', 'relevance'))
  defaultSortBy!: 'price_asc' | 'price_desc' | 'area_asc' | 'area_desc' | 'date_desc' | 'relevance';

  // Agent preferences (only for agents)
  @AllowNull(true)
  @Column(DataType.BOOLEAN)
  autoAcceptOffers?: boolean;

  @AllowNull(true)
  @Column(DataType.INTEGER)
  maxPropertiesPerMonth?: number;

  @AllowNull(true)
  @Column(DataType.JSON)
  workingHours?: {
    monday?: { start: string; end: string; };
    tuesday?: { start: string; end: string; };
    wednesday?: { start: string; end: string; };
    thursday?: { start: string; end: string; };
    friday?: { start: string; end: string; };
    saturday?: { start: string; end: string; };
    sunday?: { start: string; end: string; };
  };

  // Instance methods
  isNotificationTypeEnabled(type: NotificationType): boolean {
    if (!this.notificationTypes) return true;
    return this.notificationTypes.includes(type);
  }

  addPreferredLocation(location: string): void {
    if (!this.preferredLocations) {
      this.preferredLocations = [];
    }
    if (!this.preferredLocations.includes(location)) {
      this.preferredLocations.push(location);
    }
  }

  removePreferredLocation(location: string): void {
    if (this.preferredLocations) {
      this.preferredLocations = this.preferredLocations.filter(loc => loc !== location);
    }
  }

  getLocalizedCurrency(): string {
    return this.currency === 'EUR' ? '€' : '$';
  }

  formatPrice(price: number): string {
    const locale = this.language === 'it' ? 'it-IT' : 'en-US';
    
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: this.currency
    }).format(price);
  }

  // Static methods
  static async getOrCreateForUser(userId: string): Promise<UserPreferences> {
    let preferences = await UserPreferences.findOne({ where: { userId } });
    
    if (!preferences) {
      preferences = await UserPreferences.create({
        userId,
        notificationTypes: [
          'new_property_match',
          'price_change',
          'property_status_change',
          'saved_search_results'
        ]
      });
    }

    return preferences;
  }

  // JSON serialization
  toJSON(): any {
    const values = { ...this.get() };
    values.currencySymbol = this.getLocalizedCurrency();
    return values;
  }
}
