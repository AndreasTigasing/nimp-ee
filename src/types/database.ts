/*
 * Database types, hand-maintained to mirror supabase/migrations.
 *
 * The shape matches what `npx supabase gen types typescript` produces, so the
 * Supabase client is fully typed. When you change the schema, update this
 * file (or regenerate it) in the same commit.
 */

export type EventType = 'stream' | 'casino' | 'giveaway' | 'tournament' | 'special' | 'other'

export type SubmissionStatus = 'new' | 'read' | 'archived'

type OfferRow = {
  id: string
  title: string
  brand_name: string
  brand_logo: string | null
  short_description: string | null
  description: string | null
  image: string | null
  cta_text: string | null
  cta_url: string | null
  promo_code: string | null
  terms: string | null
  label: string | null
  valid_from: string | null
  valid_until: string | null
  show_validity: boolean
  show_after_expiry: boolean
  is_active: boolean
  sort_order: number
  archived_at: string | null
  created_at: string
  updated_at: string
}

type OfferInsert = {
  id?: string
  title: string
  brand_name: string
  brand_logo?: string | null
  short_description?: string | null
  description?: string | null
  image?: string | null
  cta_text?: string | null
  cta_url?: string | null
  promo_code?: string | null
  terms?: string | null
  label?: string | null
  valid_from?: string | null
  valid_until?: string | null
  show_validity?: boolean
  show_after_expiry?: boolean
  is_active?: boolean
  sort_order?: number
  archived_at?: string | null
}

type CalendarEventRow = {
  id: string
  title: string
  description: string | null
  brand_name: string | null
  brand_logo: string | null
  event_type: EventType
  start_at: string
  end_at: string | null
  color: string | null
  is_sponsored: boolean
  cta_url: string | null
  is_visible: boolean
  created_at: string
  updated_at: string
}

type CalendarEventInsert = {
  id?: string
  title: string
  description?: string | null
  brand_name?: string | null
  brand_logo?: string | null
  event_type?: EventType
  start_at: string
  end_at?: string | null
  color?: string | null
  is_sponsored?: boolean
  cta_url?: string | null
  is_visible?: boolean
}

type ContactSubmissionRow = {
  id: string
  name: string
  company: string | null
  email: string
  message: string
  status: SubmissionStatus
  notes: string | null
  created_at: string
  updated_at: string
}

type ContactSubmissionInsert = {
  name: string
  company?: string | null
  email: string
  message: string
}

type SiteSettingsRow = {
  id: boolean
  display_name: string | null
  tagline: string | null
  about_text: string | null
  tags: string[] | null
  profile_image_url: string | null
  business_email: string | null
  twitch_url: string | null
  instagram_url: string | null
  youtube_url: string | null
  tiktok_url: string | null
  discord_url: string | null
  facebook_url: string | null
  x_url: string | null
  steam_url: string | null
  hero_lead: string | null
  site_url: string | null
  twitch_cta_title: string | null
  footer_text: string | null
  theme_primary: string | null
  theme_accent: string | null
  theme_background: string | null
  theme_surface: string | null
  theme_text: string | null
  section_order: string[] | null
  hidden_sections: string[] | null
  twitch_embed_enabled: boolean | null
  header_action: string | null
  hero_show_twitch_button: boolean | null
  hero_show_collab_button: boolean | null
  hero_show_offers: boolean | null
  hero_show_next_event: boolean | null
  updated_at: string
}

type AdminUserRow = {
  user_id: string
  created_at: string
}

export type Database = {
  public: {
    Tables: {
      offers: {
        Row: OfferRow
        Insert: OfferInsert
        Update: Partial<OfferInsert>
        Relationships: []
      }
      calendar_events: {
        Row: CalendarEventRow
        Insert: CalendarEventInsert
        Update: Partial<CalendarEventInsert>
        Relationships: []
      }
      contact_submissions: {
        Row: ContactSubmissionRow
        Insert: ContactSubmissionInsert
        Update: { status?: SubmissionStatus; notes?: string | null }
        Relationships: []
      }
      site_settings: {
        Row: SiteSettingsRow
        Insert: never
        Update: Partial<Omit<SiteSettingsRow, 'id' | 'updated_at'>>
        Relationships: []
      }
      admin_users: {
        Row: AdminUserRow
        Insert: never
        Update: never
        Relationships: []
      }
    }
    Views: {
      live_offers: {
        Row: OfferRow
        Relationships: []
      }
    }
    Functions: {
      is_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      setup_required: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      claim_first_admin: {
        Args: { code: string }
        Returns: string
      }
    }
    Enums: { [_ in never]: never }
    CompositeTypes: { [_ in never]: never }
  }
}

type Tables = Database['public']['Tables']

export type Offer = Tables['offers']['Row']
export type OfferInput = Omit<Tables['offers']['Insert'], 'id' | 'archived_at'>

export type CalendarEvent = Tables['calendar_events']['Row']
export type CalendarEventInput = Omit<Tables['calendar_events']['Insert'], 'id'>

export type ContactSubmission = Tables['contact_submissions']['Row']
export type ContactSubmissionInput = Tables['contact_submissions']['Insert']

export type SiteSettings = Tables['site_settings']['Row']
export type SiteSettingsInput = Tables['site_settings']['Update']
