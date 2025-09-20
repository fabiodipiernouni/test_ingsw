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
import { Property } from './Property';

@Table({
  tableName: 'property_views',
  timestamps: true
})
export class PropertyView extends Model {
  @PrimaryKey
  @Default(() => uuidv4())
  @Column(DataType.UUID)
  id!: string;

  @ForeignKey(() => User)
  @AllowNull(true) // Allow anonymous views
  @Column({ type: DataType.UUID, field: 'user_id' })
  userId?: string;

  @BelongsTo(() => User)
  user?: User;

  @ForeignKey(() => Property)
  @AllowNull(false)
  @Column({ type: DataType.UUID, field: 'property_id' })
  propertyId!: string;

  @BelongsTo(() => Property)
  property!: Property;

  @AllowNull(false)
  @Default(() => new Date())

  @Column(DataType.DATE)
  viewedAt!: Date;

  @AllowNull(false)
  @Default('web')
  @Column(DataType.ENUM('web', 'mobile', 'direct', 'search', 'favorite', 'notification'))
  source!: 'web' | 'mobile' | 'direct' | 'search' | 'favorite' | 'notification';

  @AllowNull(true)
  @Column(DataType.STRING(45))
  ipAddress?: string;

  @AllowNull(true)
  @Column(DataType.TEXT)
  userAgent?: string;

  @AllowNull(true)
  @Column(DataType.STRING(10))
  country?: string;

  @AllowNull(true)
  @Column(DataType.STRING(100))
  city?: string;

  @AllowNull(true)
  @Column(DataType.INTEGER)
  duration?: number; // seconds spent viewing

  @AllowNull(true)
  @Column(DataType.STRING(500))
  referrer?: string;

  @AllowNull(true)
  @Column(DataType.JSON)
  metadata?: Record<string, any>;

  // Instance methods
  isRecentView(hours: number = 24): boolean {
    const hoursDiff = (Date.now() - this.viewedAt.getTime()) / (1000 * 60 * 60);
    return hoursDiff <= hours;
  }

  // Static methods
  static async recordView(data: {
    userId?: string;
    propertyId: string;
    source?: string;
    ipAddress?: string;
    userAgent?: string;
    referrer?: string;
    metadata?: Record<string, any>;
  }): Promise<PropertyView> {
    // Check if the same user viewed the same property recently (within 1 hour)
    if (data.userId) {
      const recentView = await PropertyView.findOne({
        where: {
          userId: data.userId,
          propertyId: data.propertyId,
          viewedAt: {
            $gte: new Date(Date.now() - 60 * 60 * 1000) // 1 hour ago
          }
        }
      });

      // If found recent view, update the timestamp instead of creating new record
      if (recentView) {
        recentView.viewedAt = new Date();
        await recentView.save();
        return recentView;
      }
    }

    // Create new view record
    const view = await PropertyView.create({
      userId: data.userId,
      propertyId: data.propertyId,
      source: data.source || 'web',
      ipAddress: data.ipAddress,
      userAgent: data.userAgent,
      referrer: data.referrer,
      metadata: data.metadata
    });

    // Increment property view count
    await Property.increment('views', {
      where: { id: data.propertyId }
    });

    return view;
  }

  static async getUserViewHistory(
    userId: string,
    options?: {
      limit?: number;
      offset?: number;
      days?: number;
    }
  ): Promise<{ views: PropertyView[]; count: number }> {
    const whereClause: any = { userId };

    if (options?.days) {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - options.days);
      whereClause.viewedAt = { $gte: startDate };
    }

    const queryOptions: any = {
      where: whereClause,
      include: [
        {
          model: Property,
          include: ['images', 'agent']
        }
      ],
      order: [['viewedAt', 'DESC']]
    };

    if (options?.limit) {
      queryOptions.limit = options.limit;
    }
    
    if (options?.offset) {
      queryOptions.offset = options.offset;
    }

    const { rows: views, count } = await PropertyView.findAndCountAll(queryOptions);
    
    return { views, count };
  }

  static async getPropertyViewStats(propertyId: string, days: number = 30): Promise<any> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const views = await PropertyView.findAll({
      where: {
        propertyId,
        viewedAt: { $gte: startDate }
      }
    });

    const totalViews = views.length;
    const uniqueUsers = new Set(views.filter(v => v.userId).map(v => v.userId)).size;
    
    // Group by source
    const bySource: any = {};
    views.forEach(view => {
      bySource[view.source] = (bySource[view.source] || 0) + 1;
    });

    // Group by day
    const byDay: any = {};
    views.forEach(view => {
      const day = view.viewedAt.toISOString().split('T')[0];
      byDay[day] = (byDay[day] || 0) + 1;
    });

    return {
      totalViews,
      uniqueUsers,
      bySource,
      byDay
    };
  }

  static async getUserViewingPatterns(userId: string): Promise<any> {
    const views = await PropertyView.findAll({
      where: { userId },
      include: [Property],
      order: [['viewedAt', 'DESC']],
      limit: 100 // Analyze last 100 views
    });

    const propertyTypes: any = {};
    const listingTypes: any = {};
    const priceRanges: any = {};
    const locations: any = {};

    views.forEach(view => {
      if (view.property) {
        const { propertyType, listingType, price, city } = view.property;
        
        // Property types
        propertyTypes[propertyType] = (propertyTypes[propertyType] || 0) + 1;
        
        // Listing types
        listingTypes[listingType] = (listingTypes[listingType] || 0) + 1;
        
        // Price ranges
        const priceRange = price < 100000 ? '<100k' : 
                          price < 300000 ? '100k-300k' :
                          price < 500000 ? '300k-500k' : '>500k';
        priceRanges[priceRange] = (priceRanges[priceRange] || 0) + 1;
        
        // Locations
        locations[city] = (locations[city] || 0) + 1;
      }
    });

    return {
      totalViews: views.length,
      propertyTypes,
      listingTypes,
      priceRanges,
      locations
    };
  }

  // JSON serialization
  toJSON(): any {
    const values = { ...this.get() };
    values.isRecent = this.isRecentView();
    return values;
  }
}
