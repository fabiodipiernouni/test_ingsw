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
  BelongsTo,
  Index
} from 'sequelize-typescript';
import { v4 as uuidv4 } from 'uuid';
import { User } from './User';
import { Property } from './Property';

@Table({
  tableName: 'property_favorites',
  timestamps: true
})
export class PropertyFavorite extends Model {
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

  @ForeignKey(() => Property)
  @AllowNull(false)
  @Column({ type: DataType.UUID, field: 'property_id' })
  propertyId!: string;

  @BelongsTo(() => Property)
  property!: Property;

  @AllowNull(true)
  @Column(DataType.STRING(2000))
  notes?: string;

  @AllowNull(true)
  @Column(DataType.JSON)
  tags?: string[];

  // Instance methods
  addTag(tag: string): void {
    if (!this.tags) {
      this.tags = [];
    }
    if (!this.tags.includes(tag)) {
      this.tags.push(tag);
    }
  }

  removeTag(tag: string): void {
    if (this.tags) {
      this.tags = this.tags.filter(t => t !== tag);
    }
  }

  hasTag(tag: string): boolean {
    return this.tags ? this.tags.includes(tag) : false;
  }

  // Static methods
  static async getUserFavorites(
    userId: string, 
    options?: {
      limit?: number;
      offset?: number;
      tags?: string[];
    }
  ): Promise<{ favorites: PropertyFavorite[]; count: number }> {
    const whereClause: any = { userId };
    
    if (options?.tags && options.tags.length > 0) {
      // Oracle JSON query for tags
      whereClause.tags = {
        $contains: options.tags
      };
    }

    const queryOptions: any = {
      where: whereClause,
      include: [
        {
          model: Property,
          include: ['images', 'agent']
        }
      ],
      order: [['createdAt', 'DESC']]
    };

    if (options?.limit) {
      queryOptions.limit = options.limit;
    }
    
    if (options?.offset) {
      queryOptions.offset = options.offset;
    }

    const { rows: favorites, count } = await PropertyFavorite.findAndCountAll(queryOptions);
    
    return { favorites, count };
  }

  static async isFavorited(userId: string, propertyId: string): Promise<boolean> {
    const favorite = await PropertyFavorite.findOne({
      where: { userId, propertyId }
    });
    return !!favorite;
  }

  static async getUserFavoriteById(
    userId: string, 
    propertyId: string
  ): Promise<PropertyFavorite | null> {
    return await PropertyFavorite.findOne({
      where: { userId, propertyId },
      include: [Property]
    });
  }

  static async getUserFavoriteStats(userId: string): Promise<any> {
    const favorites = await PropertyFavorite.findAll({
      where: { userId },
      include: [Property]
    });

    const totalFavorites = favorites.length;
    const byPropertyType: any = {};
    const byListingType: any = {};
    const avgPrice = favorites.reduce((sum, fav) => sum + (fav.property?.price || 0), 0) / totalFavorites;

    favorites.forEach(favorite => {
      if (favorite.property) {
        const { propertyType, listingType } = favorite.property;
        
        byPropertyType[propertyType] = (byPropertyType[propertyType] || 0) + 1;
        byListingType[listingType] = (byListingType[listingType] || 0) + 1;
      }
    });

    return {
      totalFavorites,
      byPropertyType,
      byListingType,
      avgPrice: totalFavorites > 0 ? avgPrice : 0
    };
  }

  static async getPopularProperties(limit: number = 10): Promise<any[]> {
    // Get most favorited properties
    const results = await PropertyFavorite.findAll({
      attributes: [
        'propertyId',
        [PropertyFavorite.sequelize!.fn('COUNT', PropertyFavorite.sequelize!.col('id')), 'favoritesCount']
      ],
      group: ['propertyId'],
      order: [[PropertyFavorite.sequelize!.fn('COUNT', PropertyFavorite.sequelize!.col('id')), 'DESC']],
      limit,
      include: [
        {
          model: Property,
          include: ['images', 'agent']
        }
      ]
    });

    return results;
  }

  // JSON serialization
  toJSON(): any {
    const values = { ...this.get() };
    return values;
  }
}
