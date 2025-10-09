import { Sequelize } from 'sequelize-typescript';
import oracledb from 'oracledb';
import config from '../config/index';
import {
  User,
  Agency,
  Property,
  PropertyImage,
  SearchHistory,
  SavedSearch,
  Notification,
  NotificationPreferences,
  UserPreferences,
  PropertyFavorite,
  PropertyView
} from './models';

class Database {
  public sequelize: Sequelize;

  constructor() {
    this.sequelize = new Sequelize({
      dialect: 'oracle',
      username: config.database.username,
      password: config.database.password,
      dialectOptions: {
        connectString: config.database.connectString
      },
      pool: config.database.pool,
      logging: config.database.logging,
      models: [
        User,
        Agency,
        Property,
        PropertyImage,
        SearchHistory,
        SavedSearch,
        Notification,
        NotificationPreferences,
        UserPreferences,
        PropertyFavorite,
        PropertyView
      ],
      define: {
        // Oracle naming conventions
        freezeTableName: true,
        underscored: true,
        timestamps: true
        // createdAt: 'created_at',
        // updatedAt: 'updated_at'
      }
    });
  }

  async connect(): Promise<void> {
    try {
      // Initialize Oracle client
      oracledb.initOracleClient();
      
      await this.sequelize.authenticate();
      console.log('Database connection established successfully');
      
      // Sync models in development
      if (config.nodeEnv === 'development') {
        await this.sequelize.sync({ force: false });
        await Agency.addCreatorForeignKey(this.sequelize);
      }
    } catch (error) {
      console.error('Unable to connect to the database:', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    try {
      await this.sequelize.close();
      console.log('Database connection closed');
    } catch (error) {
      console.error('Error closing database connection:', error);
      throw error;
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      await this.sequelize.authenticate();
      return true;
    } catch (error) {
      console.error('Database health check failed:', error);
      return false;
    }
  }

  // Aggiunge compatibilità con connection.ts
  getInstance(): Sequelize {
    return this.sequelize;
  }
}

// Singleton instance
export const database = new Database();

// Export per compatibilità con connection.ts
export const connectToDatabase = async (): Promise<Sequelize> => {
  await database.connect();
  return database.getInstance();
};

export const getDatabase = (): Sequelize => {
  return database.getInstance();
};

export { Sequelize };
export default database;