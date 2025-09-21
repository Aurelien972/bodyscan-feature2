// src/domain/types.ts
/**
 * Domain Types - Simplified for Body Scan
 * Essential type definitions for Body Scan functionality
 */

type ID = string;

type RetakeReason =
  | 'blur'
  | 'under_exposed'
  | 'over_exposed'
  | 'multiple_people'
  | 'no_person'
  | 'arms_not_clear'
  | 'feet_missing'
  | 'profile_angle_bad'
  | 'background_busy'
  | 'face_not_detected'
  | 'resolution_too_low'
  | 'inconsistent_views'
  | 'low_overall_quality';

export interface PhotoCaptureReport {
  view: 'front' | 'profile';
  device: {
    brand: string;
    model: string;
    os: string;
  };
  camera: {
    focal_length_mm: number | null;
    iso: number | null;
    exposure_ms: number | null;
  };
  image: {
    width: number;
    height: number;
    filesize: number;
    format: string;
  };
  quality: {
    blur_score: number;
    brightness: number;
    exposure_ok: boolean;
    noise_score: number;
  };
  content: {
    single_person: boolean;
    pose_ok: boolean;
    skeleton_keypoints: any[] | null;
    face_detected: boolean;
    face_bbox_norm: [number, number, number, number] | null;
  };
  scale: {
    pixel_per_cm_estimate: number | null;
    method: 'face-heuristic' | 'sheet-A4' | 'none';
  };
  bg: {
    background_segmentable: boolean;
    dominant_color: string;
  };
  validation?: {
    isValid: boolean;
    issues: string[];
    retakeReasons: RetakeReason[];
    confidence: number;
  };
  skin_tone?: {
    r: number;
    g: number;
    b: number;
    confidence?: number;
  };
}


export interface CapturedPhotoEnhanced {
  file: File;
  url: string;
  type: 'front' | 'profile';
  validationResult?: {
    isValid: boolean;
    issues: string[];
    retakeReasons: RetakeReason[];
    confidence: number;
  };
  captureReport: PhotoCaptureReport;
}

interface ValidationResult {
  isValid: boolean;
  issues: string[];
  confidence: number;
}

export interface ValidationSummary {
  score: number;
  status: 'success' | 'warning' | 'error';
  blockingIssues: string[];
  warnings: string[];
  recommendations: string[];
  appliedFixes: string[];
  outlierFlags: string[];
  userMessage: string;
  canProceed: boolean;
}
