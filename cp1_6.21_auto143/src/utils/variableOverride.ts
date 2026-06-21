import { Framework, VariableConfig, VariableOverride } from '../types';

export const frameworkVariableConfigs: Record<Framework, VariableConfig[]> = {
  [Framework.BOOTSTRAP]: [
    {
      name: '--bs-primary',
      label: '主色调',
      type: 'color',
      defaultValue: '#0d6efd'
    },
    {
      name: '--bs-secondary',
      label: '次要色',
      type: 'color',
      defaultValue: '#6c757d'
    },
    {
      name: '--bs-success',
      label: '成功色',
      type: 'color',
      defaultValue: '#198754'
    },
    {
      name: '--bs-danger',
      label: '危险色',
      type: 'color',
      defaultValue: '#dc3545'
    },
    {
      name: '--bs-border-radius',
      label: '圆角大小',
      type: 'slider',
      defaultValue: 0.375,
      min: 0,
      max: 2,
      step: 0.125,
      unit: 'rem'
    },
    {
      name: '--bs-spacer',
      label: '间距单位',
      type: 'number',
      defaultValue: 1,
      min: 0.5,
      max: 3,
      step: 0.25,
      unit: 'rem'
    }
  ],
  [Framework.TAILWIND]: [
    {
      name: '--tw-primary',
      label: '主色调',
      type: 'color',
      defaultValue: '#3b82f6'
    },
    {
      name: '--tw-secondary',
      label: '次要色',
      type: 'color',
      defaultValue: '#6b7280'
    },
    {
      name: '--tw-success',
      label: '成功色',
      type: 'color',
      defaultValue: '#10b981'
    },
    {
      name: '--tw-danger',
      label: '危险色',
      type: 'color',
      defaultValue: '#ef4444'
    },
    {
      name: '--tw-radius',
      label: '圆角大小',
      type: 'slider',
      defaultValue: 0.375,
      min: 0,
      max: 2,
      step: 0.125,
      unit: 'rem'
    },
    {
      name: '--tw-space',
      label: '间距单位',
      type: 'number',
      defaultValue: 1,
      min: 0.5,
      max: 3,
      step: 0.25,
      unit: 'rem'
    }
  ],
  [Framework.BULMA]: [
    {
      name: '--bulma-primary',
      label: '主色调',
      type: 'color',
      defaultValue: '#00d1b2'
    },
    {
      name: '--bulma-link',
      label: '链接色',
      type: 'color',
      defaultValue: '#485fc7'
    },
    {
      name: '--bulma-success',
      label: '成功色',
      type: 'color',
      defaultValue: '#48c78e'
    },
    {
      name: '--bulma-danger',
      label: '危险色',
      type: 'color',
      defaultValue: '#f14668'
    },
    {
      name: '--bulma-radius',
      label: '圆角大小',
      type: 'slider',
      defaultValue: 0.25,
      min: 0,
      max: 2,
      step: 0.125,
      unit: 'rem'
    },
    {
      name: '--bulma-gap',
      label: '间距单位',
      type: 'number',
      defaultValue: 0.75,
      min: 0.5,
      max: 3,
      step: 0.25,
      unit: 'rem'
    }
  ]
};

export function generateOverrideStyles(
  framework: Framework,
  overrides: VariableOverride
): string {
  const configs = frameworkVariableConfigs[framework];
  const styles: string[] = [':root {'];

  configs.forEach((config) => {
    const value = overrides[config.name] ?? config.defaultValue;
    const unit = config.unit || '';
    styles.push(`  ${config.name}: ${value}${unit};`);
  });

  styles.push('}');
  return styles.join('\n');
}

export function getDefaultVariables(framework: Framework): VariableOverride {
  const configs = frameworkVariableConfigs[framework];
  const defaults: VariableOverride = {};

  configs.forEach((config) => {
    defaults[config.name] = config.defaultValue;
  });

  return defaults;
}

export function getAllDefaultVariables(): Record<Framework, VariableOverride> {
  return {
    [Framework.BOOTSTRAP]: getDefaultVariables(Framework.BOOTSTRAP),
    [Framework.TAILWIND]: getDefaultVariables(Framework.TAILWIND),
    [Framework.BULMA]: getDefaultVariables(Framework.BULMA)
  };
}

export function getVariableLabel(framework: Framework, variableName: string): string {
  const configs = frameworkVariableConfigs[framework];
  const config = configs.find((c) => c.name === variableName);
  return config?.label || variableName;
}
