import { AppError, toAppError } from '@/lib/errors'

type DataResult<T> = { data: T | null; error: unknown }
type CountResult = { count: number | null; error: unknown }

/** Returns the data of a Supabase response or throws a typed AppError. */
export function unwrap<T>({ data, error }: DataResult<T>): T {
  if (error) throw toAppError(error)
  if (data === null) throw new AppError('unknown', 'Empty response')
  return data
}

/** For writes that return nothing: throws a typed AppError on failure. */
export function assertOk({ error }: { error: unknown }): void {
  if (error) throw toAppError(error)
}

export function unwrapCount({ count, error }: CountResult): number {
  if (error) throw toAppError(error)
  return count ?? 0
}
