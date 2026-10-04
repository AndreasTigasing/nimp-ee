import { env } from '@/config/env'
import { AppError, toAppError } from '@/lib/errors'
import { getSupabase } from '@/lib/supabase'

export const MAX_IMAGE_BYTES = 2 * 1024 * 1024

/** Mirrors the bucket's allowed_mime_types in the migration. */
const EXTENSION_BY_TYPE: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/svg+xml': 'svg',
  'image/avif': 'avif',
}

export const ACCEPTED_IMAGE_TYPES = Object.keys(EXTENSION_BY_TYPE).join(',')

export type MediaFolder = 'offers' | 'events' | 'site'

export type ImageRejection = 'type' | 'size'

export function validateImage(file: File): ImageRejection | null {
  if (!(file.type in EXTENSION_BY_TYPE)) return 'type'
  if (file.size > MAX_IMAGE_BYTES) return 'size'
  return null
}

/** Uploads an image to the public media bucket (admin only) and returns its public URL. */
export async function uploadImage(file: File, folder: MediaFolder): Promise<string> {
  const extension = EXTENSION_BY_TYPE[file.type]
  if (!extension || validateImage(file)) throw new AppError('validation', 'Unsupported image')

  const supabase = await getSupabase()
  const bucket = supabase.storage.from(env.mediaBucket)
  const path = `${folder}/${crypto.randomUUID()}.${extension}`

  const { error } = await bucket.upload(path, file, {
    contentType: file.type,
    // File names are unique and never overwritten, so they can be cached for a year.
    cacheControl: '31536000',
    upsert: false,
  })
  if (error) throw toAppError(error)

  return bucket.getPublicUrl(path).data.publicUrl
}
