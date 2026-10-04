import { useCallback, useState } from 'react'
import { useToast } from '@/components/ui/toast-context'
import { errorMessage } from '@/lib/errors'

/**
 * Runs a one-click admin mutation (toggle, restore…) with consistent feedback:
 * tracks which row is busy, shows a success / error toast and then calls
 * `onDone` (typically a list reload).
 */
export function useAdminAction(onDone: () => void) {
  const toast = useToast()
  const [busyId, setBusyId] = useState<string | null>(null)

  const run = useCallback(
    async (id: string, action: () => Promise<unknown>, successMessage: string) => {
      setBusyId(id)
      try {
        await action()
        toast.success(successMessage)
        onDone()
      } catch (error) {
        toast.error(errorMessage(error))
      } finally {
        setBusyId(null)
      }
    },
    [toast, onDone],
  )

  return { busyId, run }
}
