import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

@Injectable()
export class DeviceGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requireDevice = this.reflector.get<boolean>(
      'requireDevice',
      context.getHandler(),
    );

    if (!requireDevice) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // Device validation will be implemented in devices module
    // For now, just check if user exists
    if (!user || !user.id) {
      throw new ForbiddenException('Device validation failed');
    }

    return true;
  }
}
