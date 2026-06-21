/// <reference types="vite/client" />

declare module 'roughjs/bundled/rough.esm' {
  export interface GeneratorOptions {
    stroke?: string;
    strokeWidth?: number;
    roughness?: number;
    bowing?: number;
    fill?: string;
    fillStyle?: 'hachure' | 'solid' | 'zigzag' | 'cross-hatch' | 'dots' | 'sunburst' | 'dashed' | 'zigzag-line';
    fillWeight?: number;
    hachureAngle?: number;
    hachureGap?: number;
    curveStepCount?: number;
    zigzagOffset?: number;
    disableMultiStroke?: boolean;
    disableMultiStrokeFill?: boolean;
  }

  export interface Point {
    x: number;
    y: number;
  }

  export interface Op {
    op: 'move' | 'line' | 'bezierCurveTo' | 'curveTo' | 'close';
    data: string | number[];
  }

  export interface Drawable {
    sets: {
      type: string;
      operations: Op[];
      options: GeneratorOptions;
      shape: string;
    }[];
    size: [number, number];
  }

  export interface RoughGenerator {
    line(x1: number, y1: number, x2: number, y2: number, options?: GeneratorOptions): Drawable;
    rectangle(x: number, y: number, width: number, height: number, options?: GeneratorOptions): Drawable;
    ellipse(x: number, y: number, width: number, height: number, options?: GeneratorOptions): Drawable;
    circle(x: number, y: number, diameter: number, options?: GeneratorOptions): Drawable;
    linearPath(points: Point[], options?: GeneratorOptions): Drawable;
    arc(x: number, y: number, width: number, height: number, start: number, stop: number, closed?: boolean, options?: GeneratorOptions): Drawable;
    curve(points: Point[], options?: GeneratorOptions): Drawable;
    polygon(points: Point[], options?: GeneratorOptions): Drawable;
    path(d: string, options?: GeneratorOptions): Drawable;
    path2D(d: string, options?: GeneratorOptions): Drawable;
  }

  export interface RoughSVG {
    line(x1: number, y1: number, x2: number, y2: number, options?: GeneratorOptions): SVGElement;
    rectangle(x: number, y: number, width: number, height: number, options?: GeneratorOptions): SVGElement;
    ellipse(x: number, y: number, width: number, height: number, options?: GeneratorOptions): SVGElement;
    circle(x: number, y: number, diameter: number, options?: GeneratorOptions): SVGElement;
    linearPath(points: Point[], options?: GeneratorOptions): SVGElement;
    arc(x: number, y: number, width: number, height: number, start: number, stop: number, closed?: boolean, options?: GeneratorOptions): SVGElement;
    curve(points: Point[], options?: GeneratorOptions): SVGElement;
    polygon(points: Point[], options?: GeneratorOptions): SVGElement;
    path(d: string, options?: GeneratorOptions): SVGElement;
    path2D(d: string, options?: GeneratorOptions): SVGElement;
  }

  const rough: {
    generator: (config?: any) => RoughGenerator;
    svg: (svg: SVGSVGElement, config?: any) => RoughSVG;
    canvas: (canvas: HTMLCanvasElement, config?: any) => any;
  };

  export default rough;
}
