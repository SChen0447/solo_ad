import { useMemo } from 'react';
import type { BrewResult, Ingredient, PotionQuality, Slots } from '../types';
import { blendColors, rgbToHex } from '../types';
import { RECIPES } from '../data';

export interface UseRecipeInput {
  slots: Slots;
  shakeDurationMs: number;
  particleCount: number;
}

export interface UseRecipeOutput {
  matchedRecipeId: string | null;
  brewResult: BrewResult | null;
  allIngredientsPresent: Ingredient[];
  buildResult: () => BrewResult | null;
}

function signatureOf(ids: string[]): string {
  return [...ids].sort().join('|');
}

function judgeQuality(durationMs: number, particles: number): PotionQuality {
  if (durationMs >= 2000 && particles >= 50) return '完美';
  if (durationMs >= 1000 || particles >= 25) return '优秀';
  return '普通';
}

const RECIPE_MAP: Map<string, (typeof RECIPES)[number]> = new Map();
for (const r of RECIPES) {
  RECIPE_MAP.set(signatureOf(r.ingredientIds), r);
}

export function useRecipe(input: UseRecipeInput): UseRecipeOutput {
  const { slots, shakeDurationMs, particleCount } = input;

  const allIngredientsPresent = useMemo(
    () => slots.filter((s): s is Ingredient => Boolean(s)),
    [slots],
  );

  const matchedRecipeId = useMemo(() => {
    if (allIngredientsPresent.length === 0) return null;
    const ids = allIngredientsPresent.map(i => i.id);
    const sig = signatureOf(ids);
    return RECIPE_MAP.get(sig)?.id ?? null;
  }, [allIngredientsPresent]);

  const buildResult = (): BrewResult | null => {
    if (allIngredientsPresent.length === 0) return null;
    const ids = allIngredientsPresent.map(i => i.id);
    const sig = signatureOf(ids);
    const recipe = RECIPE_MAP.get(sig);
    const rgb = blendColors(slots);
    const color = rgbToHex(rgb[0], rgb[1], rgb[2]);
    const quality = judgeQuality(shakeDurationMs, particleCount);
    return {
      name: recipe ? recipe.name : '未知混合物',
      color: recipe ? recipe.resultColor : color,
      rgb: recipe ? recipe.rgb : rgb,
      quality,
      isMatch: Boolean(recipe),
      recipeId: recipe?.id,
    };
  };

  const brewResult = useMemo(() => {
    if (shakeDurationMs === 0 && particleCount === 0) return null;
    if (allIngredientsPresent.length === 0) return null;
    return buildResult();
  }, [allIngredientsPresent, shakeDurationMs, particleCount]);

  return { matchedRecipeId, brewResult, allIngredientsPresent, buildResult };
}
