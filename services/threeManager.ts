import { COLORS, CONFIG } from '../constants';
import { ParticleShape, ParticleData } from '../types';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import gsap from 'gsap';

export class ThreeManager {
  private container: HTMLElement;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private composer: EffectComposer;
  private controls: OrbitControls;
  private animationId: number | null = null;
  
  // Particle Systems
  private sphereMesh: THREE.InstancedMesh;
  private boxMesh: THREE.InstancedMesh;
  private snowMesh: THREE.InstancedMesh;
  private dummy: THREE.Object3D;

  // Star
  private starMesh: THREE.Mesh;

  // Card
  private cardGroup: THREE.Group;
  private cardMesh: THREE.Mesh;
  private cardFrame: THREE.Mesh;
  private backgroundDim: THREE.Mesh;
  
  // State
  private targetPositions: ParticleData[] = [];
  private currentPositions: ParticleData[] = [];
  private snowData: ParticleData[] = [];
  private currentShape: ParticleShape = ParticleShape.TREE;
  
  // Rotation State
  private treeGroup: THREE.Group;
  private autoRotateConstant: number = 0.005; // Base auto-rotation speed

  // Cinematic State
  private originalCameraPos = new THREE.Vector3(0, 0, 25);
  private cardActive: boolean = false;

  constructor(container: HTMLElement) {
    this.container = container;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera();
    this.renderer = new THREE.WebGLRenderer();
    this.composer = new EffectComposer(this.renderer);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.sphereMesh = new THREE.InstancedMesh(undefined, undefined, 0);
    this.boxMesh = new THREE.InstancedMesh(undefined, undefined, 0);
    this.snowMesh = new THREE.InstancedMesh(undefined, undefined, 0);
    this.starMesh = new THREE.Mesh();
    this.dummy = new THREE.Object3D();
    this.treeGroup = new THREE.Group();
    this.cardGroup = new THREE.Group();
    this.cardMesh = new THREE.Mesh();
    this.cardFrame = new THREE.Mesh();
    this.backgroundDim = new THREE.Mesh();
    
    this.initScene();
    this.initParticles();
    this.initStar();
    this.initSnow();
    this.initCard();
    this.generateTargets(ParticleShape.TREE);
    this.animate();
  }

  private initScene() {
    this.scene.background = new THREE.Color(COLORS.DARK);
    this.scene.fog = new THREE.FogExp2(COLORS.DARK, 0.02);

    this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    this.camera.position.copy(this.originalCameraPos);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.container.appendChild(this.renderer.domElement);

    const renderScene = new RenderPass(this.scene, this.camera);
    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      CONFIG.BLOOM_STRENGTH,
      CONFIG.BLOOM_RADIUS,
      CONFIG.BLOOM_THRESHOLD
    );

    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(renderScene);
    this.composer.addPass(bloomPass);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.autoRotate = true;
    this.controls.autoRotateSpeed = 0.5;

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.5);
    dirLight.position.set(5, 5, 20);
    this.scene.add(dirLight);

    this.scene.add(this.treeGroup);
    window.addEventListener('resize', this.onWindowResize.bind(this));
  }

  private initParticles() {
    const sphereGeo = new THREE.SphereGeometry(CONFIG.PARTICLE_SIZE, 8, 8);
    const boxGeo = new THREE.BoxGeometry(CONFIG.PARTICLE_SIZE * 1.5, CONFIG.PARTICLE_SIZE * 1.5, CONFIG.PARTICLE_SIZE * 1.5);
    const material = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.1, metalness: 0.8 });

    const sphereCount = Math.floor(CONFIG.PARTICLE_COUNT * 0.6);
    const boxCount = CONFIG.PARTICLE_COUNT - sphereCount;

    this.sphereMesh = new THREE.InstancedMesh(sphereGeo, material, sphereCount);
    this.boxMesh = new THREE.InstancedMesh(boxGeo, material, boxCount);

    const colorPalette = [COLORS.GOLD, COLORS.RED, COLORS.GREEN];
    
    for (let j = 0; j < sphereCount; j++) {
      this.currentPositions.push({ x: 0, y: 0, z: 0 });
      this.targetPositions.push({ x: 0, y: 0, z: 0 });
      this.sphereMesh.setColorAt(j, new THREE.Color(colorPalette[Math.floor(Math.random() * colorPalette.length)]));
    }

    for (let j = 0; j < boxCount; j++) {
      this.currentPositions.push({ x: 0, y: 0, z: 0 });
      this.targetPositions.push({ x: 0, y: 0, z: 0 });
      this.boxMesh.setColorAt(j, new THREE.Color(colorPalette[Math.floor(Math.random() * colorPalette.length)]));
    }

    this.treeGroup.add(this.sphereMesh);
    this.treeGroup.add(this.boxMesh);
  }

  private initStar() {
    const shape = new THREE.Shape();
    const points = 5;
    const outerRadius = 0.8;
    const innerRadius = 0.4;
    for (let i = 0; i < points * 2; i++) {
        const angle = (i * Math.PI) / points - Math.PI / 2;
        const r = i % 2 === 0 ? outerRadius : innerRadius;
        const x = Math.cos(angle) * r;
        const y = Math.sin(angle) * r;
        if (i === 0) shape.moveTo(x, y);
        else shape.lineTo(x, y);
    }
    shape.closePath();
    const geometry = new THREE.ExtrudeGeometry(shape, { depth: 0.2, bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.05, bevelSegments: 2 });
    const material = new THREE.MeshStandardMaterial({ color: COLORS.GOLD, emissive: COLORS.GOLD, emissiveIntensity: 1.0 });
    this.starMesh = new THREE.Mesh(geometry, material);
    this.starMesh.position.set(0, 6.2, 0); 
    this.starMesh.scale.set(0, 0, 0); 
    this.treeGroup.add(this.starMesh);
  }

  private initSnow() {
    const snowCount = 500;
    const snowGeo = new THREE.SphereGeometry(0.08, 4, 4);
    const snowMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.8 });
    this.snowMesh = new THREE.InstancedMesh(snowGeo, snowMat, snowCount);
    
    for (let i = 0; i < snowCount; i++) {
      const p = {
        x: (Math.random() - 0.5) * 40,
        y: Math.random() * 30 - 10,
        z: (Math.random() - 0.5) * 40,
        vy: -0.05 - Math.random() * 0.05,
        vx: 0
      };
      this.snowData.push(p);
      this.dummy.position.set(p.x, p.y, p.z);
      this.dummy.updateMatrix();
      this.snowMesh.setMatrixAt(i, this.dummy.matrix);
    }
    this.snowMesh.visible = false;
    this.scene.add(this.snowMesh);
  }

  private initCard() {
    const canvas = document.createElement('canvas');
    const canvasWidth = 1200;
    const canvasHeight = 1600; 
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    const ctx = canvas.getContext('2d');
    
    if (ctx) {
      ctx.fillStyle = '#F9F9F4'; 
      ctx.fillRect(0, 0, canvasWidth, canvasHeight);
      
      ctx.fillStyle = 'rgba(0,0,0,0.03)';
      for(let i=0; i<8000; i++) {
        ctx.fillRect(Math.random() * canvasWidth, Math.random() * canvasHeight, 2, 2);
      }

      const gradient = ctx.createLinearGradient(0, 0, canvasWidth, canvasHeight);
      gradient.addColorStop(0, '#B8860B'); 
      gradient.addColorStop(0.2, '#E6C200'); 
      gradient.addColorStop(0.5, '#FFD700'); 
      gradient.addColorStop(0.8, '#D4AF37'); 
      gradient.addColorStop(1, '#B8860B'); 
      
      const borderWidth = 24;
      const margin = 50;
      ctx.strokeStyle = gradient;
      ctx.lineWidth = borderWidth;
      ctx.strokeRect(margin, margin, canvasWidth - margin * 2, canvasHeight - margin * 2);

      ctx.lineWidth = 2;
      ctx.strokeRect(margin + 15, margin + 15, canvasWidth - (margin + 15) * 2, canvasHeight - (margin + 15) * 2);
      
      const textMargin = 120;
      const textWidth = canvasWidth - (textMargin * 2);
      let currentY = 180;

      ctx.fillStyle = '#111111';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';

      ctx.font = 'bold 42px "Helvetica Neue", "Arial", sans-serif';
      ctx.fillText("Dear Kite Friends,", textMargin, currentY);
      currentY += 80;

      const wrapText = (text: string, x: number, y: number, maxWidth: number, lineHeight: number, font: string) => {
        ctx.font = font;
        const words = text.split(' ');
        let line = '';
        let cy = y;

        for(let n = 0; n < words.length; n++) {
          const testLine = line + words[n] + ' ';
          const metrics = ctx.measureText(testLine);
          const testWidth = metrics.width;
          if (testWidth > maxWidth && n > 0) {
            ctx.fillText(line, x, cy);
            line = words[n] + ' ';
            cy += lineHeight;
          } else {
            line = testLine;
          }
        }
        ctx.fillText(line, x, cy);
        return cy + lineHeight;
      };

      const bodyFont = '28px "Helvetica Neue", "Arial", sans-serif';
      const bodyLineHeight = 44;

      const paragraphs = [
        "In this warm and festive holiday season of 2025, the Kite team extends our heartfelt greetings to you.",
        "This year has been a fruitful journey for Kite, marked by several key milestones including the launch of Kite agent passport, closing our Series A round co-led by PayPal and General Catalyst, listing $KITE on top-tier exchanges, and expanding our global community and footprint.",
        "Together, these steps have brought us closer to our vision of the Agentic Internet—an infrastructure that provides verifiable identity, programmable governance, and seamless payments for autonomous AI agents.",
        "None of this would have been possible without our partners, advisors, supporters, and friends. Thank you for your trust, feedback, and enthusiastic participation. Your companionship has been instrumental in helping Kite soar higher at the intersection of AI and blockchain.",
        "In the year ahead, we will continue to deepen product innovation, advance agentic payment adoption, and strengthen ecosystem partnerships as we move toward a more intelligent and autonomous future.",
        "May the joy and warmth of this season be with you and your loved ones, and may 2026 bring even more surprises and successes.",
        "Happy Holidays and a Prosperous New Year!"
      ];

      paragraphs.forEach(p => {
        currentY = wrapText(p, textMargin, currentY, textWidth, bodyLineHeight, bodyFont);
        currentY += 25; 
      });

      currentY += 40;
      ctx.fillStyle = '#0f172a';
      ctx.font = 'italic 65px "Brush Script MT", "Lucida Handwriting", cursive';
      ctx.fillText("Chi Zhang", textMargin, currentY);

      ctx.font = '60px "Segoe Script", "Bradley Hand", "Comic Sans MS", cursive';
      ctx.save();
      ctx.translate(textMargin + 400, currentY);
      ctx.rotate(-0.05);
      ctx.fillText("Scott Shi", 0, 0);
      ctx.restore();
      
      currentY += 100;
      ctx.fillStyle = '#111111';
      ctx.font = 'bold 30px "Helvetica Neue", "Arial", sans-serif';
      ctx.fillText("Warmly,", textMargin, currentY);
      currentY += 40;
      ctx.fillText("The Kite Team", textMargin, currentY);
      currentY += 40;
      ctx.font = '300 30px "Helvetica Neue", "Arial", sans-serif';
      ctx.fillText("December 2025", textMargin, currentY);
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.anisotropy = 16;
    
    const cardWidth = 9;
    const cardHeight = 12; 
    const geo = new THREE.BoxGeometry(cardWidth, cardHeight, 0.1);
    
    const frontMat = new THREE.MeshStandardMaterial({ 
      map: texture, 
      roughness: 0.9, 
      metalness: 0.0,
      emissive: 0x000000 
    });
    const backMat = new THREE.MeshStandardMaterial({ color: 0xF9F9F4, metalness: 0.1, roughness: 0.6 });
    const sideMat = new THREE.MeshStandardMaterial({ color: 0xcccccc });

    const mats = [sideMat, sideMat, sideMat, sideMat, frontMat, backMat];

    this.cardMesh = new THREE.Mesh(geo, mats);
    this.cardGroup.add(this.cardMesh);

    const frameGeo = new THREE.BoxGeometry(cardWidth + 0.1, cardHeight + 0.1, 0.05);
    const frameMat = new THREE.MeshStandardMaterial({
      color: COLORS.GOLD,
      emissive: COLORS.GOLD,
      emissiveIntensity: 5.0,
      metalness: 1.0,
      roughness: 0.2
    });
    this.cardFrame = new THREE.Mesh(frameGeo, frameMat);
    this.cardFrame.position.z = -0.05; 
    this.cardGroup.add(this.cardFrame);
    
    this.cardGroup.scale.set(0, 0, 0);
    this.scene.add(this.cardGroup);

    const dimGeo = new THREE.PlaneGeometry(100, 100);
    const dimMat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0 });
    this.backgroundDim = new THREE.Mesh(dimGeo, dimMat);
    this.backgroundDim.position.z = -1; 
    this.cardGroup.add(this.backgroundDim);
  }

  public setShape(shape: ParticleShape) {
    if (this.currentShape === shape) return;
    this.currentShape = shape;
    this.generateTargets(shape);

    if (shape === ParticleShape.EXPLODE) {
      this.triggerCardReveal();
    } else {
      this.triggerCardHide();
    }
  }

  private triggerCardReveal() {
    this.cardActive = true;
    this.controls.autoRotate = false;
    this.controls.enabled = false;

    gsap.killTweensOf([this.camera.position, this.controls.target, this.cardGroup.scale, this.cardGroup.rotation, this.backgroundDim.material, this.cardFrame.material]);

    const timeline = gsap.timeline();

    const cardGeometry = this.cardMesh.geometry as THREE.BoxGeometry;
    const cardHeight = cardGeometry.parameters.height;
    const cardWidth = cardGeometry.parameters.width;
    const fov = this.camera.fov * (Math.PI / 180);
    const aspect = this.camera.aspect;
    
    const distHeight = (cardHeight / 1.6) / Math.tan(fov / 2);
    const distWidth = (cardWidth / 1.6) / (Math.tan(fov / 2) * aspect);
    const dist = Math.max(distHeight, distWidth);

    timeline.to(this.camera.position, {
      x: 0,
      y: 0,
      z: dist,
      duration: 1.5,
      ease: "power2.inOut",
      onUpdate: () => {
        this.camera.lookAt(0, 0, 0);
      }
    });

    timeline.to(this.controls.target, {
      x: 0,
      y: 0,
      z: 0,
      duration: 1.5,
      ease: "power2.inOut",
    }, 0);

    this.cardGroup.rotation.set(0, Math.PI * 2, Math.PI * 0.1); 
    timeline.to(this.cardGroup.scale, {
      x: 1,
      y: 1,
      z: 1,
      duration: 1.4,
      ease: "back.out(1.2)",
    }, 0.3);

    timeline.to(this.cardGroup.rotation, {
      y: 0,
      z: 0,
      duration: 1.4,
      ease: "power3.out",
    }, 0.3);

    const frameMat = this.cardFrame.material as THREE.MeshStandardMaterial;
    timeline.to(frameMat, {
      emissiveIntensity: 15.0,
      duration: 0.7,
      repeat: -1,
      yoyo: true,
      ease: "sine.inOut"
    }, 0.3);

    const dimMat = this.backgroundDim.material as THREE.MeshBasicMaterial;
    timeline.to(dimMat, {
      opacity: 0.75,
      duration: 1.2,
    }, 0.3);
  }

  private triggerCardHide() {
    this.cardActive = false;
    
    // Kill any existing card reveal or hide tweens to ensure logic follows through
    gsap.killTweensOf([this.cardGroup.scale, this.cardGroup.rotation, this.backgroundDim.material, this.camera.position, this.cardFrame.material]);

    const timeline = gsap.timeline();

    // Reset card visuals immediately or via fast tween
    timeline.to(this.cardGroup.scale, {
      x: 0,
      y: 0,
      z: 0,
      duration: 0.8,
      ease: "power2.in",
    });

    timeline.to(this.cardGroup.rotation, {
      y: -Math.PI,
      duration: 0.8,
      ease: "power2.in",
    }, 0);

    const dimMat = this.backgroundDim.material as THREE.MeshBasicMaterial;
    timeline.to(dimMat, {
      opacity: 0,
      duration: 0.6,
    }, 0);

    // Reset Camera Position
    timeline.to(this.camera.position, {
      x: this.originalCameraPos.x,
      y: this.originalCameraPos.y,
      z: this.originalCameraPos.z,
      duration: 1.5,
      ease: "power2.inOut",
      onComplete: () => {
        this.controls.enabled = true;
        this.controls.autoRotate = true;
      }
    }, 0);

    // Stop pulsing emissive intensity
    const frameMat = this.cardFrame.material as THREE.MeshStandardMaterial;
    gsap.to(frameMat, { emissiveIntensity: 5.0, duration: 0.5 });
  }

  private generateTargets(shape: ParticleShape) {
    for (let i = 0; i < CONFIG.PARTICLE_COUNT; i++) {
      this.targetPositions[i] = shape === ParticleShape.EXPLODE ? this.getExplodePosition() : this.getTreePosition();
    }
  }

  private onWindowResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.composer.setSize(window.innerWidth, window.innerHeight);
    
    if (this.cardActive) {
         const cardGeometry = this.cardMesh.geometry as THREE.BoxGeometry;
         if (cardGeometry) {
             const cardHeight = cardGeometry.parameters.height;
             const cardWidth = cardGeometry.parameters.width;
             const fov = this.camera.fov * (Math.PI / 180);
             const aspect = this.camera.aspect;
             const distHeight = (cardHeight / 1.6) / Math.tan(fov / 2);
             const distWidth = (cardWidth / 1.6) / (Math.tan(fov / 2) * aspect);
             const dist = Math.max(distHeight, distWidth);
             gsap.to(this.camera.position, { z: dist, duration: 0.5 });
         }
    }
  }

  private getExplodePosition(): ParticleData {
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos((Math.random() * 2) - 1);
    const radius = 35 + Math.random() * 25;
    return {
      x: radius * Math.sin(phi) * Math.cos(theta),
      y: radius * Math.sin(phi) * Math.sin(theta),
      z: radius * Math.cos(phi)
    };
  }

  private getTreePosition(): ParticleData {
    const h = Math.random(); 
    const y = (h * 12) - 6;
    const rMax = 6 * (1 - h);
    const r = rMax * Math.sqrt(Math.random()); 
    const theta = Math.random() * Math.PI * 2;
    return { x: r * Math.cos(theta), y: y, z: r * Math.sin(theta) };
  }

  private updateParticles() {
    let i = 0;
    const lerpSpeed = this.cardActive ? 0.03 : CONFIG.LERP_SPEED;

    for (let j = 0; j < this.sphereMesh.count; j++) {
      const current = this.currentPositions[i];
      const target = this.targetPositions[i];
      current.x += (target.x - current.x) * lerpSpeed;
      current.y += (target.y - current.y) * lerpSpeed;
      current.z += (target.z - current.z) * lerpSpeed;
      this.dummy.position.set(current.x, current.y, current.z);
      this.dummy.updateMatrix();
      this.sphereMesh.setMatrixAt(j, this.dummy.matrix);
      i++;
    }
    this.sphereMesh.instanceMatrix.needsUpdate = true;

    for (let j = 0; j < this.boxMesh.count; j++) {
      const current = this.currentPositions[i];
      const target = this.targetPositions[i];
      current.x += (target.x - current.x) * lerpSpeed;
      current.y += (target.y - current.y) * lerpSpeed;
      current.z += (target.z - current.z) * lerpSpeed;
      this.dummy.position.set(current.x, current.y, current.z);
      this.dummy.rotation.x += 0.01;
      this.dummy.updateMatrix();
      this.boxMesh.setMatrixAt(j, this.dummy.matrix);
      i++;
    }
    this.boxMesh.instanceMatrix.needsUpdate = true;
  }

  private animate() {
    this.animationId = requestAnimationFrame(this.animate.bind(this));
    if (!this.cardActive) this.controls.update();

    // Constant auto-rotation when in Tree mode
    if (this.currentShape === ParticleShape.TREE) {
      this.treeGroup.rotation.y += this.autoRotateConstant;
    }

    if (this.currentShape === ParticleShape.TREE) {
      this.snowMesh.visible = true;
      for (let i = 0; i < this.snowData.length; i++) {
        const p = this.snowData[i];
        p.y += p.vy!;
        if (p.y < -10) { p.y = 20; p.x = (Math.random() - 0.5) * 40; }
        this.dummy.position.set(p.x, p.y, p.z);
        this.dummy.updateMatrix();
        this.snowMesh.setMatrixAt(i, this.dummy.matrix);
      }
      this.snowMesh.instanceMatrix.needsUpdate = true;
    } else {
      this.snowMesh.visible = false;
    }

    if (this.currentShape === ParticleShape.TREE) {
        this.starMesh.rotation.y += 0.02;
        this.starMesh.scale.lerp(new THREE.Vector3(1, 1, 1), 0.05);
    } else {
        this.starMesh.scale.lerp(new THREE.Vector3(0, 0, 0), 0.1);
    }

    this.updateParticles();
    this.composer.render();
  }

  public cleanup() {
    if (this.animationId) cancelAnimationFrame(this.animationId);
    window.removeEventListener('resize', this.onWindowResize.bind(this));
    if (this.container && this.renderer.domElement) this.container.removeChild(this.renderer.domElement);
    this.renderer.dispose();
  }
}