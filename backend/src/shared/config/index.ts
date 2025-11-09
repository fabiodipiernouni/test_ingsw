import dotenv from 'dotenv';
import { AppConfig, DatabaseConfig, CognitoConfig, UploadConfig, S3Config } from '@shared/types/config.types';

dotenv.config();

const databaseConfig: DatabaseConfig = {
  username: process.env.DB_USERNAME || '',
  password: process.env.DB_PASSWORD || '',
  dialect: 'oracle',
  connectString: process.env.DB_CONNECT_STRING || '',
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000
  },
  logging: process.env.NODE_ENV === 'development' ? console.log : false
};

const cognitoConfig: CognitoConfig = {
  region: process.env.AWS_COGNITO_REGION || 'eu-south-1',
  userPoolId: process.env.AWS_COGNITO_USER_POOL_ID || '',
  clientId: process.env.AWS_COGNITO_CLIENT_ID || '',
  issuer: `https://cognito-idp.${process.env.AWS_COGNITO_REGION || 'eu-south-1'}.amazonaws.com/${process.env.AWS_COGNITO_USER_POOL_ID || ''}`,
  groups: {
    clients: 'clients',
    agents: 'agents',
    admins: 'admins',
    owners: 'owners'
  },
  oauth: {
    domain: process.env.AWS_COGNITO_DOMAIN || '',
    callbackUrl: process.env.AWS_COGNITO_CALLBACK_URL || 'http://localhost:3001/auth/callback',
    scope: (process.env.AWS_COGNITO_OAUTH_SCOPE || 'openid,email,profile').split(','),
    responseType: process.env.AWS_COGNITO_RESPONSE_TYPE || 'code'
  }
};

const uploadConfig: UploadConfig = {
  maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760'), // 10MB default
};

const s3Config: S3Config = {
  bucketName: process.env.AWS_S3_BUCKET_NAME || '',
  region: process.env.AWS_REGION || 'eu-south-1',
  accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  signedUrlExpiration: parseInt(process.env.S3_SIGNED_URL_EXPIRATION || '3600'),
  imageSizes: {
    small: { width: 400, height: 300, quality: 80 },
    medium: { width: 800, height: 600, quality: 85 },
    large: { width: 1200, height: 900, quality: 90 }
  }
};

const config: AppConfig = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3000'),
  database: databaseConfig,
  cognito: cognitoConfig,
  upload: uploadConfig,
  s3: s3Config,
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
};

// Service-specific ports
export const servicePorts = {
  auth: parseInt(process.env.AUTH_SERVICE_PORT || '3001'),
  property: parseInt(process.env.PROPERTY_SERVICE_PORT || '3002'),
  search: parseInt(process.env.SEARCH_SERVICE_PORT || '3003'),
  user: parseInt(process.env.USER_SERVICE_PORT || '3004'),
  notification: parseInt(process.env.NOTIFICATION_SERVICE_PORT || '3005')
};

export default config;