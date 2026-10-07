export class ApiError extends Error {
  readonly statusCode: number;
  readonly errorCode: string;

  constructor(statusCode: number, errorCode: string, message: string) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.errorCode = errorCode;
  }

  static unauthenticated(message: string) {
    return new ApiError(401, 'unauthenticated', message);
  }
  static permissionDenied(message: string) {
    return new ApiError(403, 'permission-denied', message);
  }
  static invalidArgument(message: string) {
    return new ApiError(400, 'invalid-argument', message);
  }
  static methodNotAllowed(message: string) {
    return new ApiError(405, 'method-not-allowed', message);
  }
  static upstream(message: string) {
    return new ApiError(502, 'upstream-error', message);
  }
  static internal(message: string) {
    return new ApiError(500, 'internal', message);
  }
}

export function errorBody(err: ApiError) {
  return { status: 'error' as const, error: { code: err.errorCode, message: err.message } };
}
