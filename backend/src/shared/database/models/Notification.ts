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
import { Op } from 'sequelize';

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

  @Column(DataType.VIRTUAL)
  get isRead(): boolean {
    return this.readAt != null;
  }

  @Column(DataType.VIRTUAL)
  get isSent(): boolean {
    return this.sentAt != null;
  }

  @AllowNull(true)
  @Column(DataType.STRING(2000))
  actionUrl?: string;

  @AllowNull(true)
  @Column(DataType.STRING(2000))
  imageUrl?: string;

  @AllowNull(true)
  @Column(DataType.DATE)
  readAt?: Date;

  @AllowNull(true)
  @Column(DataType.DATE)
  sentAt?: Date; // sarà true quando la notifica sarà stata effettivamente inviata

  // Instance methods
  async markAsRead(): Promise<void> {
    if (!this.readAt) {
      this.readAt = new Date();
      await this.save();
    }
  }

  async markAsUnread(): Promise<void> {
    if (this.readAt) {
      this.readAt = null as any;
      await this.save();
    }
  }

  static async markAllAsReadForUser(userId: string, type?: NotificationType): Promise<number> {
    const whereClause: any = {
      userId,
      readAt: null,
      sentAt: { [Op.ne]: null } // Only sent notifications
    };

    if (type) {
      whereClause.type = type;
    }

    const [affectedCount] = await Notification.update(
      { 
        readAt: new Date() 
      },
      { 
        where: whereClause 
      }
    );

    return affectedCount;
  }

  static async getTotalUnreadCountForUser(userId: string): Promise<number> {
    const count = await Notification.count({
      where: {
        userId,
        readAt: null,
        sentAt: { [Op.ne]: null } // Only sent notifications
      }
    });
    return count;
  }

}
