import { ArrowDown, ArrowUp, Eye, EyeOff } from 'lucide-react'
import { buttonClasses } from '@/components/ui/button-styles'
import type { SectionSetting } from '@/config/types'
import { cn } from '@/lib/cn'
import { t } from '@/locales'

const copy = t.admin.settings.layout

type SectionOrderEditorProps = {
  sections: SectionSetting[]
  onChange: (sections: SectionSetting[]) => void
}

/**
 * Reorder and show / hide the home-page sections. Up / down buttons rather
 * than drag and drop: they work the same with a mouse, a keyboard and touch.
 */
export function SectionOrderEditor({ sections, onChange }: SectionOrderEditorProps) {
  function move(index: number, delta: -1 | 1) {
    const target = index + delta
    if (target < 0 || target >= sections.length) return
    const next = [...sections]
    const [moved] = next.splice(index, 1)
    if (moved) next.splice(target, 0, moved)
    onChange(next)
  }

  function toggle(index: number) {
    onChange(
      sections.map((section, i) =>
        i === index ? { ...section, visible: !section.visible } : section,
      ),
    )
  }

  return (
    <ol className="flex flex-col gap-2">
      {sections.map((section, index) => {
        const name = copy.names[section.id]
        return (
          <li
            key={section.id}
            className={cn(
              'flex items-center gap-3 rounded-control border border-line bg-bg/55 py-2 pr-2 pl-4',
              !section.visible && 'opacity-60',
            )}
          >
            <span className="w-5 text-sm font-bold text-subtle tabular-nums">{index + 1}.</span>
            <span
              className={cn('min-w-0 flex-1 font-semibold', !section.visible && 'line-through')}
            >
              {name}
            </span>

            <button
              type="button"
              onClick={() => toggle(index)}
              aria-pressed={section.visible}
              aria-label={`${name}: ${section.visible ? copy.visible : copy.hidden}`}
              className={buttonClasses({ variant: 'ghost', size: 'sm' })}
            >
              {section.visible ? (
                <Eye aria-hidden="true" className="size-4" />
              ) : (
                <EyeOff aria-hidden="true" className="size-4" />
              )}
              <span className="max-sm:sr-only">{section.visible ? copy.visible : copy.hidden}</span>
            </button>
            <button
              type="button"
              onClick={() => move(index, -1)}
              disabled={index === 0}
              aria-label={copy.moveUp(name)}
              className={buttonClasses({ variant: 'secondary', size: 'icon', className: 'size-9' })}
            >
              <ArrowUp aria-hidden="true" className="size-4" />
            </button>
            <button
              type="button"
              onClick={() => move(index, 1)}
              disabled={index === sections.length - 1}
              aria-label={copy.moveDown(name)}
              className={buttonClasses({ variant: 'secondary', size: 'icon', className: 'size-9' })}
            >
              <ArrowDown aria-hidden="true" className="size-4" />
            </button>
          </li>
        )
      })}
    </ol>
  )
}
