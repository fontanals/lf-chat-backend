import { createTransport, Transporter } from "nodemailer";
import { config } from "../config";

export type SendEmailOptions = {
  from: string;
  to: string;
  subject: string;
  content: string;
};

export interface IEmailService {
  sendEmail(options: SendEmailOptions): Promise<void>;
  close(): void;
}

export class EmailService implements IEmailService {
  private readonly transporter: Transporter;

  constructor() {
    this.transporter = createTransport({
      host: config.SMTP_HOST,
      port: config.SMTP_PORT,
      secure: config.SMTP_PORT === 465,
      auth: { user: config.SMTP_USER, pass: config.SMTP_PASSWORD },
      pool: true,
    });
  }

  async sendEmail(options: SendEmailOptions): Promise<void> {
    await this.transporter.sendMail({
      from: options.from,
      to: options.to,
      subject: options.subject,
      html: options.content,
    });
  }

  close() {
    this.transporter.close();
  }
}
