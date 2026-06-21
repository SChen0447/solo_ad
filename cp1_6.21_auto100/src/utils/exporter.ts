import type { AnimationSlice } from '@/types';

function fmtTransform(t: AnimationSlice['transform']): string {
  return `translate(${t.translateX}px, ${t.translateY}px) rotate(${t.rotate}deg) scale(${t.scale}) skewX(${t.skewX}deg) skewY(${t.skewY}deg)`;
}

function safeName(s: string): string {
  return s.replace(/[^a-zA-Z0-9_-]/g, '_');
}

export function exportCSSKeyframes(slices: AnimationSlice[]): string {
  let css = '';
  for (const s of slices) {
    const name = safeName(s.selector);
    css += `@keyframes ${name} {\n`;
    css += `  0% {\n`;
    css += `    transform: translate(0, 0) rotate(0deg) scale(1) skewX(0deg) skewY(0deg);\n`;
    css += `    opacity: 1;\n`;
    css += `    background-color: ${s.color.startColor};\n`;
    css += `  }\n`;
    css += `  100% {\n`;
    css += `    transform: ${fmtTransform(s.transform)};\n`;
    css += `    opacity: ${s.opacity};\n`;
    css += `    background-color: ${s.color.endColor};\n`;
    css += `  }\n`;
    css += `}\n\n`;
    css += `${s.selector} {\n`;
    css += `  animation-name: ${name};\n`;
    css += `  animation-duration: ${s.duration}ms;\n`;
    css += `  animation-delay: ${s.delay}ms;\n`;
    css += `  animation-timing-function: ${s.easing};\n`;
    css += `  animation-fill-mode: forwards;\n`;
    css += `}\n\n`;
  }
  return css.trimEnd();
}

export function exportJSAnimation(slices: AnimationSlice[]): string {
  let js = '';
  for (const s of slices) {
    const el = `document.querySelector('${s.selector}')`;
    js += `${el}?.animate([\n`;
    js += `  {\n`;
    js += `    transform: 'translate(0, 0) rotate(0deg) scale(1) skewX(0deg) skewY(0deg)',\n`;
    js += `    opacity: 1,\n`;
    js += `    backgroundColor: '${s.color.startColor}',\n`;
    js += `  },\n`;
    js += `  {\n`;
    js += `    transform: '${fmtTransform(s.transform)}',\n`;
    js += `    opacity: ${s.opacity},\n`;
    js += `    backgroundColor: '${s.color.endColor}',\n`;
    js += `  }\n`;
    js += `], {\n`;
    js += `  duration: ${s.duration},\n`;
    js += `  delay: ${s.delay},\n`;
    js += `  easing: '${s.easing}',\n`;
    js += `  fill: 'forwards',\n`;
    js += `});\n\n`;
  }
  return js.trimEnd();
}
