import { et as dateFnsEt } from 'date-fns/locale/et'
import { et, type Messages } from './et'

/*
 * Active locale. To ship the template in another language, add a sibling file
 * that satisfies `Messages` and switch both exports below.
 */
export const t: Messages = et

/** date-fns locale: month / weekday names and the first day of the week. */
export const dateLocale = dateFnsEt
