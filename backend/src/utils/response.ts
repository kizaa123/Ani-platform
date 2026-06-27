import { AppError } from '../utils/errors';
import { toAppError } from '../utils/prisma-errors';

export class ApiResponse {
  static success<T>(res: import('express').Response, data: T, status = 200) {
    return res.status(status).json({ success: true, data });
  }

  static created<T>(res: import('express').Response, data: T) {
    return this.success(res, data, 201);
  }

  static error(res: import('express').Response, error: unknown) {
    const appError = toAppError(error);
    if (!(error instanceof AppError)) {
      console.error(error);
    }
    return res.status(appError.statusCode).json({
      success: false,
      error: appError.message,
      code: appError.code,
    });
  }
}
