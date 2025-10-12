export type ApiResponse<T = any> =
  | {
  success: true;
  data: T;
  message?: string;
  timestamp: Date;
  path?: string;
}
  | {
  success: false;
  message?: string;
  error?: string;
  timestamp: Date;
  path?: string;
  details?: string[];
};