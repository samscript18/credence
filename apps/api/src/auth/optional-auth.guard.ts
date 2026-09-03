import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";

import { AuthService } from "./auth.service.js";
import type { OptionalAuthenticatedRequest } from "./auth.types.js";
import { SESSION_COOKIE_NAME } from "./auth.types.js";

@Injectable()
export class OptionalAuthGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<OptionalAuthenticatedRequest>();
    const token = request.cookies?.[SESSION_COOKIE_NAME] as string | undefined;
    if (!token) return true;
    try {
      request.user = await this.authService.decodeSession(token);
    } catch {
      request.user = undefined;
    }
    return true;
  }
}
