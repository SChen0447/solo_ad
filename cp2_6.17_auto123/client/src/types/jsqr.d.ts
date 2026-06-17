declare module 'jsqr' {
  interface Point {
    x: number;
    y: number;
  }

  interface QrResult {
    binaryData: number[];
    data: string;
    chunks: any[];
    version: number;
    location: {
      topLeftCorner: Point;
      topRightCorner: Point;
      bottomRightCorner: Point;
      bottomLeftCorner: Point;
      topLeftFinderPattern: Point;
      topRightFinderPattern: Point;
      bottomLeftFinderPattern: Point;
      bottomRightAlignmentPattern?: Point;
    };
  }

  interface Options {
    inversionAttempts?: 'dontInvert' | 'onlyInvert' | 'attemptBoth' | 'invertFirst';
  }

  function jsqr(
    data: Uint8ClampedArray,
    width: number,
    height: number,
    options?: Options
  ): QrResult | null;

  export = jsqr;
}
