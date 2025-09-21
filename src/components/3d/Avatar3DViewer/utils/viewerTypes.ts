import * as THREE from 'three';
import { OrbitTouchControls } from '../../../../lib/3d/camera/OrbitTouchControls';
import { SkinToneV2 } from '../../../../lib/scan/normalizeSkinTone'; // ADDED

// Payload status type for strict state management
type PayloadStatus = 'pending' | 'ready' | 'error';

export interface PreparedPayload {
  status: PayloadStatus;
  shape_params: Record<string, number>;
  limb_masses: Record<string, number>;
  strategy: string;
  confidence: number;
  error?: string;
}

export interface Avatar3DViewerProps {
  scanResult?: any;
  userProfile: {
    sex: 'male' | 'female';
    height_cm: number;
    weight_kg: number;
  };
  morphData?: Record<string, number>;
  limbMasses?: Record<string, number>;
  skinTone?: SkinToneV2 | null; // MODIFIED: Use SkinToneV2
  minMaxBounds?: Record<string, { min: number; max: number }>;
  selectedArchetypes?: Array<any>;
  serverScanId?: string;
  resolvedGender?: 'male' | 'female';
  savedAvatarPayload?: {
    final_shape_params: Record<string, number>;
    final_limb_masses: Record<string, number>;
    skin_tone: any;
    resolved_gender: 'male' | 'female';
    gltf_model_id: string;
    material_config_version: string;
    mapping_version: string;
    avatar_version: string;
  };
  className?: string;
  autoRotate?: boolean;
  onMorphDataChange?: (morphData: Record<string, number>) => void;
  showControls?: boolean;
  onViewerReady?: () => void;
  faceMorphData?: Record<string, number>; // ADDED
  faceSkinTone?: SkinToneV2 | null; // ADDED
  faceOnly?: boolean; // ADDED
}

export interface Avatar3DViewerRef {
  getCameraControls: () => OrbitTouchControls | null;
  updateMorphData: (morphData: Record<string, number>) => void;
  resetCamera: () => void;
  setCameraView: (view: 'front' | 'profile' | 'threequarter') => void;
  toggleAutoRotate: () => void;
  setCameraDistance: (distance: number) => void; // Nouvelle méthode pour le zoom direct
  forceMorphsUpdate: (morphData: Record<string, number>) => void;
}

export interface ViewerState {
  isLoading: boolean;
  error: string | null;
  isInitialized: boolean;
  isViewerReady: boolean;
  activeView: 'front' | 'profile' | 'threequarter';
  isAutoRotating: boolean;
}

interface SceneState {
  scene: THREE.Scene | null;
  renderer: THREE.WebGLRenderer | null;
  camera: THREE.PerspectiveCamera | null;
  controls: OrbitTouchControls | null;
  ready: boolean;
  initializationId: string | null;
}

interface ModelState {
  model: THREE.Group | null;
  mainMesh: THREE.SkinnedMesh | null;
  skeletonHelper: THREE.SkeletonHelper | null;
  loaded: boolean;
  loading: boolean;
}

interface MorphState {
  applied: boolean;
  applying: boolean;
  lastAppliedHash: string | null;
}

interface MaterialState {
  configured: boolean;
  configuring: boolean;
  lastConfiguredSkinTone: string | null;
}

