import type { Request } from "express";

export const SESSION_COOKIE_NAME = "credence_session";

export type AuthenticatedUser = {
  walletAddress: string;
};

export type AuthenticatedRequest = Request & {
  user: AuthenticatedUser;
};

export type OptionalAuthenticatedRequest = Request & {
  user?: AuthenticatedUser;
};
