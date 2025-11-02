import nodemailer, { Transporter } from 'nodemailer';
import { emailConfig } from '../config/worker.config';
import logger from '@shared/utils/logger';

export interface EmailOptions {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

export class EmailService {
  private transporter: Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: emailConfig.host,
      port: emailConfig.port,
      secure: emailConfig.secure,
      auth: {
        user: emailConfig.user,
        pass: emailConfig.password,
      },
    });

    this.verifyConnection();
  }

  private async verifyConnection(): Promise<void> {
    try {
      await this.transporter.verify();
      logger.info('Email service is ready to send messages');
    } catch (error) {
      logger.error('Email service connection error:', error);
      throw error;
    }
  }

  async sendEmail(options: EmailOptions): Promise<boolean> {
    try {
      const mailOptions = {
        from: emailConfig.from,
        to: options.to,
        subject: options.subject,
        text: options.text,
        html: options.html || options.text,
      };

      const info = await this.transporter.sendMail(mailOptions);
      logger.info(`Email sent successfully to ${options.to}`, { messageId: info.messageId });
      return true;
    } catch (error) {
      logger.error(`Failed to send email to ${options.to}:`, error);
      return false;
    }
  }

  async sendNotificationEmail(
    to: string,
    title: string,
    message: string,
    actionUrl?: string,
    imageUrl?: string,
    agencyName?: string
  ): Promise<boolean> {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:4200';
    
    // If actionUrl is a relative path, prepend the frontend URL
    let fullActionUrl = actionUrl;
    if (actionUrl) {
      try {
        // Try to parse as URL - if it fails, it's a relative path
        new URL(actionUrl);
      } catch {
        // It's a relative path, prepend the frontend URL
        fullActionUrl = new URL(actionUrl, frontendUrl).href;
      }
    }
    
    const html = this.generateNotificationEmailTemplate(title, message, fullActionUrl, imageUrl, agencyName);
    
    return this.sendEmail({
      to,
      subject: `${title} - DietiEstates25`,
      text: `${title}\n\n${message}${fullActionUrl ? `\n\nLink: ${fullActionUrl}` : ''}${agencyName ? `\n\nDa: ${agencyName}` : ''}`,
      html,
    });
  }

  private generateNotificationEmailTemplate(
    title: string,
    message: string,
    actionUrl?: string,
    imageUrl?: string,
    agencyName?: string
  ): string {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:4200';
    
    return `
      <!DOCTYPE html>
      <html lang="it">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${title} - DietiEstates25</title>
        <style>
          body {
            margin: 0;
            padding: 0;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background-color: #f4f4f4;
          }
          .email-container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
          }
          .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            padding: 40px 20px;
            text-align: center;
          }
          .header h1 {
            color: #ffffff;
            margin: 0;
            font-size: 28px;
            font-weight: 600;
          }
          .content {
            padding: 40px 30px;
          }
          .notification-title {
            font-size: 24px;
            color: #333333;
            margin-bottom: 20px;
            font-weight: 600;
          }
          .message {
            font-size: 16px;
            color: #666666;
            line-height: 1.6;
            margin-bottom: 30px;
          }
          .image-container {
            text-align: center;
            margin: 30px 0;
          }
          .notification-image {
            max-width: 100%;
            height: auto;
            border-radius: 10px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
          }
          .action-button {
            display: inline-block;
            padding: 15px 40px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: #ffffff !important;
            text-decoration: none;
            border-radius: 8px;
            font-weight: 600;
            font-size: 16px;
            text-align: center;
            margin: 20px 0;
            transition: transform 0.2s;
          }
          .action-button:hover {
            transform: translateY(-2px);
          }
          .divider {
            height: 1px;
            background-color: #e0e0e0;
            margin: 30px 0;
          }
          .footer {
            background-color: #f8f9fa;
            padding: 30px;
            text-align: center;
            color: #666666;
            font-size: 14px;
          }
          .footer p {
            margin: 5px 0;
          }
          .footer a {
            color: #667eea;
            text-decoration: none;
          }
          .footer a:hover {
            text-decoration: underline;
          }
          .website-link {
            background-color: #f8f9fa;
            padding: 20px;
            text-align: center;
            margin: 20px 0;
            border-radius: 8px;
            border: 1px solid #e0e0e0;
          }
          .website-link a {
            color: #667eea;
            text-decoration: none;
            font-weight: 600;
            font-size: 16px;
          }
          .website-link a:hover {
            text-decoration: underline;
          }
        </style>
      </head>
      <body>
        <div class="email-container">
          <div class="header">
            <h1>🏠 DietiEstates25</h1>
          </div>
          <div class="content">
            <h2 class="notification-title">${title}</h2>
            <div class="message">
              ${message}
            </div>
            ${agencyName ? `
            <div style="font-size: 13px; color: #999; font-style: italic; margin-bottom: 20px;">
              Da: ${agencyName}
            </div>
            ` : ''}
            ${imageUrl ? `
            <div class="image-container">
              <img src="${imageUrl}" alt="Immagine notifica" class="notification-image" />
            </div>
            ` : ''}
            ${actionUrl ? `
            <div style="text-align: center;">
              <a href="${actionUrl}" class="action-button">Visualizza dettagli</a>
            </div>
            ` : ''}
            <div class="divider"></div>
            <div class="website-link">
              <p style="margin: 0 0 10px 0; color: #666666;">Visita il nostro sito:</p>
              <a href="${frontendUrl}">${frontendUrl}</a>
            </div>
          </div>
          <div class="footer">
            <p><strong>Hai bisogno di aiuto?</strong></p>
            <p>Contatta il nostro supporto: <a href="mailto:dieti25estates@gmail.com">dieti25estates@gmail.com</a></p>
            <p style="margin-top: 20px; font-size: 12px; color: #999999;">
              Questo è un messaggio automatico, per favore non rispondere a questa email.
            </p>
            <p style="margin-top: 10px; font-size: 12px; color: #999999;">
              &copy; 2025 DietiEstates. Tutti i diritti riservati.
            </p>
          </div>
        </div>
      </body>
      </html>
    `;
  }
}

export const emailService = new EmailService();
