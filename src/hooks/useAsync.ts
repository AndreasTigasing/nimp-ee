import { useCallback, useEffect, useRef, useState } from 'react'
import { toAppError, type AppError } from '@/lib/errors'

type Settled<T> = {
  key: string
  requestId: string
  data?: T
  error?: AppError
}

export type AsyncState<T> = {
  /** Result for the current key. Kept while a reload of the same key is in flight. */
  data: T | undefined
  error: AppError | undefined
  isLoading: boolean
  reload: () => void
}

/**
 * Minimal data-fetching hook: runs `load` whenever `key` changes (or `reload`
 * is called), ignores stale responses and converts failures to `AppError`.
 *
 * `key` identifies WHAT is being loaded, e.g. `events:2026-10`. The loader
 * itself may be an inline closure — only the key triggers a new request.
 */
export function useAsync<T>(key: string, load: () => Promise<T>): AsyncState<T> {
  const loadRef = useRef(load)
  useEffect(() => {
    loadRef.current = load
  })

  const [attempt, setAttempt] = useState(0)
  const [settled, setSettled] = useState<Settled<T> | null>(null)
  const requestId = `${key}#${attempt}`

  useEffect(() => {
    let active = true

    loadRef.current().then(
      (data) => {
        if (active) setSettled({ key, requestId, data })
      },
      (error: unknown) => {
        if (active) setSettled({ key, requestId, error: toAppError(error) })
      },
    )

    return () => {
      active = false
    }
  }, [key, requestId])

  const reload = useCallback(() => setAttempt((count) => count + 1), [])

  const isCurrent = settled?.requestId === requestId
  const isSameKey = settled?.key === key

  return {
    data: isSameKey ? settled.data : undefined,
    error: isCurrent ? settled.error : undefined,
    isLoading: !isCurrent,
    reload,
  }
}
