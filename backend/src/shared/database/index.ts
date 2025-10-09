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
      quoteIdentifiers: false,
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
      // Initialize Oracle client only if not already initialized
      try {
        // console.log('Initializing Oracle client...');
        oracledb.initOracleClient();
        // console.log('Oracle client initialized successfully');
      } catch (error: any) {
        // initOracleClient can only be called once per process
        if (error.message && error.message.includes('already been initialized')) {
          // console.log('Oracle client already initialized');
        } else {
          console.error('Error initializing Oracle client:', error);
          throw error;
        }
      }

      // console.log('Authenticating with database...');
      await this.sequelize.authenticate();
      // console.log('Database connection established successfully');

      // Sync models in development
      if (config.nodeEnv === 'development') {
        // console.log('Syncing database models...');
        await this.sequelize.sync({ force: false });
        // console.log('Adding creator foreign key to Agency...');
        await Agency.addCreatorForeignKey(this.sequelize);
        // console.log('Database sync completed');
      }
    } catch (error) {
      console.error('Unable to connect to the database:', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    try {
      await this.sequelize.close();
      // console.log('Database connection closed');
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