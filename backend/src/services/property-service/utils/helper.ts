import { User } from '@shared/database/models/User';
import { UserModel } from '@user/models/UserModel';
import { UserRole } from '@user/models/UserRole';
import { Op } from 'sequelize';
import { SearchPropertyFilter } from '@property/dto/SearchPropertyFilter';

/**
 * Helper class per conversioni e utility varie
 */
export class Helper {
  /**
   * Converte un'istanza di User (Sequelize) in UserModel (interfaccia)
   * @param user - L'istanza User da convertire
   * @returns L'oggetto UserModel
   */
  static userToUserModel(user: User): UserModel {
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role as UserRole,
      avatar: user.avatar,
      phone: user.phone,
      isVerified: user.isVerified,
      isActive: user.isActive,
      linkedProviders: user.linkedProviders || [],
      cognitoSub: user.cognitoSub,
      cognitoUsername: user.cognitoUsername,
      lastLoginAt: user.lastLoginAt,
      agencyId: user.agencyId,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    };
  }

  static applySearchFilters(whereClause: any, filters: SearchPropertyFilter): void {
    // Filtro prezzo
    if (filters.priceMin !== undefined && filters.priceMax !== undefined) {
      whereClause.price = { [Op.between]: [filters.priceMin, filters.priceMax] };
    } else if (filters.priceMin !== undefined || filters.priceMax !== undefined) {
      whereClause.price = {};

      if (filters.priceMin !== undefined) {
        whereClause.price[Op.gte] = filters.priceMin;
      }

      if (filters.priceMax !== undefined) {
        whereClause.price[Op.lte] = filters.priceMax;
      }
    }

    // Filtro tipo proprietà
    if (filters.propertyType) {
      whereClause.propertyType = filters.propertyType;
    }

    // Filtro tipo annuncio
    if (filters.listingType) {
      whereClause.listingType = filters.listingType;
    }

    // Filtro camere da letto
    if (filters.bedrooms !== undefined) {
      whereClause.bedrooms = { [Op.gte]: filters.bedrooms };
    }

    // Filtro bagni
    if (filters.bathrooms !== undefined) {
      whereClause.bathrooms = { [Op.gte]: filters.bathrooms };
    }
  }
}

