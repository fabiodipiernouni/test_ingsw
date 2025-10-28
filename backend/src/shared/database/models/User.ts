import {
  Table,
  Column,
  Model,
  DataType,
  PrimaryKey,
  Default,
  AllowNull,
  Unique,
  HasMany,
  ForeignKey,
  BelongsTo
} from 'sequelize-typescript';
import { v4 as uuidv4 } from 'uuid';
import { Agency } from './Agency';
import { Property } from './Property';
import { SavedSearch } from './SavedSearch';
import { Notification } from './Notification';
import { NotificationPreferences } from './NotificationPreferences';
import { UserPreferences } from './UserPreferences';
import { PropertyFavorite } from './PropertyFavorite';
import { PropertyView } from './PropertyView';
import { OAuthProvider } from '@auth/models/OAuthProvider';

@Table({
  tableName: 'users',
  timestamps: true
})
export class User extends Model {
  @PrimaryKey
  @Default(() => uuidv4())
  @Column(DataType.UUID)
  id!: string;

  @AllowNull(false)
  @Unique
  @Column(DataType.STRING(255))
  email!: string;

  // Cognito Integration - NUOVO
  @AllowNull(false)
  @Unique
  @Column(DataType.STRING(255))
  cognitoSub!: string;

  @AllowNull(false)
  @Column(DataType.STRING(255))
  cognitoUsername!: string;

  @AllowNull(false)
  @Column(DataType.STRING(100))
  firstName!: string;

  @AllowNull(false)
  @Column(DataType.STRING(100))
  lastName!: string;

  @AllowNull(false)
  @Default('client')
  @Column(DataType.ENUM('client', 'agent', 'admin', 'owner'))
  role!: 'client' | 'agent' | 'admin' | 'owner';

  @AllowNull(true)
  @Column(DataType.STRING(2000))
  avatar?: string;

  @AllowNull(true)
  @Column(DataType.STRING(20))
  phone?: string;

  @AllowNull(false)
  @Default(false)
  @Column(DataType.BOOLEAN)
  isVerified!: boolean;

  @AllowNull(false)
  @Default(false)
  @Column(DataType.BOOLEAN)
  passwordChangeRequired!: boolean;

  @AllowNull(false)
  @Default(true)
  @Column(DataType.BOOLEAN)
  isActive!: boolean;

  @AllowNull(true)
  @Column(DataType.JSON)
  linkedProviders?: Array<OAuthProvider>;

  @AllowNull(true)
  @Column(DataType.DATE)
  lastLoginAt?: Date;

  // Legal acceptance timestamps
  @AllowNull(false)
  @Column(DataType.DATE)
  acceptedTermsAt!: Date;

  @AllowNull(false)
  @Column(DataType.DATE)
  acceptedPrivacyAt!: Date;

  // Agency association
  @AllowNull(true)
  @ForeignKey(() => Agency)
  @Column(DataType.UUID)
  agencyId?: string;

  // Agent-specific fields
  @AllowNull(true)
  @Column(DataType.STRING(50))
  licenseNumber?: string;

  @AllowNull(true)
  @Column(DataType.STRING(4000))
  biography?: string;

  @AllowNull(true)
  @Column(DataType.FLOAT)
  rating?: number;

  @AllowNull(false)
  @Default(0)
  @Column(DataType.INTEGER)
  reviewsCount!: number;

  @AllowNull(true)
  @Column(DataType.JSON)
  specializations?: string[];

  // Associations
  @BelongsTo(() => Agency, { foreignKey: 'agencyId', as: 'agency' })
  agency?: Agency;

  @HasMany(() => Property)
  properties!: Property[];

  @HasMany(() => SavedSearch)
  savedSearches!: SavedSearch[];

  @HasMany(() => Notification)
  notifications!: Notification[];

  @HasMany(() => NotificationPreferences)
  notificationPreferences!: NotificationPreferences[];

  @HasMany(() => UserPreferences)
  userPreferences!: UserPreferences[];

  @HasMany(() => PropertyFavorite)
  favorites!: PropertyFavorite[];

  @HasMany(() => PropertyView)
  views!: PropertyView[];

  // Instance methods
  get fullName(): string {
    return `${this.firstName} ${this.lastName}`;
  }

  // JSON serialization (rimuove dati sensibili se presenti)
  toJSON(): any {
    const values = { ...this.get() };
    return values;
  }
}
