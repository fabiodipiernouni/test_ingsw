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
  tableName: 'notification_preferences',
  timestamps: true
})
export class NotificationPreferences extends Model {
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
  @Default(true)
  @Column({ type: DataType.BOOLEAN, field: 'email_notifications' })
  emailNotifications!: boolean;

  @AllowNull(false)
  @Default(true)
  @Column({ type: DataType.BOOLEAN, field: 'push_notifications' })
  pushNotifications!: boolean;

  @AllowNull(true)
  @Column({ type: DataType.JSON, field: 'enabled_types' })
  enabledTypes?: NotificationType[];

  // Quiet hours configuration
  @AllowNull(false)
  @Default(false)
  @Column({ type: DataType.BOOLEAN, field: 'quiet_hours_enabled' })
  quietHoursEnabled!: boolean;

  @AllowNull(true)
  @Column({ type: DataType.STRING(5), field: 'quiet_hours_start' })
  quietHoursStart?: string; // Format: "HH:MM"

  @AllowNull(true)
  @Column({ type: DataType.STRING(5), field: 'quiet_hours_end' })
  quietHoursEnd?: string; // Format: "HH:MM"

  @AllowNull(false)
  @Default('Europe/Rome')
  @Column(DataType.STRING(50))
  timezone!: string;

  @AllowNull(false)
  @Default('immediate')
  @Column(DataType.ENUM('immediate', 'daily_digest', 'weekly_digest'))
  frequency!: 'immediate' | 'daily_digest' | 'weekly_digest';

  @AllowNull(false)
  @Default('it')
  @Column(DataType.ENUM('it', 'en'))
  language!: 'it' | 'en';

  // Instance methods
  isNotificationTypeEnabled(type: NotificationType): boolean {
    if (!this.enabledTypes) return true;
    return this.enabledTypes.includes(type);
  }

  isInQuietHours(): boolean {
    if (!this.quietHoursEnabled || !this.quietHoursStart || !this.quietHoursEnd) {
      return false;
    }

    const now = new Date();
    const currentTime = now.toLocaleTimeString('it-IT', { 
      hour12: false, 
      timeZone: this.timezone 
    });

    const [currentHour, currentMinute] = currentTime.split(':').map(Number);
    const currentMinutes = currentHour * 60 + currentMinute;

    const [startHour, startMinute] = this.quietHoursStart.split(':').map(Number);
    const startMinutes = startHour * 60 + startMinute;

    const [endHour, endMinute] = this.quietHoursEnd.split(':').map(Number);
    const endMinutes = endHour * 60 + endMinute;

    if (startMinutes <= endMinutes) {
      // Same day (e.g., 08:00 to 22:00)
      return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
    } else {
      // Cross midnight (e.g., 22:00 to 08:00)
      return currentMinutes >= startMinutes || currentMinutes <= endMinutes;
    }
  }

  canReceiveNotification(type: NotificationType, channel: 'email' | 'push'): boolean {
    // Check if notification type is enabled
    if (!this.isNotificationTypeEnabled(type)) {
      return false;
    }

    // Check channel preferences
    switch (channel) {
      case 'email':
        if (!this.emailNotifications) return false;
        break;
      case 'push':
        if (!this.pushNotifications) return false;
        break;
    }

    // Check quiet hours for immediate notifications
    if (this.frequency === 'immediate' && this.isInQuietHours()) {
      return false;
    }

    return true;
  }

  // Static methods
  static async getOrCreateForUser(userId: string): Promise<NotificationPreferences> {
    let preferences = await NotificationPreferences.findOne({ where: { userId } });
    
    if (!preferences) {
      preferences = await NotificationPreferences.create({
        userId,
        enabledTypes: [
          'new_property_match',
          'price_change',
          'property_status_change',
          'saved_search_results',
          'account_verification'
        ]
      });
    }

    return preferences;
  }

  // JSON serialization
  toJSON(): any {
    const values = { ...this.get() };
    values.isInQuietHours = this.isInQuietHours();
    return values;
  }
}
