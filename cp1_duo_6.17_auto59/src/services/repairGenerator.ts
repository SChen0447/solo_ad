import axios from 'axios';
import type { Conflict, FixProposal, RepairResponse } from '../types';

export class RepairGenerator {
  private static readonly API_URL = '/api/repair';

  static async generateRepair(conflicts: Conflict[], originalCss: string): Promise<FixProposal> {
    try {
      const response = await axios.post<RepairResponse>(this.API_URL, {
        conflicts,
        css: originalCss
      }, {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 5000
      });

      if (response.data.error) {
        return this.generateLocalRepair(conflicts, originalCss);
      }

      return {
        modifications: response.data.modifications,
        diff_blocks: response.data.diff_blocks,
        repaired_css_hint: response.data.repaired_css_hint
      };
    } catch (error: any) {
      return this.generateLocalRepair(conflicts, originalCss);
    }
  }

  private static generateLocalRepair(conflicts: Conflict[], _originalCss: string): FixProposal {
    const modifications: FixProposal['modifications'] = [];
    const diff_blocks: FixProposal['diff_blocks'] = [];

    const processed = new Set<string>();

    conflicts.forEach(conflict => {
      const key = `${conflict.losing_selector}-${conflict.property}`;
      if (processed.has(key)) return;
      processed.add(key);

      modifications.push({
        selector: conflict.losing_selector,
        property: conflict.property,
        old_value: conflict.losing_value,
        new_value: conflict.winning_value,
        action: 'replace',
        reason: `与选择器 "${conflict.winning_selector}" 冲突，推荐使用 ${conflict.winning_value}（特异性更高或声明顺序靠后）`
      });

      diff_blocks.push({
        type: 'deletion',
        selector: conflict.losing_selector,
        property: conflict.property,
        value: conflict.losing_value
      });

      diff_blocks.push({
        type: 'addition',
        selector: conflict.losing_selector,
        property: conflict.property,
        value: conflict.winning_value
      });
    });

    return {
      modifications,
      diff_blocks,
      repaired_css_hint: `检测到 ${conflicts.length} 处冲突，请根据下方建议修改CSS`
    };
  }

  static generateFixedCss(originalCss: string, modifications: FixProposal['modifications']): string {
    let result = originalCss;

    modifications.forEach(mod => {
      const escapedSelector = this.escapeRegex(mod.selector);
      const escapedProperty = this.escapeRegex(mod.property);
      const escapedOldValue = this.escapeRegex(mod.old_value);

      const patterns = [
        new RegExp(
          `(${escapedSelector}\\s*\\{[^}]*${escapedProperty}\\s*:\\s*)${escapedOldValue}(\\s*!?[iI][mM][pP][oO][rR][tT][aA][nN][tT]?\\s*;?)`,
          'g'
        ),
        new RegExp(
          `(${escapedProperty}\\s*:\\s*)${escapedOldValue}(\\s*!?[iI][mM][pP][oO][rR][tT][aA][nN][tT]?\\s*;?)`,
          'g'
        )
      ];

      let replaced = false;
      for (const pattern of patterns) {
        if (pattern.test(result)) {
          result = result.replace(pattern, `$1${mod.new_value}$2`);
          replaced = true;
          break;
        }
      }

      if (!replaced) {
        result = this.injectIntoSelector(result, mod.selector, mod.property, mod.new_value);
      }
    });

    return result;
  }

  private static injectIntoSelector(css: string, selector: string, property: string, value: string): string {
    const escapedSelector = this.escapeRegex(selector);
    const pattern = new RegExp(`(${escapedSelector}\\s*\\{)([^}]*)\\}`, 'g');

    if (pattern.test(css)) {
      return css.replace(pattern, (_m, g1, g2) => {
        return `${g1}${g2}${g2.trim() && !g2.trim().endsWith(';') ? ';' : ''}  ${property}: ${value};\n}`;
      });
    }

    return `${css}\n\n${selector} {\n  ${property}: ${value};\n}`;
  }

  private static escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  static async copyToClipboard(text: string): Promise<boolean> {
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(text);
        return true;
      }
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.left = '-9999px';
      document.body.appendChild(textarea);
      textarea.select();
      const success = document.execCommand('copy');
      document.body.removeChild(textarea);
      return success;
    } catch {
      return false;
    }
  }
}
