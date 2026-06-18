/// <reference types="vite/client" />

declare module '*.png';
declare module '*.svg';
declare module '*.jpg';
declare module '*.jpeg';
declare module '*.gif';

declare namespace JSX {
  interface IntrinsicElements {
    mesh: any;
    instancedMesh: any;
    group: any;
    ambientLight: any;
    directionalLight: any;
    pointLight: any;
    spotLight: any;
    gridHelper: any;
    fog: any;
    meshStandardMaterial: any;
    meshBasicMaterial: any;
    meshPhongMaterial: any;
    planeGeometry: any;
    boxGeometry: any;
    sphereGeometry: any;
    bufferGeometry: any;
    primitive: any;
  }
}
