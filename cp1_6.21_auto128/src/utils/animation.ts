export function flyIn(
  element: HTMLElement,
  fromRect: DOMRect,
  toRect: DOMRect,
  duration: number = 500
): Animation {
  const dx = fromRect.left - toRect.left;
  const dy = fromRect.top - toRect.top;
  const scaleX = fromRect.width / toRect.width;
  const scaleY = fromRect.height / toRect.height;

  return element.animate(
    [
      {
        transform: `translate(${dx}px, ${dy}px) scale(${scaleX}, ${scaleY})`,
        borderRadius: '8px',
        opacity: 0.9,
      },
      {
        transform: 'translate(0, 0) scale(1, 1)',
        borderRadius: '4px',
        opacity: 1,
      },
    ],
    {
      duration,
      easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
      fill: 'forwards',
    }
  );
}

export function flyOut(
  element: HTMLElement,
  fromRect: DOMRect,
  toRect: DOMRect,
  duration: number = 400
): Animation {
  const dx = toRect.left - fromRect.left;
  const dy = toRect.top - fromRect.top;
  const scaleX = toRect.width / fromRect.width;
  const scaleY = toRect.height / fromRect.height;

  return element.animate(
    [
      {
        transform: 'translate(0, 0) scale(1, 1)',
        borderRadius: '4px',
        opacity: 1,
      },
      {
        transform: `translate(${dx}px, ${dy}px) scale(${scaleX}, ${scaleY})`,
        borderRadius: '8px',
        opacity: 0,
      },
    ],
    {
      duration,
      easing: 'cubic-bezier(0.55, 0.085, 0.68, 0.53)',
      fill: 'forwards',
    }
  );
}

export function fadeOut(element: HTMLElement, duration: number = 400): Animation {
  return element.animate(
    [
      { transform: 'scale(1)', opacity: 1 },
      { transform: 'scale(0.8)', opacity: 0 },
    ],
    {
      duration,
      easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
      fill: 'forwards',
    }
  );
}

export function slideIn(
  element: HTMLElement,
  delay: number = 0,
  duration: number = 300
): Animation {
  return element.animate(
    [
      { transform: 'scale(0.8)', opacity: 0 },
      { transform: 'scale(1)', opacity: 1 },
    ],
    {
      duration,
      delay,
      easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
      fill: 'forwards',
    }
  );
}

export function fadeInOverlay(element: HTMLElement, duration: number = 300): Animation {
  return element.animate(
    [{ opacity: 0 }, { opacity: 1 }],
    {
      duration,
      easing: 'ease-out',
      fill: 'forwards',
    }
  );
}

export function fadeOutOverlay(element: HTMLElement, duration: number = 250): Animation {
  return element.animate(
    [{ opacity: 1 }, { opacity: 0 }],
    {
      duration,
      easing: 'ease-in',
      fill: 'forwards',
    }
  );
}
