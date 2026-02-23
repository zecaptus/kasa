export interface AuthenticatedUser {
  sub: string;
  email: string;
}

export interface UploadedFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

declare module 'koa' {
  interface DefaultState {
    user: AuthenticatedUser;
  }
  interface Request {
    file?: UploadedFile;
  }
}
