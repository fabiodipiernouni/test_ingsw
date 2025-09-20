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

export type NotificationType = 
  | 'new_property_match'
  | 'price_change'
  | 'property_status_change'
  | 'saved_search_results'
  | 'account_verification'
  | 'property_view'
  | 'favorite_added'
  | 'message_received'
  | 'system_maintenance'
  | 'payment_reminder'
  | 'new_review'
  | 'property_approved'
  | 'property_expired';

@Table({
  tableName: 'notifications',
  timestamps: true
})
export class Notification extends Model {
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

  @Column(DataType.ENUM(
    'new_property_match',
    'price_change', 
    'property_status_change',
    'saved_search_results',
    'account_verification',
    'property_view',
    'favorite_added',
    'message_received',
    'system_maintenance',
    'payment_reminder',
    'new_review',
    'property_approved',
    'property_expired'
  ))
  type!: NotificationType;

  @AllowNull(false)
  @Column(DataType.STRING(200))
  title!: string;

  @AllowNull(false)
  @Column(DataType.TEXT)
  message!: string;

  @AllowNull(true)
  @Column(DataType.JSON)
  data?: Record<string, any>;

  @AllowNull(false)
  @Default(false)

  @Column(DataType.BOOLEAN)
  isRead!: boolean;

  @AllowNull(false)
  @Default('normal')

  @Column(DataType.ENUM('low', 'normal', 'high', 'urgent'))
  priority!: 'low' | 'normal' | 'high' | 'urgent';

  @AllowNull(false)
  @Default('in_app')
  @Column(DataType.ENUM('in_app', 'email', 'push', 'sms'))
  channel!: 'in_app' | 'email' | 'push' | 'sms';

  @AllowNull(true)
  @Column(DataType.TEXT)
  actionUrl?: string;

  @AllowNull(true)
  @Column(DataType.TEXT)
  imageUrl?: string;

  @AllowNull(true)

  @Column(DataType.DATE)
  expiresAt?: Date;

  @AllowNull(true)

  @Column(DataType.DATE)
  readAt?: Date;

  @AllowNull(true)

  @Column(DataType.DATE)
  scheduledAt?: Date;

  @AllowNull(true)
  @Column(DataType.DATE)
  sentAt?: Date;

  // Instance methods
  async markAsRead(): Promise<void> {
    if (!this.isRead) {
      this.isRead = true;
      this.readAt = new Date();
      await this.save();
    }
  }

  async markAsSent(): Promise<void> {
    this.sentAt = new Date();
    await this.save();
  }

  isExpired(): boolean {
    return this.expiresAt ? new Date() > this.expiresAt : false;
  }

  isScheduled(): boolean {
    return this.scheduledAt ? new Date() < this.scheduledAt : false;
  }

  shouldBeSent(): boolean {
    return !this.sentAt && !this.isExpired() && !this.isScheduled();
  }

  getPriorityLevel(): number {
    const levels = { low: 1, normal: 2, high: 3, urgent: 4 };
    return levels[this.priority];
  }

  // Static methods
  static async getUserUnreadNotifications(userId: string, limit?: number): Promise<Notification[]> {
    const options: any = {
      where: {
        userId,
        isRead: false
      },
      order: [['createdAt', 'DESC']]
    };

    if (limit) {
      options.limit = limit;
    }

    return await Notification.findAll(options);
  }

  static async getUserNotificationsByType(
    userId: string, 
    type: NotificationType,
    limit?: number
  ): Promise<Notification[]> {
    const options: any = {
      where: {
        userId,
        type
      },
      order: [['createdAt', 'DESC']]
    };

    if (limit) {
      options.limit = limit;
    }

    return await Notification.findAll(options);
  }

  static async markAllAsReadForUser(userId: string, type?: NotificationType): Promise<number> {
    const whereClause: any = {
      userId,
      isRead: false
    };

    if (type) {
      whereClause.type = type;
    }

    const [affectedCount] = await Notification.update(
      { 
        isRead: true, 
        readAt: new Date() 
      },
      { 
        where: whereClause 
      }
    );

    return affectedCount;
  }

  static async getNotificationStats(userId: string, days: number = 30): Promise<any> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const notifications = await Notification.findAll({
      where: {
        userId,
        createdAt: {
          $gte: startDate
        }
      }
    });

    const totalSent = notifications.length;
    const totalRead = notifications.filter(n => n.isRead).length;
    const unreadCount = totalSent - totalRead;
    const readRate = totalSent > 0 ? totalRead / totalSent : 0;

    // Group by type
    const byType: any = {};
    notifications.forEach(notification => {
      if (!byType[notification.type]) {
        byType[notification.type] = { sent: 0, read: 0, unread: 0 };
      }
      byType[notification.type].sent++;
      if (notification.isRead) {
        byType[notification.type].read++;
      } else {
        byType[notification.type].unread++;
      }
    });

    return {
      totalSent,
      totalRead,
      unreadCount,
      readRate,
      byType
    };
  }

  // JSON serialization
  toJSON(): any {
    const values = { ...this.get() };
    values.priorityLevel = this.getPriorityLevel();
    values.isExpired = this.isExpired();
    values.isScheduled = this.isScheduled();
    return values;
  }
}
