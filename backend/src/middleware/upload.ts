import type { UploadedFile } from '../types/koa.js';

// biome-ignore lint/suspicious/noExplicitAny: @koa/multer v4 ships no TypeScript declarations
const multer: any = require('@koa/multer'); // eslint-disable-line @typescript-eslint/no-explicit-any

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

export const uploadMiddleware = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (
    _req: unknown,
    file: UploadedFile,
    cb: (err: Error | null, accept?: boolean) => void,
  ) => {
    if (
      file.mimetype === 'text/csv' ||
      file.mimetype === 'application/vnd.ms-excel' ||
      file.mimetype === 'text/plain' ||
      file.originalname.endsWith('.csv')
    ) {
      cb(null, true);
    } else {
      cb(new Error('INVALID_FILE_TYPE'));
    }
  },
}).single('file');
