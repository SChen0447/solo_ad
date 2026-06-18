export const captureElement = async (element: HTMLElement | null): Promise<string> => {
  if (!element) {
    return '';
  }

  try {
    const rect = element.getBoundingClientRect();
    const canvas = document.createElement('canvas');
    const scale = 2;
    canvas.width = rect.width * scale;
    canvas.height = rect.height * scale;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return '';
    }

    ctx.scale(scale, scale);

    const computedStyle = window.getComputedStyle(element);
    const bgColor = computedStyle.backgroundColor || '#ffffff';
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, rect.width, rect.height);

    const svgContent = `
      <svg xmlns="http://www.w3.org/2000/svg" width="${rect.width}" height="${rect.height}">
        <foreignObject width="100%" height="100%">
          <div xmlns="http://www.w3.org/1999/xhtml" style="
            width: ${rect.width}px;
            height: ${rect.height}px;
            transform: scale(1);
            transform-origin: top left;
          ">
            ${element.outerHTML}
          </div>
        </foreignObject>
      </svg>
    `;

    const img = new Image();
    const svgBlob = new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);

    return new Promise((resolve) => {
      img.onload = () => {
        ctx.drawImage(img, 0, 0, rect.width, rect.height);
        URL.revokeObjectURL(url);
        resolve(canvas.toDataURL('image/png'));
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        ctx.fillStyle = '#f0f0f0';
        ctx.fillRect(0, 0, rect.width, rect.height);
        ctx.fillStyle = '#999';
        ctx.font = '16px Inter';
        ctx.textAlign = 'center';
        ctx.fillText('Preview Screenshot', rect.width / 2, rect.height / 2);
        resolve(canvas.toDataURL('image/png'));
      };
      img.src = url;
    });
  } catch {
    return '';
  }
};
