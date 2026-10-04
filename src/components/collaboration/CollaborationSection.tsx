import { Check, Mail } from 'lucide-react'
import { Section } from '@/components/layout/Section'
import { isEmail } from '@/lib/validation'
import { t } from '@/locales'
import { useSiteConfig } from '@/providers/site-config-context'
import { ContactForm } from './ContactForm'

export function CollaborationSection() {
  const { config } = useSiteConfig()
  const email = isEmail(config.businessEmail) ? config.businessEmail : null

  return (
    <Section
      id={t.anchors.collaboration}
      eyebrow={t.collaboration.eyebrow}
      title={t.collaboration.title}
    >
      <div className="grid items-start gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:gap-16">
        <div className="min-w-0">
          <p className="max-w-xl text-base leading-relaxed text-muted sm:text-lg">
            {t.collaboration.lead}
          </p>

          <p className="mt-8 text-xs font-bold tracking-[0.16em] text-subtle uppercase">
            {t.collaboration.examplesTitle}
          </p>
          <ul className="mt-4 flex flex-col gap-3">
            {t.collaboration.examples.map((example) => (
              <li key={example} className="flex items-center gap-3 font-semibold">
                <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-accent/14 text-accent-soft">
                  <Check aria-hidden="true" className="size-4" />
                </span>
                {example}
              </li>
            ))}
          </ul>

          {email && (
            <div className="mt-10 border-t border-line pt-6">
              <p className="text-xs font-bold tracking-[0.16em] text-subtle uppercase">
                {t.collaboration.emailLabel}
              </p>
              <a
                href={`mailto:${email}`}
                className="mt-2 inline-flex items-center gap-2.5 text-lg font-bold break-all transition-colors hover:text-primary-soft"
              >
                <Mail aria-hidden="true" className="size-5 shrink-0 text-primary-soft" />
                {email}
              </a>
            </div>
          )}
        </div>

        <div className="relative rounded-card border border-line bg-surface p-5 shadow-card sm:p-8">
          <h3 className="mb-6 font-display text-lg font-semibold">{t.collaboration.form.title}</h3>
          <ContactForm />
        </div>
      </div>
    </Section>
  )
}
