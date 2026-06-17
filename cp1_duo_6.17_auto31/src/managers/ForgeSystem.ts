import axios from 'axios';
import { MaterialData, WeaponData, MatchResponse, RecipeData, RecipesResponse } from '../models/TypeDefinitions';

class ForgeSystem {
  private recipes: RecipeData[] = [];
  private loaded: boolean = false;

  async loadRecipes(): Promise<void> {
    if (this.loaded && this.recipes.length > 0) return;
    try {
      const response = await axios.get<RecipesResponse>('/api/recipes');
      this.recipes = response.data.recipes;
      this.loaded = true;
    } catch (error) {
      console.error('Failed to load recipes from backend, using fallback:', error);
      this.recipes = this.getFallbackRecipes();
      this.loaded = true;
    }
  }

  async attemptForge(materials: MaterialData[]): Promise<{ success: boolean; weapon?: WeaponData; message: string }> {
    if (materials.length === 0) {
      return { success: false, message: '没有放入任何材料' };
    }

    const materialIds = materials.map(m => m.id).sort();

    try {
      const response = await axios.post<MatchResponse>('/api/recipes/match', {
        materials: materialIds,
      });

      if (response.data.matched && response.data.weapon) {
        return {
          success: true,
          weapon: response.data.weapon,
          message: `锻造成功！获得【${response.data.weapon.name}】！`,
        };
      }
    } catch (error) {
      console.error('Forge API error, trying local match:', error);
    }

    const localMatch = this.matchRecipeLocal(materialIds);
    if (localMatch) {
      return {
        success: true,
        weapon: localMatch,
        message: `锻造成功！获得【${localMatch.name}】！`,
      };
    }

    return { success: false, message: '配方无效，这些材料无法组合' };
  }

  private matchRecipeLocal(materialIds: string[]): WeaponData | null {
    for (const recipe of this.recipes) {
      const recipeMats = [...recipe.materials].sort();
      if (JSON.stringify(recipeMats) === JSON.stringify(materialIds)) {
        return {
          id: `weapon_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
          recipeId: recipe.id,
          name: recipe.name,
          attack: recipe.attack,
          defense: recipe.defense,
          critRate: recipe.critRate,
          effect: recipe.effect,
          iconColor: recipe.iconColor,
          forgedAt: new Date().toISOString(),
        };
      }
    }
    return null;
  }

  getRecipes(): RecipeData[] {
    return this.recipes;
  }

  private getFallbackRecipes(): RecipeData[] {
    return [
      { id: 'recipe_blade_1', name: '烈焰铁刃', materials: ['fire_crystal', 'steel_fragment', 'root_fiber'], attack: 35, defense: 5, critRate: 0.15, effect: '攻击时附加火焰伤害，灼烧敌人2回合', iconColor: '#ff4422' },
      { id: 'recipe_blade_2', name: '寒霜裂刃', materials: ['ice_shard', 'rock_chunk', 'thunder_spark'], attack: 40, defense: 8, critRate: 0.10, effect: '攻击时冻结敌人1回合，降低其速度', iconColor: '#44aaff' },
      { id: 'recipe_staff_1', name: '暗影法杖', materials: ['shadow_essence', 'crystal_core', 'void_dust'], attack: 28, defense: 3, critRate: 0.25, effect: '暴击时触发暗影爆发，造成范围伤害', iconColor: '#6622aa' },
      { id: 'recipe_shield_1', name: '磐石巨盾', materials: ['rock_chunk', 'steel_fragment', 'root_fiber'], attack: 10, defense: 30, critRate: 0.05, effect: '格挡成功时反弹20%伤害', iconColor: '#887766' },
      { id: 'recipe_dagger_1', name: '雷电匕首', materials: ['thunder_spark', 'shadow_essence', 'prism_shard'], attack: 30, defense: 2, critRate: 0.35, effect: '攻击速度极快，每次攻击有概率连击', iconColor: '#ffee44' },
      { id: 'recipe_bow_1', name: '水晶长弓', materials: ['crystal_core', 'root_fiber', 'frost_essence'], attack: 32, defense: 4, critRate: 0.20, effect: '箭矢穿透护甲，无视30%防御', iconColor: '#dd66ff' },
      { id: 'recipe_hammer_1', name: '雷神之锤', materials: ['thunder_spark', 'steel_fragment', 'rock_chunk'], attack: 45, defense: 12, critRate: 0.08, effect: '重击地面造成眩晕，使敌人跳过1回合', iconColor: '#ffee44' },
      { id: 'recipe_sword_1', name: '星尘圣剑', materials: ['star_dust', 'crystal_core', 'fire_crystal'], attack: 50, defense: 10, critRate: 0.18, effect: '星辉之力：每回合恢复5%生命值', iconColor: '#aaddff' },
      { id: 'recipe_axe_1', name: '龙血战斧', materials: ['dragon_blood', 'steel_fragment', 'iron_dust'], attack: 55, defense: 8, critRate: 0.12, effect: '击杀敌人时恢复15%最大生命值', iconColor: '#cc0033' },
    ];
  }
}

export const forgeSystem = new ForgeSystem();
