export interface DatabaseConfig {
  username: string;
  password: string;
  dialect: 'oracle';
  connectString: string;
  pool?: {
    max: number;
    min: number;
    acquire: number;
    idle: number;
  };
  logging?: boolean | ((sql: string) => void);
}

export interface CognitoConfig {
  region: string;
  userPoolId: string;
  clientId: string;
  clientSecret?: string;
  issuer: string;
  groups: {
    clients: string;
    agents: string;
    admins: string;
    owners: string;
  };
  oauth: {
    domain: string; // es: your-domain.auth.eu-south-1.amazoncognito.com
    callbackUrl: string; // es: http://localhost:3000/auth/callback
    scope: string[]; // es: ['openid', 'email', 'profile']
    responseType: string; // es: 'code'
  };
}

export interface UploadConfig {
  maxFileSize: number;
}

export interface S3Config {
  bucketName: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  signedUrlExpiration: number;
  imageSizes: {
    small: { width: number; height: number; quality: number };
    medium: { width: number; height: number; quality: number };
    large: { width: number; height: number; quality: number };
  };
}

export interface AppConfig {
  nodeEnv: string;
  port: number;
  database: DatabaseConfig;
  cognito: CognitoConfig;
  upload: UploadConfig;
  s3: S3Config;
  frontendUrl: string;
}