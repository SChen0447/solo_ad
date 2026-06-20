export const exportAsPNG = (canvas: HTMLCanvasElement): Promise<string> => {
  return new Promise((resolve, reject) => {
    const startTime = performance.now();
    try {
      const dataURL = canvas.toDataURL('image/png');
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      if (duration > 500) {
        console.warn(`PNG export took ${duration}ms, exceeded 500ms target`);
      }
      
      resolve(dataURL);
    } catch (error) {
      reject(error);
    }
  });
};

export const downloadPNG = (dataURL: string, filename: string = 'greeting-card.png'): void => {
  const link = document.createElement('a');
  link.download = filename;
  link.href = dataURL;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const generateShareLink = (): Promise<string> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const randomId = Math.random().toString(36).substring(2, 8);
      const shortLink = `https://card.example.com/s/${randomId}`;
      resolve(shortLink);
    }, 300);
  });
};

export const copyToClipboard = (text: string): Promise<void> => {
  return navigator.clipboard.writeText(text);
};
