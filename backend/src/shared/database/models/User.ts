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
  BelongsTo,
  BeforeCreate,
  BeforeUpdate
} from 'sequelize-typescript';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcrypt';
import { Agency } from './Agency';
import { Property } from './Property';
import { SearchHistory } from './SearchHistory';
import { SavedSearch } from './SavedSearch';
import { Notification } from './Notification';
import { NotificationPreferences } from './NotificationPreferences';
import { UserPreferences } from './UserPreferences';
import { PropertyFavorite } from './PropertyFavorite';
import { PropertyView } from './PropertyView';

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

  @AllowNull(true)
  @Column(DataType.STRING(255))
  password?: string;

  @AllowNull(false)
  @Column(DataType.STRING(100))
  firstName!: string;

  @AllowNull(false)
  @Column(DataType.STRING(100))
  lastName!: string;

  @AllowNull(false)
  @Default('client')
  @Column(DataType.ENUM('client', 'agent', 'admin'))
  role!: 'client' | 'agent' | 'admin';

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
  @Default(true)
  @Column(DataType.BOOLEAN)
  isActive!: boolean;

  @AllowNull(true)
  @Column(DataType.JSON)
  linkedProviders?: Array<'google' | 'github'>;

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

  // Password management
  @AllowNull(false)
  @Default(false)
  @Column(DataType.BOOLEAN)
  shouldChangePassword!: boolean;

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

  // Authentication tokens
  @AllowNull(true)
  @Column(DataType.STRING(2000))
  refreshToken?: string;

  @AllowNull(true)
  @Column(DataType.STRING(255))
  emailVerificationToken?: string;

  @AllowNull(true)
  @Column(DataType.DATE)
  emailVerificationExpires?: Date;

  @AllowNull(true)
  @Column(DataType.STRING(255))
  passwordResetToken?: string;

  @AllowNull(true)
  @Column(DataType.DATE)
  passwordResetExpires?: Date;

  // Associations
  @BelongsTo(() => Agency, { foreignKey: 'agencyId', as: 'agency' })
  agency?: Agency;

  @HasMany(() => Property)
  properties!: Property[];

  @HasMany(() => SearchHistory)
  searchHistories!: SearchHistory[];

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
  async comparePassword(password: string): Promise<boolean> {
    if (!this.password) return false;
    return await bcrypt.compare(password, this.password);
  }

  async hashPassword(password: string): Promise<string> {
    const saltRounds = 12;
    return await bcrypt.hash(password, saltRounds);
  }

  get fullName(): string {
    return `${this.firstName} ${this.lastName}`;
  }

  // Hooks
  @BeforeCreate
  @BeforeUpdate
  static async hashPasswordHook(instance: User) {
    if (instance.changed('password') && instance.password) {
      const saltRounds = 12;
      instance.password = await bcrypt.hash(instance.password, saltRounds);
    }
  }

  // JSON serialization
  toJSON(): any {
    const values = { ...this.get() };
    delete values.password;
    delete values.refreshToken;
    delete values.emailVerificationToken;
    delete values.passwordResetToken;
    return values;
  }
}
