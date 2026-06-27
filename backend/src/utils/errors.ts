export class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public code?: string
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export function assertFound<T>(value: T | null | undefined, message: string): T {
  if (!value) throw new AppError(404, message, 'NOT_FOUND');
  return value;
}

export function assertAuthorized(condition: boolean, message = 'Forbidden'): void {
  if (!condition) throw new AppError(403, message, 'FORBIDDEN');
}
