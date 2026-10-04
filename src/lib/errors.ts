import { t } from '@/locales'

export type AppErrorCode =
  'not_configured' | 'network' | 'rate_limited' | 'unauthorized' | 'validation' | 'unknown'

/** The single error type the UI deals with. Services convert everything into it. */
export class AppError extends Error {
  readonly code: AppErrorCode

  constructor(code: AppErrorCode, message?: string, options?: ErrorOptions) {
    super(message ?? code, options)
    this.name = 'AppError'
    this.code = code
  }
}

type ErrorLike = { code?: unknown; message?: unknown; status?: unknown }

function isErrorLike(value: unknown): value is ErrorLike {
  return typeof value === 'object' && value !== null
}

/** Maps Supabase / PostgREST / fetch failures onto an AppError code. */
function classify(error: ErrorLike): AppErrorCode {
  const code = typeof error.code === 'string' ? error.code : ''
  const message = typeof error.message === 'string' ? error.message : ''
  const status = typeof error.status === 'number' ? error.status : 0

  if (code === 'PT429' || status === 429 || message.includes('rate_limited')) return 'rate_limited'
  // 42501: insufficient privilege / RLS violation. PGRST301/302: JWT problems.
  if (code === '42501' || code === 'PGRST301' || code === 'PGRST302') return 'unauthorized'
  if (status === 401 || status === 403) return 'unauthorized'
  // 23xxx: integrity constraint violations. 22xxx: data exceptions.
  if (code.startsWith('23') || code.startsWith('22')) return 'validation'
  if (error instanceof TypeError || /failed to fetch|networkerror|load failed/i.test(message)) {
    return 'network'
  }
  return 'unknown'
}

export function toAppError(error: unknown): AppError {
  if (error instanceof AppError) return error
  if (!isErrorLike(error)) return new AppError('unknown', String(error))
  const message = typeof error.message === 'string' ? error.message : undefined
  return new AppError(classify(error), message, { cause: error })
}

/** Localised, user-safe message. Never exposes raw database error text. */
export function errorMessage(error: unknown): string {
  const { code } = toAppError(error)
  switch (code) {
    case 'not_configured':
      return t.errors.notConfigured
    case 'network':
      return t.errors.network
    case 'rate_limited':
      return t.errors.rateLimited
    case 'unauthorized':
      return t.errors.unauthorized
    case 'validation':
      return t.errors.validation
    default:
      return t.errors.unknown
  }
}
