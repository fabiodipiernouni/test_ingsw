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

export interface JWTConfig {
  secret: string;
  refreshSecret: string;
  expiresIn: string;
  refreshExpiresIn: string;
}

export interface OAuthConfig {
  google: {
    clientId: string;
    clientSecret: string;
  };
  facebook: {
    appId: string;
    appSecret: string;
  };
  github: {
    clientId: string;
    clientSecret: string;
  };
}

export interface EmailConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  from: string;
}

export interface RedisConfig {
  host: string;
  port: number;
  password?: string;
}

export interface UploadConfig {
  dir: string;
  maxFileSize: number;
  allowedImageTypes: string[];
}

export interface AppConfig {
  nodeEnv: string;
  port: number;
  database: DatabaseConfig;
  jwt: JWTConfig;
  oauth: OAuthConfig;
  email: EmailConfig;
  redis: RedisConfig;
  upload: UploadConfig;
  serviceSecret: string;
  frontendUrl: string;
  rateLimit: {
    windowMs: number;
    maxRequests: number;
  };
}