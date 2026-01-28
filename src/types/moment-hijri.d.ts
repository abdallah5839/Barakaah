declare module 'moment-hijri' {
  import moment from 'moment';

  interface MomentHijri extends moment.Moment {
    iYear(): number;
    iMonth(): number;
    iDate(): number;
    iDay(): number;
    iDayOfYear(): number;
    iWeek(): number;
    iWeekYear(): number;
    iYear(y: number): MomentHijri;
    iMonth(M: number): MomentHijri;
    iDate(d: number): MomentHijri;
    format(format?: string): string;
  }

  function momentHijri(input?: moment.MomentInput, format?: string, strict?: boolean): MomentHijri;
  function momentHijri(input?: moment.MomentInput, format?: string, language?: string, strict?: boolean): MomentHijri;

  namespace momentHijri {
    export function iConvert(moment: moment.Moment): MomentHijri;
    export type Moment = MomentHijri;
  }

  export = momentHijri;
}
