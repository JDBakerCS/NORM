export function notFoundHandler(request, response) {
  response.status(404).json({
    error: {
      message: `Route ${request.method} ${request.originalUrl} was not found`,
      code: 'NOT_FOUND',
      details: null,
    },
  });
}

export function errorHandler(error, request, response, next) {
  if (response.headersSent) return next(error);

  const statusCode = error.statusCode || 500;
  const message =
    statusCode >= 500 && process.env.NODE_ENV === 'production'
      ? 'An unexpected error occurred'
      : error.message || 'An unexpected error occurred';

  if (statusCode >= 500 && process.env.NODE_ENV !== 'test') {
    console.error(`[${error.code || 'INTERNAL_ERROR'}] ${error.message}`);
  }

  return response.status(statusCode).json({
    error: { message, code: error.code || 'INTERNAL_ERROR', details: error.details ?? null },
  });
}
