export type InputType = 'date' | 'time' | 'number' | 'currency';

export type LocaleCode = 'zh-CN' | 'en-US' | 'ja-JP' | 'ar-SA';

export type ErrorType = 'format' | 'range' | 'invalid' | null;

export interface ParseResult {
  isValid: boolean;
  error: string | null;
  parsedValue: Date | number | null;
  errorType: ErrorType;
}

export interface ParsedCurrency {
  amount: number;
  currencyCode: string;
}

export const VALID_CURRENCIES = ['USD', 'EUR', 'JPY', 'CNY', 'GBP'] as const;
export type CurrencyCode = typeof VALID_CURRENCIES[number];

export const LOCALE_CONFIG: Record<LocaleCode, { name: string; timeZone: string }> = {
  'zh-CN': { name: '中文 (中国)', timeZone: 'Asia/Shanghai' },
  'en-US': { name: 'English (US)', timeZone: 'America/New_York' },
  'ja-JP': { name: '日本語 (日本)', timeZone: 'Asia/Tokyo' },
  'ar-SA': { name: 'العربية (السعودية)', timeZone: 'Asia/Riyadh' },
};

export const TIMEZONE_ABBR: Record<string, string> = {
  'Asia/Shanghai': 'CST',
  'America/New_York': 'EST',
  'Asia/Tokyo': 'JST',
  'Asia/Riyadh': 'AST',
};
