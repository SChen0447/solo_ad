import { Variant, DiffResult, DiffField, FIELD_LABELS } from '../types';

const DIFF_FIELDS: DiffField[] = ['title', 'btnColor', 'bgUrl', 'fontSize', 'btnText', 'description'];

export const computeDiff = (variantA: Variant, variantB: Variant): DiffResult[] => {
  const results: DiffResult[] = [];

  for (const field of DIFF_FIELDS) {
    const oldValue = variantA[field];
    const newValue = variantB[field];

    if (oldValue !== newValue) {
      results.push({
        field,
        fieldLabel: FIELD_LABELS[field],
        oldValue,
        newValue,
        type: 'modified',
      });
    }
  }

  return results;
};

export const getDifferingFields = (variantA: Variant, variantB: Variant): Set<string> => {
  const differing = new Set<string>();

  for (const field of DIFF_FIELDS) {
    if (variantA[field] !== variantB[field]) {
      differing.add(field);
    }
  }

  return differing;
};
