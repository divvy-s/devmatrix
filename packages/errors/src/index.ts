export class AppError extends Error {
  public code: string;
  public statusCode: number;
  public field?: string;

  constructor(message: string, code: string, statusCode: number, field?: string) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.statusCode = statusCode;
    this.field = field;
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON(trace_id?: string) {
    return {
      error: {
        code: this.code,
        message: this.message,
        ...(this.field ? { field: this.field } : {}),
        ...(trace_id ? { trace_id } : {}),
      },
    };
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, id: string | number) {
    super(`${resource} with id ${id} was not found`, 'NOT_FOUND', 404);
  }
}

export class ForbiddenError extends AppError {
  constructor(action: string) {
    super(`Not allowed to perform action: ${action}`, 'FORBIDDEN', 403);
  }
}

export class UnauthorizedError extends AppError {
  constructor(reason: string) {
    super(`Unauthorized: ${reason}`, 'UNAUTHORIZED', 401);
  }
}

export class ConflictError extends AppError {
  constructor(resource: string, field: string) {
    super(`Conflict on ${resource}: ${field} already exists or is in conflict`, 'CONFLICT', 409, field);
  }
}

export class ValidationError extends AppError {
  constructor(field: string, message: string) {
    super(`Validation failed for ${field}: ${message}`, 'VALIDATION_ERROR', 400, field);
  }
}

export class RateLimitError extends AppError {
  public retryAfterSeconds: number;

  constructor(retryAfterSeconds: number) {
    super('Too many requests, please try again later.', 'RATE_LIMITED', 429);
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

export class BusinessError extends AppError {
  constructor(code: string, message: string) {
    super(message, code, 400);
  }
}
