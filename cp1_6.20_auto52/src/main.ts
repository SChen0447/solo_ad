import { GameEngine } from './game/GameEngine';

const canvas = document.getElementById('battlefield') as HTMLCanvasElement;
const engine = new GameEngine(canvas);
engine.start();
