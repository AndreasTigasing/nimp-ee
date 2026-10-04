import { t } from '@/locales'
import { claimFirstAdmin } from '@/services/auth'
import { AccountForm, type RedeemProblem } from '../components/AccountForm'

const copy = t.admin.setup.account

async function redeemSetupCode(code: string): Promise<RedeemProblem | null> {
  const result = await claimFirstAdmin(code)
  if (result === 'ok') return null
  if (result === 'invalid_code') return { message: copy.errors.invalidCode, onCode: true }
  if (result === 'already_done') return { message: copy.errors.alreadyDone, offerLogin: true }
  return { message: t.errors.unknown }
}

/** Step 1 of the first-run setup: the owner's account, guarded by the one-time setup code. */
export function AccountStep({ onDone }: { onDone: () => void }) {
  return (
    <AccountForm
      codeLabel={copy.code}
      codeHint={copy.codeHint}
      codePlaceholder={copy.codePlaceholder}
      submitLabel={copy.submit}
      submittingLabel={copy.submitting}
      redeem={redeemSetupCode}
      onDone={onDone}
    />
  )
}
