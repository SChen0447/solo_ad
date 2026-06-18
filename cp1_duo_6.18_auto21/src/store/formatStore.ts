import { create } from 'zustand';
import type { LocaleCode, ParseResult, ParsedCurrency } from '../types';
import { LOCALE_CONFIG } from '../types';
import { parseDate, parseTime, parseNumber, parseCurrency } from '../modules/inputParser';
import { convertAllForLocale, type ConvertedResult } from '../modules/localeConverter';

interface ValidationState {
  date: ParseResult;
  time: ParseResult;
  number: ParseResult;
  currency: ParseResult & { parsedCurrency?: ParsedCurrency };
}

interface InputState {
  date: string;
  time: string;
  number: string;
  currency: string;
}

interface ParsedValues {
  date: Date | null;
  time: number | null;
  number: number | null;
  currency: ParsedCurrency | null;
}

type ConvertedResults = Record<LocaleCode, ConvertedResult>;

interface FormatStore {
  inputs: InputState;
  validation: ValidationState;
  parsedValues: ParsedValues;
  convertedResults: ConvertedResults;
  setDate: (value: string) => void;
  setTime: (value: string) => void;
  setNumber: (value: string) => void;
  setCurrency: (value: string) => void;
}

const initialInputs: InputState = {
  date: '',
  time: '',
  number: '',
  currency: '',
};

const initialValidation: ValidationState = {
  date: { isValid: false, error: null, parsedValue: null, errorType: null },
  time: { isValid: false, error: null, parsedValue: null, errorType: null },
  number: { isValid: false, error: null, parsedValue: null, errorType: null },
  currency: { isValid: false, error: null, parsedValue: null, errorType: null },
};

const initialParsedValues: ParsedValues = {
  date: null,
  time: null,
  number: null,
  currency: null,
};

const initialConvertedResults: ConvertedResults = {
  'zh-CN': { date: '—', time: '—', number: '—', currency: '—' },
  'en-US': { date: '—', time: '—', number: '—', currency: '—' },
  'ja-JP': { date: '—', time: '—', number: '—', currency: '—' },
  'ar-SA': { date: '—', time: '—', number: '—', currency: '—' },
};

let debounceTimer: ReturnType<typeof setTimeout> | null = null;
let rafId: number | null = null;

function scheduleConversion(
  parsedValues: ParsedValues,
  set: (state: Partial<FormatStore>) => void,
  get: () => FormatStore
): void {
  if (debounceTimer) {
    clearTimeout(debounceTimer);
  }

  debounceTimer = setTimeout(() => {
    if (rafId) {
      cancelAnimationFrame(rafId);
    }

    const currentParsed = get().parsedValues;
    const mergedParsed = { ...currentParsed, ...parsedValues };

    const locales: LocaleCode[] = ['zh-CN', 'en-US', 'ja-JP', 'ar-SA'];
    const results: Partial<ConvertedResults> = {};
    let currentIndex = 0;

    function processNext() {
      if (currentIndex >= locales.length) {
        return;
      }

      const locale = locales[currentIndex];
      results[locale] = convertAllForLocale(
        mergedParsed.date,
        mergedParsed.time,
        mergedParsed.number,
        mergedParsed.currency,
        locale
      );

      set({
        convertedResults: {
          ...initialConvertedResults,
          ...results,
        },
      });

      currentIndex++;
      if (currentIndex < locales.length) {
        rafId = requestAnimationFrame(processNext);
      }
    }

    rafId = requestAnimationFrame(processNext);
  }, 100);
}

export const useFormatStore = create<FormatStore>((set, get) => ({
  inputs: initialInputs,
  validation: initialValidation,
  parsedValues: initialParsedValues,
  convertedResults: initialConvertedResults,

  setDate: (value: string) => {
    const validation = parseDate(value);
    const parsedValue = validation.isValid ? (validation.parsedValue as Date) : null;

    set((state) => ({
      inputs: { ...state.inputs, date: value },
      validation: { ...state.validation, date: validation },
      parsedValues: { ...state.parsedValues, date: parsedValue },
    }));

    scheduleConversion({ date: parsedValue } as ParsedValues, set, get);
  },

  setTime: (value: string) => {
    const validation = parseTime(value);
    const parsedValue = validation.isValid ? (validation.parsedValue as number) : null;

    set((state) => ({
      inputs: { ...state.inputs, time: value },
      validation: { ...state.validation, time: validation },
      parsedValues: { ...state.parsedValues, time: parsedValue },
    }));

    scheduleConversion({ time: parsedValue } as ParsedValues, set, get);
  },

  setNumber: (value: string) => {
    const validation = parseNumber(value);
    const parsedValue = validation.isValid ? (validation.parsedValue as number) : null;

    set((state) => ({
      inputs: { ...state.inputs, number: value },
      validation: { ...state.validation, number: validation },
      parsedValues: { ...state.parsedValues, number: parsedValue },
    }));

    scheduleConversion({ number: parsedValue } as ParsedValues, set, get);
  },

  setCurrency: (value: string) => {
    const validation = parseCurrency(value);
    const parsedValue = validation.isValid && validation.parsedCurrency
      ? validation.parsedCurrency
      : null;

    set((state) => ({
      inputs: { ...state.inputs, currency: value },
      validation: { ...state.validation, currency: validation },
      parsedValues: { ...state.parsedValues, currency: parsedValue },
    }));

    scheduleConversion({ currency: parsedValue } as ParsedValues, set, get);
  },
}));

export { LOCALE_CONFIG };
