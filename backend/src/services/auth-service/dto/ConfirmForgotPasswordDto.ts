export interface ConfirmForgotPasswordDto {
  email: string;
  code: string;
  newPassword: string;
}