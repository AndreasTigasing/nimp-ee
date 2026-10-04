import { ImageOff, Trash2, Upload } from 'lucide-react'
import { useId, useRef, useState, type ChangeEvent } from 'react'
import { Button } from '@/components/ui/Button'
import { controlClasses } from '@/components/ui/Field'
import { cn } from '@/lib/cn'
import { errorMessage } from '@/lib/errors'
import { safeUrl } from '@/lib/url'
import { t } from '@/locales'
import {
  ACCEPTED_IMAGE_TYPES,
  uploadImage,
  validateImage,
  type MediaFolder,
} from '@/services/media'

const copy = t.admin.image

type ImageFieldProps = {
  label: string
  /** Image URL (empty string = no image). */
  value: string
  onChange: (value: string) => void
  /** Storage folder uploads go to. */
  folder: MediaFolder
  error?: string
  /** Shown as the input placeholder, e.g. the default the empty value falls back to. */
  placeholder?: string
  className?: string
}

/** Image picker: paste a URL or upload a file to the public media bucket. */
export function ImageField({
  label,
  value,
  onChange,
  folder,
  error,
  placeholder,
  className,
}: ImageFieldProps) {
  const id = useId()
  const fileInput = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)

  const preview = safeUrl(value)
  const message = error ?? uploadError

  async function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    // Reset so choosing the same file again still fires a change event.
    event.target.value = ''
    if (!file) return

    const rejection = validateImage(file)
    if (rejection) {
      setUploadError(rejection === 'size' ? copy.tooLarge : copy.wrongType)
      return
    }

    setUploading(true)
    setUploadError(null)
    try {
      onChange(await uploadImage(file, folder))
    } catch (caught) {
      setUploadError(`${copy.uploadFailed} ${errorMessage(caught)}`)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className={cn('flex min-w-0 flex-col gap-1.5', className)}>
      <label htmlFor={id} className="text-sm font-semibold">
        {label}
        <span className="ml-1.5 font-normal text-subtle">({t.common.optional})</span>
      </label>

      <div className="flex items-stretch gap-3">
        <div className="grid size-12 shrink-0 place-items-center overflow-hidden rounded-control border border-line-strong bg-bg/55 text-subtle">
          {preview ? (
            <img src={preview} alt={copy.previewAlt} className="size-full object-cover" />
          ) : (
            <ImageOff aria-hidden="true" className="size-5" />
          )}
        </div>

        <input
          id={id}
          type="url"
          inputMode="url"
          value={value}
          placeholder={placeholder ?? copy.urlPlaceholder}
          aria-invalid={message ? true : undefined}
          aria-describedby={`${id}-help`}
          onChange={(event) => {
            setUploadError(null)
            onChange(event.target.value)
          }}
          className={cn(controlClasses, 'h-12 min-w-0 flex-1')}
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <input
          ref={fileInput}
          type="file"
          accept={ACCEPTED_IMAGE_TYPES}
          onChange={(event) => void handleFile(event)}
          className="sr-only"
          tabIndex={-1}
          aria-hidden="true"
        />
        <Button
          variant="secondary"
          size="sm"
          loading={uploading}
          onClick={() => fileInput.current?.click()}
        >
          {!uploading && <Upload aria-hidden="true" className="size-4" />}
          {uploading ? copy.uploading : copy.upload}
        </Button>
        {value !== '' && (
          <Button variant="ghost" size="sm" onClick={() => onChange('')}>
            <Trash2 aria-hidden="true" className="size-4" />
            {copy.remove}
          </Button>
        )}
      </div>

      <p
        id={`${id}-help`}
        className={cn('text-xs', message ? 'font-medium text-danger' : 'text-subtle')}
      >
        {message ?? copy.hint}
      </p>
    </div>
  )
}
