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

@Table({
  tableName: 'search_history',
  timestamps: true
})
export class SearchHistory extends Model {
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
  @Column(DataType.JSON)
  filters!: object;

  @AllowNull(false)
  @Default(0)
  @Column(DataType.INTEGER)
  resultCount!: number;

  @AllowNull(false)
  @Default(() => new Date())

  @Column(DataType.DATE)
  searchedAt!: Date;

  @AllowNull(false)
  @Default('web')
  @Column(DataType.ENUM('web', 'mobile', 'api'))
  source!: 'web' | 'mobile' | 'api';

  @AllowNull(true)
  @Column(DataType.FLOAT)
  executionTime?: number;

  @AllowNull(true)
  @Column(DataType.STRING(200))
  searchQuery?: string;

  @AllowNull(true)
  @Column(DataType.STRING(100))
  location?: string;

  @AllowNull(true)
  @Column(DataType.STRING(50))
  propertyType?: string;

  @AllowNull(true)
  @Column(DataType.STRING(50))
  listingType?: string;

  @AllowNull(true)
  @Column(DataType.DECIMAL(10, 2))
  priceMin?: number;

  @AllowNull(true)
  @Column(DataType.DECIMAL(10, 2))
  priceMax?: number;

  // Instance methods
  getFiltersString(): string {
    return JSON.stringify(this.filters);
  }

  isRecentSearch(hours: number = 24): boolean {
    const hoursDiff = (Date.now() - this.searchedAt.getTime()) / (1000 * 60 * 60);
    return hoursDiff <= hours;
  }

  // Static methods
  static async getUserRecentSearches(userId: string, limit: number = 10): Promise<SearchHistory[]> {
    return await SearchHistory.findAll({
      where: { userId },
      order: [['searchedAt', 'DESC']],
      limit
    });
  }

  static async getUserPopularFilters(userId: string, days: number = 30): Promise<any[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const searches = await SearchHistory.findAll({
      where: {
        userId,
        searchedAt: {
          $gte: startDate
        }
      },
      order: [['searchedAt', 'DESC']]
    });

    // Analyze popular filters
    const filterCounts: any = {};
    searches.forEach(search => {
      const filters = search.filters as any;
      Object.keys(filters).forEach(key => {
        if (filters[key] !== null && filters[key] !== undefined) {
          filterCounts[key] = (filterCounts[key] || 0) + 1;
        }
      });
    });

    return Object.entries(filterCounts)
      .sort(([, a], [, b]) => (b as number) - (a as number))
      .slice(0, 10);
  }

  // JSON serialization
  toJSON(): any {
    const values = { ...this.get() };
    return values;
  }
}
