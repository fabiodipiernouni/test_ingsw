export interface ConfirmForgotPasswordRequest {
  email: string;
  code: string;
  newPassword: string;
}