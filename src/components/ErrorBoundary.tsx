import { Component, type ErrorInfo, type ReactNode } from 'react'
import { buttonClasses } from '@/components/ui/button-styles'
import { t } from '@/locales'

type Props = { children: ReactNode }
type State = { hasError: boolean }

/** Last line of defence: a rendering bug shows a recoverable message, never a blank page. */
export class ErrorBoundary extends Component<Props, State> {
  override state: State = { hasError: false }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('Unhandled rendering error', error, info.componentStack)
  }

  override render(): ReactNode {
    if (!this.state.hasError) return this.props.children

    return (
      <main
        role="alert"
        className="flex min-h-dvh flex-col items-center justify-center px-6 text-center"
      >
        <h1 className="font-display text-2xl font-bold">{t.errors.boundaryTitle}</h1>
        <p className="mt-3 text-muted">{t.errors.boundaryText}</p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className={buttonClasses({ variant: 'secondary', className: 'mt-8' })}
        >
          {t.errors.reload}
        </button>
      </main>
    )
  }
}
