import { Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';

export function validateBody<T>(schema: ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const first = result.error.errors[0];
      const message = first
        ? first.path.length
          ? `${first.path.join('.')}: ${first.message}`
          : first.message
        : 'Validation failed';
      return res.status(400).json({
        success: false,
        error: message,
        details: result.error.errors,
      });
    }
    req.body = result.data;
    next();
  };
}
