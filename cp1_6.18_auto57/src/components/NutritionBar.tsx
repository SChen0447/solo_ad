import { memo } from 'react';
import type { NutritionTotal } from '../types';
import './NutritionBar.css';

interface Props {
  nutrition: NutritionTotal;
  compact?: boolean;
}

function NutritionBarComponent({ nutrition, compact = false }: Props) {
  const { calories, protein, fat, carbs } = nutrition;

  const totalMacro = protein + fat + carbs || 1;
  const proteinPct = (protein / totalMacro) * 100;
  const fatPct = (fat / totalMacro) * 100;
  const carbsPct = (carbs / totalMacro) * 100;

  return (
    <div className={`nutrition-bar ${compact ? 'compact' : ''}`}>
      {!compact && (
        <div className="nutrition-bar__calories">
          <span className="nutrition-bar__calories-value">{calories}</span>
          <span className="nutrition-bar__calories-label">kcal</span>
        </div>
      )}
      <div className="nutrition-bar__track">
        <div
          className="nutrition-bar__segment segment--calories"
          style={{ width: compact ? `${(calories / (calories + 500)) * 100}%` : undefined }}
          title={`热量: ${calories} kcal`}
        >
          <span className="nutrition-bar__tooltip">热量 {calories}kcal</span>
        </div>
        <div
          className="nutrition-bar__segment segment--protein"
          style={{ width: `${proteinPct}%` }}
          title={`蛋白质: ${protein}g`}
        >
          <span className="nutrition-bar__tooltip">蛋白质 {protein}g</span>
        </div>
        <div
          className="nutrition-bar__segment segment--fat"
          style={{ width: `${fatPct}%` }}
          title={`脂肪: ${fat}g`}
        >
          <span className="nutrition-bar__tooltip">脂肪 {fat}g</span>
        </div>
        <div
          className="nutrition-bar__segment segment--carbs"
          style={{ width: `${carbsPct}%` }}
          title={`碳水: ${carbs}g`}
        >
          <span className="nutrition-bar__tooltip">碳水 {carbs}g</span>
        </div>
      </div>
      {!compact && (
        <div className="nutrition-bar__legend">
          <div className="nutrition-bar__legend-item">
            <span className="dot dot--protein"></span>
            <span>蛋白 {protein}g</span>
          </div>
          <div className="nutrition-bar__legend-item">
            <span className="dot dot--fat"></span>
            <span>脂肪 {fat}g</span>
          </div>
          <div className="nutrition-bar__legend-item">
            <span className="dot dot--carbs"></span>
            <span>碳水 {carbs}g</span>
          </div>
        </div>
      )}
      {compact && (
        <div className="nutrition-bar__compact-values">
          <span className="val--cal">{calories}kcal</span>
          <span className="val--p">{protein}g</span>
          <span className="val--f">{fat}g</span>
          <span className="val--c">{carbs}g</span>
        </div>
      )}
    </div>
  );
}

export const NutritionBar = memo(NutritionBarComponent);
