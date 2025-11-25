import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class LoggerUtil {
  private logger: Logger;

  constructor(context: string = 'App') {
    this.logger = new Logger(context);
  }

  log(message: string) {
    this.logger.log(message);
  }

  error(message: string, stack?: string) {
    this.logger.error(message, stack);
  }

  warn(message: string) {
    this.logger.warn(message);
  }

  debug(message: string) {
    this.logger.debug(message);
  }

  maskPhone(phone: string): string {
    if (!phone || phone.length < 6) return '****';
    const start = phone.substring(0, 2);
    const end = phone.substring(phone.length - 2);
    return `${start}****${end}`;
  }

  maskEmail(email: string): string {
    if (!email) return '****';
    const [localPart, domain] = email.split('@');
    const masked = localPart.charAt(0) + '****' + localPart.charAt(localPart.length - 1);
    return `${masked}@${domain}`;
  }
}
