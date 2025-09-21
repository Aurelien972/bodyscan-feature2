/**
 * OrbitTouchControls - Enhanced for 3D Avatar Viewer
 * Provides intuitive camera controls with touch and mouse support
 */

import * as THREE from 'three';

type OrbitTouchOpts = {
  target?: THREE.Vector3;
  minPolar?: number;
  maxPolar?: number;
  minDistance?: number;
  maxDistance?: number;
  enableDamping?: boolean;
  dampingFactor?: number;
  enablePan?: boolean;
  enableZoom?: boolean;
  autoRotateSpeed?: number; // radians/sec
};

type CameraPreset = 'front' | 'profile' | 'back' | 'threequarter';

const EPS = 1e-6;

export class OrbitTouchControls {
  private camera: THREE.PerspectiveCamera;
  private domElement: HTMLElement;

  private target: THREE.Vector3;
  private spherical: THREE.Spherical;
  private sphericalDelta: THREE.Spherical;
  private scale = 1;
  private panOffset: THREE.Vector3;

  private minDistance: number;
  private maxDistance: number;
  private minPolar: number;
  private maxPolar: number;
  private enableDamping: boolean;
  private dampingFactor: number;
  private enablePan: boolean;
  private enableZoom: boolean;
  private autoRotateSpeed: number; // radians/sec

  private enabled = true;
  private autoRotate = false;
  private isUserInteracting = false;

  private pointers: PointerEvent[] = [];
  private pointerPositions: Record<number, THREE.Vector2> = {};

  private animationId: number | null = null;
  private lastFrameTs = performance.now();

  private lastTapTime = 0;
  private homeSpherical: THREE.Spherical;

  // stable handlers (arrow fns) so removeEventListener works
  private onPointerDownHandler = (e: PointerEvent) => this.onPointerDown(e);
  private onPointerMoveHandler = (e: PointerEvent) => this.onPointerMove(e);
  private onPointerUpHandler   = (e: PointerEvent) => this.onPointerUp(e);
  private onWheelHandler       = (e: WheelEvent)   => this.onWheel(e);
  private onContextMenuHandler = (e: Event)        => this.onContextMenu(e);

  constructor(camera: THREE.PerspectiveCamera, domElement: HTMLElement, opts?: OrbitTouchOpts) {
    this.camera = camera;
    this.domElement = domElement;

    this.target = opts?.target?.clone() ?? new THREE.Vector3(0, 1, 0);
    this.minDistance = opts?.minDistance ?? 1.5;
    this.maxDistance = opts?.maxDistance ?? 8;
    this.minPolar = Math.max(0.01, opts?.minPolar ?? 0.15);
    this.maxPolar = Math.min(Math.PI - 0.01, opts?.maxPolar ?? 1.35);
    this.enableDamping = opts?.enableDamping ?? true;
    this.dampingFactor = opts?.dampingFactor ?? 0.08;
    this.enablePan = opts?.enablePan ?? true;
    this.enableZoom = opts?.enableZoom ?? true;
    this.autoRotateSpeed = opts?.autoRotateSpeed ?? (Math.PI / 30);

    this.spherical = new THREE.Spherical();
    this.sphericalDelta = new THREE.Spherical(0, 0, 0);
    this.panOffset = new THREE.Vector3();

    this.updateSphericalFromCamera();
    // default "home" = current spherical
    this.homeSpherical = this.spherical.clone();

    this.setupEventListeners();

    console.log('🔍 [OrbitTouchControls] Initialized', {
      target: this.target, minDistance: this.minDistance, maxDistance: this.maxDistance,
      minPolar: this.minPolar, maxPolar: this.maxPolar, enableDamping: this.enableDamping,
    });
  }

  /** Public API */

  setTarget(target: THREE.Vector3): void {
    this.target.copy(target);
    this.updateSphericalFromCamera();
    this.homeSpherical = this.spherical.clone();
  }

  setDistanceLimits(min: number, max: number): void {
    this.minDistance = min;
    this.maxDistance = Math.max(max, min + 0.01);
  }

  fitToObject(object: THREE.Object3D, marginPct: number = 0.08): void {
    const box = new THREE.Box3().setFromObject(object);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());

    console.log('🔍 [OrbitTouchControls] fitToObject called with object details:', {
      objectName: object.name,
      objectType: object.constructor.name,
      objectUuid: object.uuid,
      boundingBoxSize: size.toArray(),
      boundingBoxCenter: center.toArray(),
      marginPct
    });

    // MODIFIED: Ajustement vertical pour le corps entier
    // Cibler le centre de la bounding box, puis ajuster légèrement vers le haut
    // pour que l'avatar soit bien centré verticalement dans la vue.
    this.target.copy(center);
    this.target.y = center.y + (size.y * 0.15); // Ajustement léger vers le haut

    const maxDim = Math.max(size.x, size.y, size.z);
    const fov = this.camera.fov * (Math.PI / 180);
    
    // Enhanced responsive distance calculation
    const baseDistance = (maxDim / (2 * Math.tan(fov / 2))) * (1 + marginPct * 2);
    
    // Adjust distance based on screen size for better framing
    const screenHeight = window.innerHeight;
    const isSmallScreen = screenHeight < 700;
    const isMediumScreen = screenHeight >= 700 && screenHeight < 1000;

    const distanceMultiplier = isSmallScreen ? 1.3 : 
                              isMediumScreen ? 1.2 : 
                              1.15;
    
    const distance = baseDistance * distanceMultiplier;

    const clamped = THREE.MathUtils.clamp(distance, this.minDistance, this.maxDistance);

    console.log('🔍 [OrbitTouchControls] Camera distance calculation:', {
      maxDimension: maxDim.toFixed(3),
      fovRadians: fov.toFixed(3),
      baseDistance: baseDistance.toFixed(3),
      finalDistance: distance.toFixed(3),
      clampedDistance: clamped.toFixed(3),
      distanceLimits: { min: this.minDistance, max: this.maxDistance },
      wasDistanceClamped: distance !== clamped
    });

    this.spherical.radius = clamped;
    
    // CRITICAL FIX: Set horizontal viewing angle for optimal centering
    const phi = Math.PI / 2.0; // 90 degrees - horizontal view at target level
    
    this.spherical.phi = phi;
    this.spherical.theta = Math.PI / 4; // Keep 45° horizontal angle
    
    this.updateCameraFromSpherical(true);

    // set "home" to the fitted pose
    this.homeSpherical = this.spherical.clone();

    console.log('🔍 [OrbitTouchControls] Fitted to object completed', { 
      objectName: object.name,
      size: size.toArray(), 
      center: center.toArray(), 
      baseDistance: baseDistance.toFixed(3),
      calculatedDistance: distance.toFixed(3),
      clampedDistance: clamped.toFixed(3),
      responsiveAdjustments: {
        screenHeight,
        screenCategory: isSmallScreen ? 'small' : isMediumScreen ? 'medium' : 'large',
        targetY: this.target.y.toFixed(3),
        distanceMultiplier: distanceMultiplier.toFixed(3),
        cameraAngle: phi.toFixed(3)
      },
      cameraPosition: {
        radius: this.spherical.radius.toFixed(3),
        phi: this.spherical.phi.toFixed(3),
        theta: this.spherical.theta.toFixed(3)
      },
      targetPosition: {
        x: this.target.x.toFixed(3),
        y: this.target.y.toFixed(3),
        z: this.target.z.toFixed(3)
      }
    });
  }

  // NOUVEAU: Méthode pour ajuster la caméra à une BoundingBox spécifique
  fitToBoundingBox(box: THREE.Box3, marginPct: number = 0.08): void {
    if (!box || box.isEmpty()) {
      console.warn('ORBIT_CONTROLS', 'Cannot fit to empty or invalid bounding box.');
      return;
    }

    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());

    // Set target to the center of the bounding box
    this.target.copy(center);

    const maxDim = Math.max(size.x, size.y, size.z);
    const fov = this.camera.fov * (Math.PI / 180);

    // Calculate distance to fit the object within the view
    let distance = (maxDim / (2 * Math.tan(fov / 2))) * (1 + marginPct * 2);

    // Clamp distance within min/max limits
    distance = THREE.MathUtils.clamp(distance, this.minDistance, this.maxDistance);

    this.spherical.radius = distance;

    // Set default viewing angles (e.g., front view, slightly from above)
    this.spherical.phi = Math.PI / 2; // Directly in front (horizontal plane)
    this.spherical.theta = 0; // Front view

    this.updateCameraFromSpherical(true);
    this.homeSpherical = this.spherical.clone();

    console.log('ORBIT_CONTROLS', 'Fitted camera to bounding box', {
      boxMin: box.min.toArray(),
      boxMax: box.max.toArray(),
      boxCenter: center.toArray(),
      boxSize: size.toArray(),
      calculatedDistance: distance.toFixed(3),
      finalTarget: this.target.toArray(),
      finalSpherical: {
        radius: this.spherical.radius.toFixed(3),
        phi: this.spherical.phi.toFixed(3),
        theta: this.spherical.theta.toFixed(3)
      }
    });
  }

  async snapTo(preset: CameraPreset): Promise<void> {
    const targetS = this.getPresetSpherical(preset);
    const startS = this.spherical.clone();
    const duration = 800;
    const t0 = performance.now();

    if ('vibrate' in navigator) try { navigator.vibrate(8); } catch {}

    return new Promise((resolve) => {
      const step = () => {
        const t = performance.now();
        const p = Math.min((t - t0) / duration, 1);
        const eased = 1 - Math.pow(1 - p, 3);

        this.spherical.radius = THREE.MathUtils.lerp(startS.radius, targetS.radius, eased);
        this.spherical.phi    = THREE.MathUtils.lerp(startS.phi,    targetS.phi,    eased);
        this.spherical.theta  = THREE.MathUtils.lerp(startS.theta,  targetS.theta,  eased);

        this.updateCameraFromSpherical(true);

        if (p < 1) requestAnimationFrame(step);
        else resolve();
      };
      requestAnimationFrame(step);
    });
  }

  setAutoRotate(enabled: boolean): void {
    this.autoRotate = enabled;
  }

  reset(): void {
    this.spherical.copy(this.homeSpherical);
    this.panOffset.set(0, 0, 0);
    this.updateCameraFromSpherical(true);
  }

  /**
   * Sets the camera's distance from the target directly.
   */
  setCameraDistance(distance: number): void {
    this.spherical.radius = THREE.MathUtils.clamp(distance, this.minDistance, this.maxDistance);
    this.updateCameraFromSpherical(true);
  }

  enable(): void {
    this.enabled = true;
  }

  disable(): void {
    this.enabled = false;
    this.isUserInteracting = false;
    this.pointers = [];
    this.pointerPositions = {};
  }

  dispose(): void {
    this.disable();

    this.domElement.removeEventListener('pointerdown', this.onPointerDownHandler);
    this.domElement.removeEventListener('pointermove', this.onPointerMoveHandler);
    this.domElement.removeEventListener('pointerup',   this.onPointerUpHandler);
    this.domElement.removeEventListener('wheel',       this.onWheelHandler as any);
    this.domElement.removeEventListener('contextmenu', this.onContextMenuHandler);
  }

  /** Internals */

  private getPresetSpherical(preset: CameraPreset): THREE.Spherical {
    const d = this.spherical.radius;
    switch (preset) {
      case 'front':        return new THREE.Spherical(d, Math.PI / 2, 0);
      case 'profile':      return new THREE.Spherical(d, Math.PI / 2, Math.PI / 2);
      case 'back':         return new THREE.Spherical(d, Math.PI / 2, Math.PI);
      case 'threequarter': return new THREE.Spherical(d, Math.PI / 3, Math.PI / 4);
      default:             return this.spherical.clone();
    }
  }

  private setupEventListeners(): void {
    this.domElement.addEventListener('pointerdown', this.onPointerDownHandler);
    this.domElement.addEventListener('pointermove', this.onPointerMoveHandler);
    this.domElement.addEventListener('pointerup',   this.onPointerUpHandler);
    // wheel must be passive:false if we call preventDefault
    this.domElement.addEventListener('wheel', this.onWheelHandler, { passive: false });
    this.domElement.addEventListener('contextmenu', this.onContextMenuHandler);
  }

  private onPointerDown(event: PointerEvent): void {
    if (!this.enabled) return;
    // Avoid iOS double handling with touch scrolling
    if (event.pointerType === 'touch') event.preventDefault();

    this.pointers.push(event);
    this.pointerPositions[event.pointerId] = new THREE.Vector2(event.clientX, event.clientY);
    this.isUserInteracting = true;
    this.domElement.setPointerCapture?.(event.pointerId);

    // double-tap detection (pointer-based)
    const now = performance.now();
    if (event.pointerType === 'touch' && now - this.lastTapTime < 300) {
      this.reset();
      if ('vibrate' in navigator) try { navigator.vibrate(15); } catch {}
    }
    this.lastTapTime = now;
  }

  private onPointerMove(event: PointerEvent): void {
    if (!this.enabled || !this.isUserInteracting) return;

    const idx = this.pointers.findIndex(p => p.pointerId === event.pointerId);
    if (idx === -1) return;
    this.pointers[idx] = event;

    if (this.pointers.length === 1) {
      this.handleOrbit(event);
    } else if (this.pointers.length === 2) {
      this.handlePanAndZoom();
    }
  }

  private onPointerUp(event: PointerEvent): void {
    const idx = this.pointers.findIndex(p => p.pointerId === event.pointerId);
    if (idx !== -1) this.pointers.splice(idx, 1);
    delete this.pointerPositions[event.pointerId];

    if (this.pointers.length === 0) this.isUserInteracting = false;
    this.domElement.releasePointerCapture?.(event.pointerId);
  }

  private handleOrbit(event: PointerEvent): void {
    const position = this.pointerPositions[event.pointerId];
    if (!position) return;

    const dx = event.clientX - position.x;
    const dy = event.clientY - position.y;

    const rotateSpeed = (2 * Math.PI) / Math.max(1, this.domElement.clientHeight);
    this.sphericalDelta.theta -= dx * rotateSpeed;
    this.sphericalDelta.phi   -= dy * rotateSpeed;

    position.set(event.clientX, event.clientY);
  }

  private handlePanAndZoom(): void {
    if (this.pointers.length !== 2) return;

    const [p1, p2] = this.pointers;
    const prev1 = this.pointerPositions[p1.pointerId];
    const prev2 = this.pointerPositions[p2.pointerId];
    if (!prev1 || !prev2) return;

    const cur1 = new THREE.Vector2(p1.clientX, p2.clientY);
    const cur2 = new THREE.Vector2(p2.clientX, p2.clientY);

    // pinch zoom
    const curDist = cur1.distanceTo(cur2);
    const prevDist = prev1.distanceTo(prev2);
    if (prevDist > 0) {
      const zoomDelta = curDist / prevDist;
      this.scale *= zoomDelta;
    }

    // pan (move target & camera together in screen-space → world)
    if (this.enablePan) {
      const curCenter  = cur1.clone().add(cur2).multiplyScalar(0.5);
      const prevCenter = prev1.clone().add(prev2).multiplyScalar(0.5);
      const delta = curCenter.sub(prevCenter);

      const panSpeed = 0.002 * this.spherical.radius;

      // compute pan in camera space axes
      const te = this.camera.matrix.elements;
      // camera basis vectors
      const xAxis = new THREE.Vector3(te[0], te[1], te[2]).normalize().multiplyScalar(-delta.x * panSpeed);
      const yAxis = new THREE.Vector3(te[4], te[5], te[6]).normalize().multiplyScalar( delta.y * panSpeed);

      this.panOffset.add(xAxis).add(yAxis);
    }

    // update stored positions
    this.pointerPositions[p1.pointerId].copy(cur1);
    this.pointerPositions[p2.pointerId].copy(cur2);
  }

  private onWheel(event: WheelEvent): void {
    if (!this.enabled || !this.enableZoom) return;
    event.preventDefault();

    // scale factor with smoothness
    const zoomFactor = Math.pow(0.95, event.deltaY / 53); // ~1 notch
    this.scale *= zoomFactor;
  }

  private onContextMenu(event: Event): void {
    event.preventDefault();
  }

  private updateSphericalFromCamera(): void {
    const offset = new THREE.Vector3().subVectors(this.camera.position, this.target);
    this.spherical.setFromVector3(offset);
  }

  private updateCameraFromSpherical(force = false): void {
    // apply deltas
    this.spherical.theta += this.sphericalDelta.theta;
    this.spherical.phi   += this.sphericalDelta.phi;
    this.spherical.radius *= this.scale;

    // constraints
    this.spherical.phi = THREE.MathUtils.clamp(this.spherical.phi, this.minPolar, this.maxPolar);
    this.spherical.radius = THREE.MathUtils.clamp(this.spherical.radius, this.minDistance, this.maxDistance);

    // apply pan to target (move both camera & target)
    if (!this.panOffset.equals(new THREE.Vector3())) {
      this.target.add(this.panOffset);
    }

    // compute camera position
    const offset = new THREE.Vector3().setFromSpherical(this.spherical);
    this.camera.position.copy(this.target).add(offset);
    this.camera.lookAt(this.target);

    // damping
    if (this.enableDamping) {
      this.sphericalDelta.theta *= (1 - this.dampingFactor);
      this.sphericalDelta.phi   *= (1 - this.dampingFactor);
      this.panOffset.multiplyScalar(1 - this.dampingFactor);
    } else {
      this.sphericalDelta.set(0, 0, 0);
      this.panOffset.set(0, 0, 0);
    }

    this.scale = 1;
    // no need for zoomChanged flag with continuous loop
  }

  /**
   * Update controls - should be called in the main render loop
   */
  public update(): void {
    if (!this.enabled) return;

    const now = performance.now();
    const dt = Math.max(0, (now - this.lastFrameTs) / 1000);
    this.lastFrameTs = now;

    // auto-rotation (time based)
    if (this.autoRotate && !this.isUserInteracting) {
      this.sphericalDelta.theta -= this.autoRotateSpeed * dt;
    }

    const needUpdate =
      this.enableDamping ||
      this.autoRotate ||
      this.isUserInteracting ||
      Math.abs(this.sphericalDelta.theta) > EPS ||
      Math.abs(this.sphericalDelta.phi) > EPS ||
      !this.panOffset.equals(new THREE.Vector3()) ||
      Math.abs(this.scale - 1) > EPS;

    if (needUpdate) this.updateCameraFromSpherical();
  }
}
