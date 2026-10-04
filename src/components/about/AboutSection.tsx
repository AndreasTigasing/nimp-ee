import { ArrowRight, CalendarDays, Handshake, Tag, type LucideIcon } from 'lucide-react'
import { calendarAnchor, sectionHref } from '@/components/layout/nav'
import { isSectionVisible } from '@/config/sections'
import type { SectionSetting } from '@/config/types'
import { Section } from '@/components/layout/Section'
import { t } from '@/locales'
import { useSiteConfig } from '@/providers/site-config-context'

type Highlight = {
  anchor: string
  icon: LucideIcon
  title: string
  text: string
}

/** Shortcut cards to the other sections — only to those that are shown. */
function highlights(sections: SectionSetting[]): Highlight[] {
  const calendar = calendarAnchor(sections)
  return [
    isSectionVisible(sections, 'offers') && {
      anchor: t.anchors.offers,
      icon: Tag,
      ...t.about.highlights.offers,
    },
    calendar && { anchor: calendar, icon: CalendarDays, ...t.about.highlights.calendar },
    isSectionVisible(sections, 'collaboration') && {
      anchor: t.anchors.collaboration,
      icon: Handshake,
      ...t.about.highlights.collaboration,
    },
  ].filter((item): item is Highlight => Boolean(item))
}

export function AboutSection() {
  const { config } = useSiteConfig()
  const paragraphs = config.aboutText
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)

  return (
    <Section
      id={t.anchors.about}
      eyebrow={t.about.eyebrow}
      title={t.about.title(config.displayName)}
    >
      <div className="grid gap-10 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:gap-16">
        <div className="max-w-2xl space-y-4 text-base leading-relaxed text-muted sm:text-lg">
          {paragraphs.map((paragraph) => (
            <p key={paragraph} className="whitespace-pre-line">
              {paragraph}
            </p>
          ))}
        </div>

        <ul className="grid gap-3">
          {highlights(config.sections).map(({ anchor, icon: Icon, title, text }) => (
            <li key={anchor}>
              <a
                href={sectionHref(anchor)}
                className="group flex items-center gap-4 rounded-card border border-line bg-surface p-4 transition duration-200 hover:-translate-y-0.5 hover:border-line-strong sm:p-5"
              >
                <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-primary/14 text-primary-soft">
                  <Icon aria-hidden="true" className="size-6" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-display text-base font-semibold">{title}</span>
                  <span className="mt-0.5 block text-sm text-muted">{text}</span>
                </span>
                <ArrowRight
                  aria-hidden="true"
                  className="size-5 shrink-0 text-subtle transition group-hover:translate-x-1 group-hover:text-fg"
                />
              </a>
            </li>
          ))}
        </ul>
      </div>
    </Section>
  )
}
