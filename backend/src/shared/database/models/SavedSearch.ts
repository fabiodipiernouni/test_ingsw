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
import { User } from './User';

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
  @Column(DataType.STRING(100))
  name!: string;

  @AllowNull(false)
  @Column(DataType.JSON)
  filters!: object;

  @AllowNull(false)
  @Default(true)
  @Column(DataType.BOOLEAN)
  isNotificationEnabled!: boolean;

  @AllowNull(false)
  @Default(0)
  @Column(DataType.INTEGER)
  lastResultCount!: number;

  @AllowNull(false)
  @Default(false)
  @Column(DataType.BOOLEAN)
  hasNewResults!: boolean;

  @AllowNull(true)
  @Column(DataType.DATE)
  lastCheckedAt?: Date;

  @AllowNull(true)
  @Column(DataType.DATE)
  lastNotificationSentAt?: Date;

  @AllowNull(false)
  @Default(true)

  @Column(DataType.BOOLEAN)
  isActive!: boolean;

  // Notification frequency: immediate, daily, weekly
  @AllowNull(false)
  @Default('immediate')
  @Column(DataType.ENUM('immediate', 'daily', 'weekly'))
  notificationFrequency!: 'immediate' | 'daily' | 'weekly';

  // Instance methods
  getFiltersString(): string {
    return JSON.stringify(this.filters);
  }

  async updateResultCount(newCount: number): Promise<void> {
    const previousCount = this.lastResultCount;
    this.lastResultCount = newCount;
    this.hasNewResults = newCount > previousCount;
    this.lastCheckedAt = new Date();
    await this.save();
  }

  shouldSendNotification(): boolean {
    if (!this.isNotificationEnabled || !this.hasNewResults) {
      return false;
    }

    const now = new Date();
    const lastNotification = this.lastNotificationSentAt;

    switch (this.notificationFrequency) {
      case 'immediate':
        return true;
      case 'daily':
        if (!lastNotification) return true;
        const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        return lastNotification < oneDayAgo;
      case 'weekly':
        if (!lastNotification) return true;
        const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        return lastNotification < oneWeekAgo;
      default:
        return false;
    }
  }

  async markNotificationSent(): Promise<void> {
    this.lastNotificationSentAt = new Date();
    this.hasNewResults = false;
    await this.save();
  }

  // Static methods
  static async getUserActiveSavedSearches(userId: string): Promise<SavedSearch[]> {
    return await SavedSearch.findAll({
      where: {
        userId,
        isActive: true
      },
      order: [['createdAt', 'DESC']]
    });
  }

  static async getSearchesNeedingNotification(): Promise<SavedSearch[]> {
    return await SavedSearch.findAll({
      where: {
        isActive: true,
        isNotificationEnabled: true,
        hasNewResults: true
      },
      include: [User]
    });
  }

  // JSON serialization
  toJSON(): any {
    const values = { ...this.get() };
    return values;
  }
}
