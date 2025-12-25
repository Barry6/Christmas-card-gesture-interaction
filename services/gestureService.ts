import { ParticleShape } from '../types';

interface Landmark {
  x: number;
  y: number;
  z: number;
}

export class GestureService {
  private hands: any;
  private camera: any;
  private videoElement: HTMLVideoElement;
  private canvasElement: HTMLCanvasElement;
  private canvasCtx: CanvasRenderingContext2D | null;
  private onShapeChange: (shape: ParticleShape) => void;
  
  constructor(
    videoElement: HTMLVideoElement,
    canvasElement: HTMLCanvasElement,
    onShapeChange: (shape: ParticleShape) => void
  ) {
    this.videoElement = videoElement;
    this.canvasElement = canvasElement;
    this.canvasCtx = this.canvasElement.getContext('2d');
    this.onShapeChange = onShapeChange;
  }

  public async start() {
    const { Hands, Camera } = window;

    this.hands = new Hands({
      locateFile: (file: string) => {
        return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
      }
    });

    this.hands.setOptions({
      maxNumHands: 1,
      modelComplexity: 1,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5
    });

    this.hands.onResults(this.onResults.bind(this));

    this.camera = new Camera(this.videoElement, {
      onFrame: async () => {
        await this.hands.send({ image: this.videoElement });
      },
      width: 640,
      height: 480
    });

    await this.camera.start();
  }

  private onResults(results: any) {
    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
      const landmarks = results.multiHandLandmarks[0];
      this.processGesture(landmarks);
    }
    this.drawResults(results);
  }

  private drawResults(results: any) {
    if (!this.canvasCtx || !this.canvasElement) return;
    this.canvasElement.width = this.videoElement.videoWidth;
    this.canvasElement.height = this.videoElement.videoHeight;
    const ctx = this.canvasCtx;
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, this.canvasElement.width, this.canvasElement.height);

    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
      const { drawConnectors, drawLandmarks, HAND_CONNECTIONS } = window;
      for (const landmarks of results.multiHandLandmarks) {
        if (drawConnectors) drawConnectors(ctx, landmarks, HAND_CONNECTIONS, { color: '#FFFFFF', lineWidth: 4 });
        if (drawLandmarks) drawLandmarks(ctx, landmarks, { color: '#FFFFFF', lineWidth: 2, radius: 4 });
      }
    }
  }

  private processGesture(lm: Landmark[]) {
    // 8: Index Tip, 6: Index PIP
    // 12: Middle Tip, 10: Middle PIP
    // 16: Ring Tip, 14: Ring PIP
    // 20: Pinky Tip, 18: Pinky PIP
    const isFingerUp = (tipIdx: number, pipIdx: number) => lm[tipIdx].y < lm[pipIdx].y;

    const indexUp = isFingerUp(8, 6);
    const middleUp = isFingerUp(12, 10);
    const ringUp = isFingerUp(16, 14);
    const pinkyUp = isFingerUp(20, 18);
    
    // Simple logic: if most fingers are up, it's an OPEN hand (Explode)
    // If all fingers are down, it's a FIST (Tree)
    if (indexUp && middleUp && ringUp && pinkyUp) {
        this.onShapeChange(ParticleShape.EXPLODE);
    } 
    else if (!indexUp && !middleUp && !ringUp && !pinkyUp) {
        this.onShapeChange(ParticleShape.TREE);
    }
  }

  public stop() {
      if (this.camera) this.camera.stop();
  }
}