-- Adds the "casino" calendar event type.

alter table public.calendar_events
  drop constraint calendar_events_event_type_check;

alter table public.calendar_events
  add constraint calendar_events_event_type_check
  check (event_type in ('stream', 'casino', 'giveaway', 'tournament', 'special', 'other'));
