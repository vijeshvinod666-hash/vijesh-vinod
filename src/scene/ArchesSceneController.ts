import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import {
  DOCUMENTARY_DURATION,
  interpolateAtmosphere,
  interpolateCamera,
} from '../documentary/scriptData';
import { createProceduralTextures } from './textures';
import { buildArchesWorldGeometry } from './geometries';
import { createSkyAndStars } from './skyAndStars';
import { groundHeightAt } from './terrainMath';

export interface SceneCallbacks {
  onTimeUpdate: (timeSec: number, isPlaying: boolean) => void;
  onUserOrbitStart: () => void;
  onPlaybackComplete: () => void;
  onContextLost: (lost: boolean) => void;
}

// Pre-allocated scratch vectors (zero GC in animation loop)
const _sunDir = new THREE.Vector3();
const _desiredPos = new THREE.Vector3();
const _desiredTarget = new THREE.Vector3();
const _fogColor = new THREE.Color();

function detectSoftwareGl(): boolean {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param) || '');
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return false;
  }
}

export class ArchesSceneController {
  private container: HTMLElement;
  private callbacks: SceneCallbacks;
  private isSoftwareGl: boolean;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private controls: OrbitControls;
  private keyLight: THREE.DirectionalLight;
  private rimLight: THREE.DirectionalLight;
  private hemiLight: THREE.HemisphereLight;
  private fog: THREE.FogExp2;
  private envRT: THREE.WebGLRenderTarget;

  private textures: ReturnType<typeof createProceduralTextures>;
  private world: ReturnType<typeof buildArchesWorldGeometry>;
  private skyRig: ReturnType<typeof createSkyAndStars>;

  private frameId = 0;
  private disposed = false;
  private isPlaying = false;
  private currentTime = 0;
  private autoCamera = true;
  private snapCameraNextFrame = true;
  private lastTickMs = 0;
  private lastUiSyncMs = 0;
  private animElapsed = 0;

  private handleResizeBound: () => void;
  private handleContextLostBound: (e: Event) => void;
  private handleContextRestoredBound: () => void;

  constructor(container: HTMLElement, callbacks: SceneCallbacks) {
    this.container = container;
    this.callbacks = callbacks;
    this.isSoftwareGl = detectSoftwareGl();

    const width = Math.max(1, container.clientWidth || window.innerWidth);
    const height = Math.max(1, container.clientHeight || window.innerHeight);

    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl,
      powerPreference: 'high-performance',
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.08;
    this.renderer.setPixelRatio(this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(width, height);
    this.renderer.shadowMap.enabled = !this.isSoftwareGl;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.domElement.style.display = 'block';
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    this.renderer.domElement.setAttribute('data-testid', 'arches-webgl-canvas');
    container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.fog = new THREE.FogExp2(0xd98a63, 0.0048);
    this.scene.fog = this.fog;
    this.scene.background = new THREE.Color(0xd98a63);

    // Studio environment reflection via RoomEnvironment + PMREMGenerator
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    const roomEnv = new RoomEnvironment();
    this.envRT = pmrem.fromScene(roomEnv, 0.04);
    this.scene.environment = this.envRT.texture;
    this.scene.environmentIntensity = 0.42;
    roomEnv.dispose();
    pmrem.dispose();

    this.camera = new THREE.PerspectiveCamera(46, width / height, 0.3, 450);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = !this.isSoftwareGl;
    this.controls.dampingFactor = 0.06;
    this.controls.maxPolarAngle = Math.PI * 0.49;
    this.controls.minDistance = 7;
    this.controls.maxDistance = 85;
    this.controls.enablePan = true;

    this.controls.addEventListener('start', () => {
      if (this.autoCamera) {
        this.autoCamera = false;
        this.callbacks.onUserOrbitStart();
      }
    });

    // 3-point warm/cool desert lighting rig (1 shadow caster with tight frustum)
    this.hemiLight = new THREE.HemisphereLight(0x94bdf5, 0x853d24, 0.72);
    this.scene.add(this.hemiLight);

    this.keyLight = new THREE.DirectionalLight(0xffb873, 2.8);
    this.keyLight.castShadow = !this.isSoftwareGl;
    this.keyLight.shadow.mapSize.set(1024, 1024);
    const d = 44;
    this.keyLight.shadow.camera.left = -d;
    this.keyLight.shadow.camera.right = d;
    this.keyLight.shadow.camera.top = d;
    this.keyLight.shadow.camera.bottom = -d;
    this.keyLight.shadow.camera.near = 2;
    this.keyLight.shadow.camera.far = 160;
    this.keyLight.shadow.bias = -0.0005;
    this.keyLight.shadow.normalBias = 0.02;
    this.scene.add(this.keyLight);
    this.scene.add(this.keyLight.target);

    // Subtle canyon bounce rim light from opposite side
    this.rimLight = new THREE.DirectionalLight(0xff8a54, 0.55);
    this.rimLight.position.set(-40, 18, 35);
    this.scene.add(this.rimLight);

    // Build procedural textures, sky/stars, and composite 3D world geometry
    const maxAniso = this.renderer.capabilities.getMaxAnisotropy();
    this.textures = createProceduralTextures(maxAniso);
    this.skyRig = createSkyAndStars(this.textures.starGlow);
    this.scene.add(this.skyRig.group);

    this.world = buildArchesWorldGeometry(this.textures);
    this.scene.add(this.world.root);

    // Apply initial frame 0:00 immediately
    this.applySceneAtTime(0, 0.016, true);

    if (!this.isSoftwareGl) {
      this.renderer.compile(this.scene, this.camera);
    }

    this.handleResizeBound = this.onResize.bind(this);
    this.handleContextLostBound = (e: Event) => {
      e.preventDefault();
      this.callbacks.onContextLost(true);
    };
    this.handleContextRestoredBound = () => {
      this.callbacks.onContextLost(false);
    };

    window.addEventListener('resize', this.handleResizeBound);
    this.renderer.domElement.addEventListener('webglcontextlost', this.handleContextLostBound);
    this.renderer.domElement.addEventListener('webglcontextrestored', this.handleContextRestoredBound);

    this.lastTickMs = performance.now();
    this.startLoop();
  }

  public setPlaying(playing: boolean): void {
    if (playing && this.currentTime >= DOCUMENTARY_DURATION - 0.05) {
      this.currentTime = 0;
      this.snapCameraNextFrame = true;
    }
    this.isPlaying = playing;
    if (playing) {
      this.autoCamera = true;
    }
    this.callbacks.onTimeUpdate(this.currentTime, this.isPlaying);
  }

  public seekTo(timeSec: number, snapCamera = false): void {
    this.currentTime = Math.max(0, Math.min(DOCUMENTARY_DURATION, timeSec));
    this.autoCamera = true;
    if (snapCamera) {
      this.snapCameraNextFrame = true;
    }
    this.callbacks.onTimeUpdate(this.currentTime, this.isPlaying);
  }

  public resumeAutoCamera(): void {
    this.autoCamera = true;
  }

  public getCurrentTime(): number {
    return this.currentTime;
  }

  private onResize(): void {
    if (this.disposed) return;
    const width = Math.max(1, this.container.clientWidth || window.innerWidth);
    const height = Math.max(1, this.container.clientHeight || window.innerHeight);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  private applySceneAtTime(t: number, dt: number, snapCamera: boolean): void {
    const atmo = interpolateAtmosphere(t);

    // Sun position from elevation & azimuth
    const elevRad = THREE.MathUtils.degToRad(atmo.sunElevationDeg);
    const azimRad = THREE.MathUtils.degToRad(atmo.sunAzimuthDeg);
    _sunDir.set(
      Math.cos(elevRad) * Math.sin(azimRad),
      Math.sin(elevRad),
      Math.cos(elevRad) * Math.cos(azimRad),
    );

    this.keyLight.position.copy(_sunDir).multiplyScalar(75);
    this.keyLight.color.setRGB(atmo.sunColor[0], atmo.sunColor[1], atmo.sunColor[2]);
    this.keyLight.intensity = atmo.sunIntensity;

    this.hemiLight.color.setRGB(atmo.hemiSky[0], atmo.hemiSky[1], atmo.hemiSky[2]);
    this.hemiLight.groundColor.setRGB(atmo.hemiGround[0], atmo.hemiGround[1], atmo.hemiGround[2]);
    this.hemiLight.intensity = atmo.hemiIntensity;

    this.rimLight.intensity = 0.55 * (1.0 - atmo.starVisibility * 0.72);
    this.scene.environmentIntensity = THREE.MathUtils.lerp(0.42, 0.16, atmo.starVisibility);

    _fogColor.setRGB(atmo.fogColor[0], atmo.fogColor[1], atmo.fogColor[2]);
    this.fog.color.copy(_fogColor);
    this.fog.density = atmo.fogDensity;
    if (this.scene.background instanceof THREE.Color) {
      this.scene.background.copy(_fogColor);
    }

    this.renderer.toneMappingExposure = atmo.exposure;
    this.skyRig.update(atmo, this.animElapsed, _sunDir);

    // Subtle wildlife life & kinematics (always grounded/organic)
    const { wildlife } = this.world;
    wildlife.deer1Head.rotation.z = -0.25 + Math.sin(this.animElapsed * 0.9) * 0.22;
    wildlife.deer1Head.rotation.y = Math.sin(this.animElapsed * 0.45) * 0.18;
    wildlife.deer2Head.rotation.z = -0.35 + Math.cos(this.animElapsed * 0.75) * 0.18;

    // Soaring Golden Eagle circling gently over canyon
    const eagleAngle = this.animElapsed * 0.22;
    const eagleX = Math.cos(eagleAngle) * 20;
    const eagleZ = -4 + Math.sin(eagleAngle) * 16;
    const eagleY = 21 + Math.sin(this.animElapsed * 0.6) * 1.4;
    wildlife.eagleGroup.position.set(eagleX, eagleY, eagleZ);
    wildlife.eagleGroup.rotation.y = -eagleAngle;
    wildlife.eagleGroup.rotation.z = 0.18;
    const flap = Math.sin(this.animElapsed * 3.4) * 0.18;
    wildlife.eagleLeftWing.rotation.z = flap;
    wildlife.eagleRightWing.rotation.z = -flap;
    wildlife.eagleGroup.visible = atmo.starVisibility < 0.75;

    // Camera choreography with smooth exponential damping when Auto-Camera is active
    if (this.autoCamera) {
      const camFrame = interpolateCamera(t);
      _desiredPos.set(camFrame.position[0], camFrame.position[1], camFrame.position[2]);
      _desiredTarget.set(camFrame.target[0], camFrame.target[1], camFrame.target[2]);

      const minClearance = groundHeightAt(_desiredPos.x, _desiredPos.z) + 1.5;
      if (_desiredPos.y < minClearance) {
        _desiredPos.y = minClearance;
      }

      if (snapCamera) {
        this.camera.position.copy(_desiredPos);
        this.controls.target.copy(_desiredTarget);
        this.camera.fov = camFrame.fov;
        this.camera.updateProjectionMatrix();
      } else {
        const lambda = 4.5;
        const alpha = 1 - Math.exp(-lambda * Math.min(dt, 0.1));
        this.camera.position.lerp(_desiredPos, alpha);
        this.controls.target.lerp(_desiredTarget, alpha);
        const nextFov = THREE.MathUtils.lerp(this.camera.fov, camFrame.fov, alpha);
        if (Math.abs(nextFov - this.camera.fov) > 0.01) {
          this.camera.fov = nextFov;
          this.camera.updateProjectionMatrix();
        }
      }
    }

    this.controls.update();
  }

  private afterDraw(cb: () => void): void {
    const gl = this.renderer.getContext() as WebGL2RenderingContext;
    if (typeof gl.fenceSync === 'function') {
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        if (this.disposed) return;
        const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          this.frameId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          this.frameId = window.setTimeout(cb, 80);
        }
      };
      this.frameId = window.setTimeout(poll, 5);
    } else {
      this.frameId = window.setTimeout(cb, 80);
    }
  }

  private startLoop(): void {
    const tick = () => {
      if (this.disposed) return;
      const now = performance.now();
      const rawDt = Math.max(0.001, (now - this.lastTickMs) / 1000);
      const dt = Math.min(rawDt, 0.25);
      this.lastTickMs = now;
      this.animElapsed += dt;

      if (this.isPlaying) {
        this.currentTime += dt;
        if (this.currentTime >= DOCUMENTARY_DURATION) {
          this.currentTime = DOCUMENTARY_DURATION;
          this.isPlaying = false;
          this.callbacks.onTimeUpdate(this.currentTime, false);
          this.callbacks.onPlaybackComplete();
        } else if (now - this.lastUiSyncMs >= 100) {
          this.lastUiSyncMs = now;
          this.callbacks.onTimeUpdate(this.currentTime, true);
        }
      }

      this.applySceneAtTime(this.currentTime, dt, this.snapCameraNextFrame);
      this.snapCameraNextFrame = false;

      this.renderer.render(this.scene, this.camera);

      if (this.isSoftwareGl) {
        this.afterDraw(tick);
      } else {
        this.frameId = requestAnimationFrame(tick);
      }
    };

    if (this.isSoftwareGl) {
      this.frameId = window.setTimeout(tick, 16);
    } else {
      this.frameId = requestAnimationFrame(tick);
    }
  }

  public dispose(): void {
    this.disposed = true;
    cancelAnimationFrame(this.frameId);
    clearTimeout(this.frameId);

    window.removeEventListener('resize', this.handleResizeBound);
    this.renderer.domElement.removeEventListener('webglcontextlost', this.handleContextLostBound);
    this.renderer.domElement.removeEventListener('webglcontextrestored', this.handleContextRestoredBound);

    this.controls.dispose();
    this.skyRig.dispose();
    this.world.dispose();
    this.textures.dispose();
    this.envRT.dispose();
    this.renderer.dispose();

    if (this.renderer.domElement.parentElement === this.container) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}
