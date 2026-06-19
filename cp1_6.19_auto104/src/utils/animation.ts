export const easeInOutCubic = (t: number): number => {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
};

export const easeOutCubic = (t: number): number => {
  return 1 - Math.pow(1 - t, 3);
};

export const easeInCubic = (t: number): number => {
  return t * t * t;
};

export const lerp = (start: number, end: number, t: number): number => {
  return start + (end - start) * t;
};

export const clamp = (value: number, min: number, max: number): number => {
  return Math.min(Math.max(value, min), max);
};

export const animate = (
  duration: number,
  onUpdate: (progress: number) => void,
  onComplete?: () => void,
  easing: (t: number) => number = easeInOutCubic
): () => void => {
  const startTime = performance.now();
  let animationId: number | null = null;
  let isCancelled = false;

  const tick = (currentTime: number) => {
    if (isCancelled) return;

    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const easedProgress = easing(progress);

    onUpdate(easedProgress);

    if (progress < 1) {
      animationId = requestAnimationFrame(tick);
    } else if (onComplete) {
      onComplete();
    }
  };

  animationId = requestAnimationFrame(tick);

  return () => {
    isCancelled = true;
    if (animationId !== null) {
      cancelAnimationFrame(animationId);
    }
  };
};

export const hslToRgb = (h: number, s: number, l: number): string => {
  let r, g, b;

  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }

  const toHex = (x: number) => {
    const hex = Math.round(x * 255).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
};
