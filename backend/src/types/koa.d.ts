export interface AuthenticatedUser {
  sub: string;
  email: string;
}

declare module 'koa' {
  interface DefaultState {
    user: AuthenticatedUser;
  }
}
