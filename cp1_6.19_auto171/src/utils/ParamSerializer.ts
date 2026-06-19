import { AnimationParams, ElementParams } from '@/types';
import { animationEngine } from '@/animation/AnimationEngine';

export class ParamSerializer {
  toJSON(params: AnimationParams): string {
    return JSON.stringify(animationEngine.parse(params), null, 2);
  }

  elementParamsToJSON(params: ElementParams): string {
    const parsed = {
      square: animationEngine.parse(params.square),
      circle: animationEngine.parse(params.circle),
    };
    return JSON.stringify(parsed, null, 2);
  }

  generateFullCSS(params: ElementParams, squareId: string, circleId: string): string {
    const squareCSS = animationEngine.toCSSString('square', params.square, squareId);
    const circleCSS = animationEngine.toCSSString('circle', params.circle, circleId);
    return `${squareCSS}\n\n${circleCSS}`;
  }

  async copyToClipboard(text: string): Promise<boolean> {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        return true;
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.left = '-9999px';
        textarea.style.top = '-9999px';
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        const success = document.execCommand('copy');
        document.body.removeChild(textarea);
        return success;
      }
    } catch {
      return false;
    }
  }
}

export const paramSerializer = new ParamSerializer();
