import type { LocaleCode } from '../types';
import { LOCALE_CONFIG, TIMEZONE_ABBR } from '../types';

export function convertDate(date: Date, locale: LocaleCode): string {
  try {
    const config = LOCALE_CONFIG[locale];
    return new Intl.DateTimeFormat(locale, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      timeZone: config.timeZone,
    }).format(date);
  } catch {
    return '—';
  }
}

export function convertTime(totalSeconds: number, locale: LocaleCode): string {
  try {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    const date = new Date();
    date.setHours(hours, minutes, seconds, 0);

    const config = LOCALE_CONFIG[locale];
    const timeStr = new Intl.DateTimeFormat(locale, {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
      timeZone: config.timeZone,
    }).format(date);

    const tzAbbr = TIMEZONE_ABBR[config.timeZone] || config.timeZone;
    return `${timeStr} ${tzAbbr}`;
  } catch {
    return '—';
  }
}

export function convertNumber(num: number, locale: LocaleCode): string {
  try {
    return new Intl.NumberFormat(locale, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(num);
  } catch {
    return '—';
  }
}

export function convertCurrency(
  amount: number,
  currencyCode: string,
  locale: LocaleCode
): string {
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return '—';
  }
}

export interface ConvertedResult {
  date: string;
  time: string;
  number: string;
  currency: string;
}

export function convertAllForLocale(
  dateValue: Date | null,
  timeValue: number | null,
  numberValue: number | null,
  currencyValue: { amount: number; currencyCode: string } | null,
  locale: LocaleCode
): ConvertedResult {
  return {
    date: dateValue ? convertDate(dateValue, locale) : '—',
    time: timeValue !== null ? convertTime(timeValue, locale) : '—',
    number: numberValue !== null ? convertNumber(numberValue, locale) : '—',
    currency: currencyValue
      ? convertCurrency(currencyValue.amount, currencyValue.currencyCode, locale)
      : '—',
  };
}
