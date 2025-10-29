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
import { NOTIFICATION_TYPES, NotificationType } from '@shared/types/notification.types';

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
  @Column(DataType.ENUM(...NOTIFICATION_TYPES))
  type!: NotificationType;

  @AllowNull(false)
  @Column(DataType.STRING(200))
  title!: string;

  @AllowNull(false)
  @Column(DataType.STRING(4000))
  message!: string;

  @AllowNull(false)
  @Default(false)
  @Column(DataType.BOOLEAN)
  isRead!: boolean;

  @AllowNull(true)
  @Column(DataType.STRING(2000))
  actionUrl?: string;

  @AllowNull(true)
  @Column(DataType.STRING(2000))
  imageUrl?: string;

  @AllowNull(true)
  @Column(DataType.DATE)
  readAt?: Date;

  // Instance methods
  async markAsRead(): Promise<void> {
    if (!this.isRead) {
      this.isRead = true;
      this.readAt = new Date();
      await this.save();
    }
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

}
