import { User } from '@shared/database/models';
import { Agency } from '@shared/database/models/Agency';
import { generateToken, generateRefreshToken } from '@shared/middleware/auth';
import logger from './logger';

export interface OAuthProfile {
  provider: 'google' | 'github';
  providerId: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  avatar?: string;
  accessToken?: string;
  refreshToken?: string;
}

/**
 * Find or create user from OAuth profile
 */
export const findOrCreateOAuthUser = async (profile: OAuthProfile): Promise<{
  user: User;
  isNewUser: boolean;
  token: string;
  refreshToken: string;
}> => {
  const { provider, providerId, email, firstName, lastName, avatar } = profile;
  
  try {
    // First, try to find user by provider ID
    const providerIdField = `${provider}Id`;
    let user = await User.findOne({
      where: { [providerIdField]: providerId },
      include: [{
        model: Agency,
        as: 'agency'
      }]
    });

    if (user) {
      // User found by provider ID, update last login
      user.lastLoginAt = new Date();
      if (avatar && !user.avatar) {
        user.avatar = avatar;
      }
      await user.save();

      const token = generateToken({ 
        userId: user.id, 
        email: user.email, 
        role: user.role 
      });
      const refreshToken = generateRefreshToken({ userId: user.id });

      return {
        user,
        isNewUser: false,
        token,
        refreshToken
      };
    }

    // If not found by provider ID, try to find by email
    if (email) {
      user = await User.findOne({ 
        where: { email },
        include: [{
          model: Agency,
          as: 'agency'
        }]
      });
      
      if (user) {
        // User exists with this email, link the OAuth account
        const linkedProviders = user.linkedProviders || [];
        if (!linkedProviders.includes(provider)) {
          linkedProviders.push(provider);
          user.linkedProviders = linkedProviders;
        }
        
        (user as any)[providerIdField] = providerId;
        user.lastLoginAt = new Date();
        
        if (avatar && !user.avatar) {
          user.avatar = avatar;
        }
        
        await user.save();

        const token = generateToken({ 
          userId: user.id, 
          email: user.email, 
          role: user.role 
        });
        const refreshToken = generateRefreshToken({ userId: user.id });

        return {
          user,
          isNewUser: false,
          token,
          refreshToken
        };
      }
    }

    // User doesn't exist, create new user
    if (!email) {
      throw new Error('Email is required to create new user account');
    }

    const userData: any = {
      email,
      firstName: firstName || 'User',
      lastName: lastName || '',
      role: 'client',
      isVerified: true, // OAuth users are considered verified
      isActive: true,
      linkedProviders: [provider],
      lastLoginAt: new Date(),
      acceptedTermsAt: new Date(), // OAuth users implicitly accept terms
      acceptedPrivacyAt: new Date() // OAuth users implicitly accept privacy
    };

    if (avatar) {
      userData.avatar = avatar;
    }

    // Set provider-specific ID
    userData[providerIdField] = providerId;

    user = await User.create(userData);

    const token = generateToken({ 
      userId: user.id, 
      email: user.email, 
      role: user.role 
    });
    const refreshToken = generateRefreshToken({ userId: user.id });

    return {
      user,
      isNewUser: true,
      token,
      refreshToken
    };

  } catch (error) {
    logger.error(`OAuth user creation/update failed:`, error);
    throw error;
  }
};

/**
 * Link OAuth account to existing user
 */
export const linkOAuthAccount = async (
  userId: string,
  profile: OAuthProfile
): Promise<{ success: boolean; message: string; linkedProvider: string }> => {
  const { provider, providerId } = profile;
  
  try {
    const user = await User.findByPk(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Check if this provider is already linked
    const linkedProviders = user.linkedProviders || [];
    if (linkedProviders.includes(provider)) {
      return {
        success: false,
        message: 'This provider is already linked to your account',
        linkedProvider: provider
      };
    }

    // Check if this provider account is linked to another user
    const providerIdField = `${provider}Id`;
    const existingUser = await User.findOne({
      where: { [providerIdField]: providerId },
      include: [{
        model: Agency,
        as: 'agency'
      }]
    });

    if (existingUser && existingUser.id !== userId) {
      return {
        success: false,
        message: 'This provider account is already linked to another user',
        linkedProvider: provider
      };
    }

    // Link the provider
    linkedProviders.push(provider);
    user.linkedProviders = linkedProviders;
    (user as any)[providerIdField] = providerId;
    
    // Update avatar if user doesn't have one
    if (profile.avatar && !user.avatar) {
      user.avatar = profile.avatar;
    }
    
    await user.save();

    return {
      success: true,
      message: `${provider.charAt(0).toUpperCase() + provider.slice(1)} account linked successfully`,
      linkedProvider: provider
    };

  } catch (error) {
    logger.error(`OAuth account linking failed:`, error);
    throw error;
  }
};

/**
 * Unlink OAuth account from user
 */
export const unlinkOAuthAccount = async (
  userId: string,
  provider: 'google' | 'github'
): Promise<{ success: boolean; message: string }> => {
  try {
    const user = await User.findByPk(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const linkedProviders = user.linkedProviders || [];
    if (!linkedProviders.includes(provider)) {
      return {
        success: false,
        message: 'This provider is not linked to your account'
      };
    }

    // Check if user has a password or other OAuth providers linked
    // Don't allow unlinking if it's the only authentication method
    const hasPassword = !!user.password;
    const otherProviders = linkedProviders.filter(p => p !== provider);
    
    if (!hasPassword && otherProviders.length === 0) {
      return {
        success: false,
        message: 'Cannot unlink the only authentication method. Please set a password first.'
      };
    }

    // Unlink the provider
    user.linkedProviders = otherProviders;
    const providerIdField = `${provider}Id`;
    (user as any)[providerIdField] = null;
    
    await user.save();

    return {
      success: true,
      message: `${provider.charAt(0).toUpperCase() + provider.slice(1)} account unlinked successfully`
    };

  } catch (error) {
    logger.error(`OAuth account unlinking failed:`, error);
    throw error;
  }
};

/**
 * Generate OAuth state parameter for CSRF protection
 */
export const generateOAuthState = (): string => {
  return Buffer.from(Date.now().toString() + Math.random().toString()).toString('base64');
};

/**
 * Validate OAuth state parameter
 */
export const validateOAuthState = (state: string): boolean => {
  try {
    const decoded = Buffer.from(state, 'base64').toString();
    const timestamp = parseInt(decoded.split('0.')[0]);
    const now = Date.now();
    
    // State should not be older than 10 minutes
    return (now - timestamp) < (10 * 60 * 1000);
  } catch (error) {
    return false;
  }
};