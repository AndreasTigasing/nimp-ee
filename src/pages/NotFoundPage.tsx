import { ArrowLeft } from 'lucide-react'
import { Layout } from '@/components/layout/Layout'
import { ButtonLink } from '@/components/ui/Button'
import { usePageMeta } from '@/hooks/usePageMeta'
import { t } from '@/locales'
import { useSiteConfig } from '@/providers/site-config-context'

export function NotFoundPage() {
  const { config } = useSiteConfig()
  usePageMeta({ title: `${t.notFound.title} – ${config.name}`, noIndex: true })

  return (
    <Layout>
      <section className="container-page flex min-h-[60dvh] flex-col items-center justify-center py-20 text-center">
        <p className="font-display text-7xl font-extrabold tracking-tight text-primary-soft">404</p>
        <h1 className="mt-4 font-display text-2xl font-bold sm:text-3xl">{t.notFound.title}</h1>
        <p className="mt-3 max-w-md text-muted">{t.notFound.text}</p>
        <ButtonLink href={import.meta.env.BASE_URL} variant="secondary" className="mt-8">
          <ArrowLeft aria-hidden="true" className="size-4" />
          {t.common.backHome}
        </ButtonLink>
      </section>
    </Layout>
  )
}
