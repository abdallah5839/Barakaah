/**
 * Offset Hijri — source unique de vérité
 * moment-hijri v3.0.0 (Umm al-Qura) affiche un jour de trop.
 * On soustrait HIJRI_DAY_OFFSET jours grégoriens avant la conversion.
 */

import moment from 'moment-hijri';
import momentTz from 'moment-timezone';
import { DEFAULT_COORDINATES } from '../constants';
import { SIMULATE_RAMADAN, SIMULATED_DATE } from '../config/devSimulation';

const DEFAULT_TIMEZONE = DEFAULT_COORDINATES.timezone || 'Africa/Abidjan';

export const HIJRI_DAY_OFFSET = 1;

export function getAdjustedHijriMoment(
  date: Date = new Date(),
  timezone: string = DEFAULT_TIMEZONE
): moment.Moment {
  // ⚠️ Simulation Ramadan — utilise la date simulée
  const effectiveDate = SIMULATE_RAMADAN ? SIMULATED_DATE : date;

  return moment(
    momentTz(effectiveDate).tz(timezone).subtract(HIJRI_DAY_OFFSET, 'days').toDate()
  );
}
