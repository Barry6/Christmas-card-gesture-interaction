export enum AppState {
  IDLE = 'IDLE',
  LOADING = 'LOADING',
  RUNNING = 'RUNNING',
  ERROR = 'ERROR'
}

export enum ParticleShape {
  TREE = 'TREE',
  EXPLODE = 'EXPLODE'
}

export interface ParticleData {
  x: number;
  y: number;
  z: number;
  vx?: number;
  vy?: number;
}

// Global declarations for CDN libraries
declare global {
  interface Window {
    Hands: any;
    Camera: any;
    drawConnectors: any;
    drawLandmarks: any;
    HAND_CONNECTIONS: any;
  }
}