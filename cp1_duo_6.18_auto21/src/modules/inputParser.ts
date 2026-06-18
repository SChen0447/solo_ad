import type { ParseResult, ParsedCurrency } from '../types';
import { VALID_CURRENCIES } from '../types';

function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
}

function getDaysInMonth(year: number, month: number): number {
  const daysInMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  if (month === 2 && isLeapYear(year)) {
    return 29;
  }
  return daysInMonth[month - 1];
}

export function parseDate(input: string): ParseResult {
  if (!input || input.trim() === '') {
    return { isValid: false, error: null, parsedValue: null, errorType: null };
  }

  const trimmed = input.trim();
  const dateRegex = /^(\d{4})-(\d{2})-(\d{2})$/;
  const match = trimmed.match(dateRegex);

  if (!match) {
    return {
      isValid: false,
      error: '日期格式无效，请使用 YYYY-MM-DD 格式',
      parsedValue: null,
      errorType: 'format',
    };
  }

  const year = parseInt(match[1], 10);
  const month = parseInt(match[2], 10);
  const day = parseInt(match[3], 10);

  if (month < 1 || month > 12) {
    return {
      isValid: false,
      error: '月份必须在 01-12 之间',
      parsedValue: null,
      errorType: 'range',
    };
  }

  const maxDays = getDaysInMonth(year, month);
  if (day < 1 || day > maxDays) {
    return {
      isValid: false,
      error: `日期无效，${year}年${month}月最多有 ${maxDays} 天`,
      parsedValue: null,
      errorType: 'range',
    };
  }

  const date = new Date(year, month - 1, day);
  if (isNaN(date.getTime())) {
    return {
      isValid: false,
      error: '日期无效',
      parsedValue: null,
      errorType: 'invalid',
    };
  }

  return {
    isValid: true,
    error: null,
    parsedValue: date,
    errorType: null,
  };
}

export function parseTime(input: string): ParseResult {
  if (!input || input.trim() === '') {
    return { isValid: false, error: null, parsedValue: null, errorType: null };
  }

  const trimmed = input.trim();
  const timeRegex = /^(\d{2}):(\d{2}):(\d{2})$/;
  const match = trimmed.match(timeRegex);

  if (!match) {
    return {
      isValid: false,
      error: '时间格式无效，请使用 HH:mm:ss 格式',
      parsedValue: null,
      errorType: 'format',
    };
  }

  const hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const seconds = parseInt(match[3], 10);

  if (hours < 0 || hours > 23) {
    return {
      isValid: false,
      error: '小时必须在 00-23 之间',
      parsedValue: null,
      errorType: 'range',
    };
  }

  if (minutes < 0 || minutes > 59) {
    return {
      isValid: false,
      error: '分钟必须在 00-59 之间',
      parsedValue: null,
      errorType: 'range',
    };
  }

  if (seconds < 0 || seconds > 59) {
    return {
      isValid: false,
      error: '秒必须在 00-59 之间',
      parsedValue: null,
      errorType: 'range',
    };
  }

  const totalSeconds = hours * 3600 + minutes * 60 + seconds;

  return {
    isValid: true,
    error: null,
    parsedValue: totalSeconds,
    errorType: null,
  };
}

export function parseNumber(input: string): ParseResult {
  if (!input || input.trim() === '') {
    return { isValid: false, error: null, parsedValue: null, errorType: null };
  }

  const trimmed = input.trim();
  const cleanInput = trimmed.replace(/,/g, '');

  const numberRegex = /^-?\d+(\.\d{0,2})?$/;
  if (!numberRegex.test(cleanInput)) {
    return {
      isValid: false,
      error: '数字格式无效，仅支持整数或小数点后两位',
      parsedValue: null,
      errorType: 'format',
    };
  }

  const invalidCharRegex = /[^0-9.\-]/;
  if (invalidCharRegex.test(cleanInput)) {
    return {
      isValid: false,
      error: '含有非法字符，仅支持数字、小数点和负号',
      parsedValue: null,
      errorType: 'format',
    };
  }

  const num = parseFloat(cleanInput);
  if (isNaN(num)) {
    return {
      isValid: false,
      error: '数字无效',
      parsedValue: null,
      errorType: 'invalid',
    };
  }

  return {
    isValid: true,
    error: null,
    parsedValue: num,
    errorType: null,
  };
}

export function parseCurrency(input: string): ParseResult & { parsedCurrency?: ParsedCurrency } {
  if (!input || input.trim() === '') {
    return { isValid: false, error: null, parsedValue: null, errorType: null };
  }

  const trimmed = input.trim();
  const currencyRegex = /^(.+?)\s+([A-Z]{3})$/;
  const match = trimmed.match(currencyRegex);

  if (!match) {
    return {
      isValid: false,
      error: '货币格式无效，请使用 "金额 货币代码" 格式，如 123.45 USD',
      parsedValue: null,
      errorType: 'format',
    };
  }

  const amountStr = match[1].replace(/,/g, '');
  const currencyCode = match[2];

  const amountRegex = /^-?\d+(\.\d{0,2})?$/;
  if (!amountRegex.test(amountStr)) {
    return {
      isValid: false,
      error: '金额格式无效，仅支持数字和小数点后两位',
      parsedValue: null,
      errorType: 'format',
    };
  }

  const amount = parseFloat(amountStr);
  if (isNaN(amount)) {
    return {
      isValid: false,
      error: '金额无效',
      parsedValue: null,
      errorType: 'invalid',
    };
  }

  if (!VALID_CURRENCIES.includes(currencyCode as typeof VALID_CURRENCIES[number])) {
    return {
      isValid: false,
      error: `货币代码无效，支持的货币：${VALID_CURRENCIES.join(', ')}`,
      parsedValue: null,
      errorType: 'invalid',
    };
  }

  return {
    isValid: true,
    error: null,
    parsedValue: amount,
    errorType: null,
    parsedCurrency: { amount, currencyCode },
  };
}

export function autoCompleteDate(input: string): string {
  const digits = input.replace(/\D/g, '');
  let result = '';

  if (digits.length >= 4) {
    result += digits.slice(0, 4);
  } else {
    return digits;
  }

  if (digits.length >= 6) {
    result += '-' + digits.slice(4, 6);
  } else if (digits.length > 4) {
    result += '-' + digits.slice(4);
    return result;
  } else {
    return result;
  }

  if (digits.length >= 8) {
    result += '-' + digits.slice(6, 8);
  } else if (digits.length > 6) {
    result += '-' + digits.slice(6);
  }

  return result;
}

export function autoCompleteTime(input: string): string {
  const digits = input.replace(/\D/g, '');
  let result = '';

  if (digits.length >= 2) {
    result += digits.slice(0, 2);
  } else {
    return digits;
  }

  if (digits.length >= 4) {
    result += ':' + digits.slice(2, 4);
  } else if (digits.length > 2) {
    result += ':' + digits.slice(2);
    return result;
  } else {
    return result;
  }

  if (digits.length >= 6) {
    result += ':' + digits.slice(4, 6);
  } else if (digits.length > 4) {
    result += ':' + digits.slice(4);
  }

  return result;
}
