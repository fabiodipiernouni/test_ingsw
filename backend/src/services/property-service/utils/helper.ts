import { User } from '@shared/database/models/User';
import { UserModel } from '@user/models/UserModel';
import { UserRole } from '@user/models/UserRole';

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
}

