import dotenv from 'dotenv';

dotenv.config();

const config = {
  app: {
    env: process.env.NODE_ENV || 'development',
    cors: {
      origins: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000']
    }
  },
  
  database: {
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
  },

  auth: {
    port: parseInt(process.env.AUTH_SERVICE_PORT || '3001'),
  },

  property: {
    port: parseInt(process.env.PROPERTY_SERVICE_PORT || '3002')
  },

  search: {
    port: parseInt(process.env.SEARCH_SERVICE_PORT || '3003')
  },

  user: {
    port: parseInt(process.env.USER_SERVICE_PORT || '3004')
  },

  notification: {
    port: parseInt(process.env.NOTIFICATION_SERVICE_PORT || '3005')
  },

  upload: {
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760'), // 10MB
  },

  s3: {
    bucketName: process.env.AWS_S3_BUCKET_NAME || '',
    region: process.env.AWS_REGION || 'eu-south-1',
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
    signedUrlExpiration: parseInt(process.env.S3_SIGNED_URL_EXPIRATION || '3600'), // 1 ora
    imageSizes: {
      small: { width: 400, height: 300, quality: 80 },
      medium: { width: 800, height: 600, quality: 85 },
      large: { width: 1200, height: 900, quality: 90 }
    }
  }
};

export { config };
export default config;