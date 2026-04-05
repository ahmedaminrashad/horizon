import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Mailgun from 'mailgun.js';
import formData from 'form-data';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor(private readonly configService: ConfigService) {}

  isMailgunEnabled(): boolean {
    const v = (
      this.configService.get<string>('MAIL_MAILER', '') ?? ''
    ).trim();
    return v.toLowerCase() === 'mailgun';
  }

  private getMailgunClient() {
    if (!this.isMailgunEnabled()) {
      return null;
    }
    const key = this.configService.get<string>('MAILGUN_SECRET', '')?.trim();
    const domain = this.configService.get<string>('MAILGUN_DOMAIN', '')?.trim();
    if (!key || !domain) {
      this.logger.warn(
        'Mailgun enabled but MAILGUN_SECRET or MAILGUN_DOMAIN is missing',
      );
      return null;
    }
    const endpoint =
      (
        this.configService.get<string>('MAILGUN_ENDPOINT', 'api.mailgun.net') ??
        'api.mailgun.net'
      ).trim() || 'api.mailgun.net';
    const url = endpoint.startsWith('http')
      ? endpoint
      : `https://${endpoint}`;
    const mailgun = new Mailgun(formData);
    return mailgun.client({ username: 'api', key, url });
  }

  /**
   * Mailgun requires From to use the configured sending domain (e.g. sandbox uses postmaster@sandbox….mailgun.org).
   */
  private resolveFromAddress(mailgunDomain: string): string {
    const domain = mailgunDomain.trim().toLowerCase();
    const raw = this.configService
      .get<string>('MAIL_FROM_ADDRESS', '')
      ?.trim();
    if (raw) {
      const at = raw.lastIndexOf('@');
      const host = at >= 0 ? raw.slice(at + 1).toLowerCase() : '';
      if (host === domain) {
        return raw;
      }
    }
    return `postmaster@${mailgunDomain}`;
  }

  /**
   * Sends password reset instructions via Mailgun when configured.
   * @param options.path — overrides PASSWORD_RESET_PATH (e.g. clinic/doctor reset page)
   * @param options.clinicId — appended as clinicId query param for multi-tenant UIs
   * @returns true if Mailgun accepted the message, false if skipped or failed
   */
  async sendPasswordResetEmail(
    to: string | null | undefined,
    resetToken: string,
    options?: {
      clinicId?: number;
      path?: string;
      subject?: string;
    },
  ): Promise<boolean> {
    const address = to?.trim();
    if (!address) {
      this.logger.warn(
        'Password reset email skipped: recipient has no email address',
      );
      return false;
    }

    if (!this.isMailgunEnabled()) {
      this.logger.warn(
        'Password reset email skipped: set MAIL_MAILER=mailgun to send mail',
      );
      return false;
    }

    const client = this.getMailgunClient();
    const domain = this.configService.get<string>('MAILGUN_DOMAIN', '')?.trim();
    if (!client || !domain) {
      this.logger.warn(
        'Password reset email skipped: Mailgun client not configured (check MAILGUN_SECRET / MAILGUN_DOMAIN)',
      );
      return false;
    }

    const fromAddr = this.resolveFromAddress(domain);
    const fromName = (
      this.configService.get<string>('MAIL_FROM_NAME', 'Horizon') ?? 'Horizon'
    ).trim();
    const baseUrl = (
      this.configService.get<string>('FRONTEND_URL') ?? ''
    ).replace(/\/$/, '');
    const path =
      options?.path ??
      this.configService.get<string>('PASSWORD_RESET_PATH', '/reset-password');
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    const query = new URLSearchParams();
    query.set('token', resetToken);
    if (options?.clinicId != null) {
      query.set('clinicId', String(options.clinicId));
    }
    const link = baseUrl
      ? `${baseUrl}${normalizedPath}?${query.toString()}`
      : null;

    const subject = options?.subject ?? 'Password reset';

    const text = link
      ? `You requested a password reset. Open this link to continue (valid for 1 hour):\n\n${link}\n\nIf you did not request this, you can ignore this email.`
      : `You requested a password reset. Use this token in the app within 1 hour:\n\n${resetToken}\n\nSet FRONTEND_URL in the server environment to send a clickable link instead.`;

    const html = link
      ? `<p>You requested a password reset.</p><p><a href="${link}">Reset your password</a></p><p>This link expires in 1 hour.</p><p>If you did not request this, ignore this email.</p>`
      : `<p>You requested a password reset.</p><p>Copy this token into the app (expires in 1 hour):</p><pre>${resetToken}</pre>`;

    try {
      await client.messages.create(domain, {
        from: `${fromName} <${fromAddr}>`,
        to: [address],
        subject,
        text,
        html,
      });
      this.logger.log(`Password reset email sent to ${address}`);
      return true;
    } catch (err) {
      this.logger.error(
        `Mailgun send failed for ${address} (sandbox: authorize recipient in Mailgun dashboard)`,
        err,
      );
      return false;
    }
  }
}
