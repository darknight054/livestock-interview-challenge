import type { Request, Response, NextFunction } from 'express'
import { ZodError } from 'zod'
import { createApiResponse, createApiError } from '@livestock/shared'
import { HTTP_STATUS, ERROR_CODES } from '@livestock/shared'

export interface CustomError extends Error {
  statusCode?: number
  code?: string
}

export function errorHandler(
  error: CustomError | ZodError,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  console.error('Error:', error.message)

  // Handle Zod validation errors
  if (error instanceof ZodError) {
    const validationErrors = error.errors.map(err => ({
      field: err.path.join('.'),
      message: err.message
    }))

    res.status(HTTP_STATUS.BAD_REQUEST).json(
      createApiResponse(null, false, createApiError(
        ERROR_CODES.VALIDATION_ERROR,
        'Validation failed',
        { validationErrors }
      ))
    )
    return
  }

  // Handle custom application errors
  const statusCode = error.statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR
  const errorCode = error.code || ERROR_CODES.INTERNAL_SERVER_ERROR
  const message = error.message || 'An unexpected error occurred'

  res.status(statusCode).json(
    createApiResponse(null, false, createApiError(errorCode, message))
  )
}

// Helper function to create custom errors
export function createCustomError(
  message: string,
  statusCode: number,
  code?: string
): CustomError {
  const error = new Error(message) as CustomError
  error.statusCode = statusCode
  error.code = code
  return error
}

// Async error wrapper
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next)
  }
}