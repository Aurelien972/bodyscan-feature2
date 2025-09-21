/**
 * Normalize Skin Tone - Unified Extraction
 * Single source of truth for skin tone extraction from scan data
 */

import logger from '../utils/logger';

/**
 * SkinToneV2 - Format canonique pour la couleur de peau
 * Source de vérité unique avec schéma strict
 */
export type SkinToneV2 = {
  schema: 'v2';
  space: 'sRGB';
  format: 'rgb255';
  rgb: { r: number; g: number; b: number }; // sRGB 8 bits (0-255)
  hex: string; // Format hexadécimal pour CSS
  srgb_f32: { r: number; g: number; b: number }; // sRGB float 0-1
  linear_f32: { r: number; g: number; b: number }; // Linear float 0-1 pour Three.js
  source?: string;
  confidence?: number;
  pixelCount?: number;
};

/**
 * Legacy SkinTone type for backward compatibility
 */
type SkinToneLegacy = {
  r: number;
  g: number;
  b: number;
  confidence?: number;
  source?: string;
  pixelCount?: number;
};

/**
 * Union type for all skin tone formats
 */
type SkinTone = SkinToneV2 | SkinToneLegacy;

/**
 * Type guard to check if a skin tone is in V2 format
 */
export function isSkinToneV2(x: any): x is SkinToneV2 {
  return x && 
         x.schema === 'v2' && 
         x.space === 'sRGB' && 
         x.format === 'rgb255' &&
         typeof x.rgb?.r === 'number' &&
         typeof x.rgb?.g === 'number' &&
         typeof x.rgb?.b === 'number';
}

/**
 * Default V2 skin tone for fallback
 */
const DEFAULT_TONE_V2: SkinToneV2 = {
  schema: 'v2',
  space: 'sRGB',
  format: 'rgb255',
  rgb: { r: 153, g: 108, b: 78 },
  hex: '#996C4E',
  srgb_f32: { r: 0.6, g: 0.424, b: 0.306 },
  linear_f32: { r: 0.318, g: 0.154, b: 0.079 },
  source: 'default_fallback',
  confidence: 0.5
};

const clamp255 = (n: number) => Math.max(0, Math.min(255, n | 0));

/**
 * Convert sRGB (0-1) to linear (0-1) for Three.js materials
 * Enhanced formula for accurate color space conversion
 */
function sRGBToLinear(c: number): number {
  // Ensure input is clamped to valid range
  const clampedC = Math.max(0, Math.min(1, c));
  
  // Standard sRGB to linear conversion formula
  if (clampedC <= 0.04045) {
    return clampedC / 12.92;
  } else {
    return Math.pow((clampedC + 0.055) / 1.055, 2.4);
  }
}

/**
 * Convert RGB values to hex string
 * Enhanced with proper clamping
 */
function rgbToHex(r: number, g: number, b: number): string {
  const clampedR = Math.max(0, Math.min(255, Math.round(r)));
  const clampedG = Math.max(0, Math.min(255, Math.round(g)));
  const clampedB = Math.max(0, Math.min(255, Math.round(b)));
  
  return '#' + [clampedR, clampedG, clampedB].map(x => {
    const hex = x.toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  }).join('');
}

/**
 * Convert legacy skin tone to V2 format
 */
function convertLegacyToV2(legacy: SkinToneLegacy): SkinToneV2 {
  const r = clamp255(legacy.r);
  const g = clamp255(legacy.g);
  const b = clamp255(legacy.b);
  
  // Convert to 0-1 range for sRGB float
  const srgb_f32 = { 
    r: r / 255, 
    g: g / 255, 
    b: b / 255 
  };
  
  // Convert to linear for Three.js
  const linear_f32 = {
    r: sRGBToLinear(srgb_f32.r),
    g: sRGBToLinear(srgb_f32.g),
    b: sRGBToLinear(srgb_f32.b)
  };
  
  // Generate hex for CSS
  const hex = rgbToHex(r, g, b);
  
  return {
    schema: 'v2',
    space: 'sRGB',
    format: 'rgb255',
    rgb: { r, g, b },
    hex,
    srgb_f32,
    linear_f32,
    source: legacy.source || 'legacy_converted',
    confidence: legacy.confidence || 0.5,
    pixelCount: legacy.pixelCount
  };
}

/**
 * Create complete SkinToneV2 object with all representations
 */
export function createCompleteSkinTone(
  r: number, 
  g: number, 
  b: number, 
  source: string, 
  confidence: number,
  pixelCount?: number
): SkinToneV2 {
  // Ensure values are clamped to 0-255
  const rgb = { r: clamp255(r), g: clamp255(g), b: clamp255(b) };
  
  // Convert to 0-1 range for sRGB float
  const srgb_f32 = { 
    r: rgb.r / 255, 
    g: rgb.g / 255, 
    b: rgb.b / 255 
  };
  
  // Convert to linear for Three.js
  const linear_f32 = {
    r: sRGBToLinear(srgb_f32.r),
    g: sRGBToLinear(srgb_f32.g),
    b: sRGBToLinear(srgb_f32.b)
  };
  
  // Generate hex for CSS
  const hex = rgbToHex(rgb.r, rgb.g, rgb.b);
  
  // Validate linear conversion results
  if (!Number.isFinite(linear_f32.r) || !Number.isFinite(linear_f32.g) || !Number.isFinite(linear_f32.b)) {
    console.warn('Invalid linear conversion results, using fallback', {
      srgb_f32,
      linear_f32,
      originalRGB: { r, g, b }
    });
    
    // Fallback to simple linear approximation
    linear_f32.r = Math.pow(srgb_f32.r, 2.2);
    linear_f32.g = Math.pow(srgb_f32.g, 2.2);
    linear_f32.b = Math.pow(srgb_f32.b, 2.2);
  }
  
  return {
    schema: 'v2',
    space: 'sRGB',
    format: 'rgb255',
    rgb,
    hex,
    srgb_f32,
    linear_f32,
    source,
    confidence,
    pixelCount
  };
}
const num = (v: any) => {
  const n = typeof v === 'string' ? parseFloat(v) : v;
  return Number.isFinite(n) ? n : null;
};

function valid(rgb: any) {
  const r = num(rgb?.r ?? rgb?.avgR);
  const g = num(rgb?.g ?? rgb?.avgG); 
  const b = num(rgb?.b ?? rgb?.avgB);
  if (r === null || g === null || b === null) return null;
  return { r: clamp255(r), g: clamp255(g), b: clamp255(b) };
}

/**
 * Resolve skin tone with strict V2 prioritization
 * PHASE 1: Priorité stricte à la v2, puis fallback contrôlé vers legacy
 */
export function resolveSkinTone(payload: any): { tone: SkinToneV2; source: string } {
  if (!payload) {
    logger.debug('SKIN_TONE_RESOLUTION_V2', 'No payload provided, using default', {
      philosophy: 'v2_strict_prioritization'
    });
    return { tone: DEFAULT_TONE_V2, source: 'default' };
  }
  
  logger.debug('SKIN_TONE_RESOLUTION_V2', 'Starting V2 strict prioritization', {
    payloadKeys: payload ? Object.keys(payload) : [],
    philosophy: 'v2_strict_prioritization_audit'
  });
  
  // PHASE 1: Priorité stricte à la V2 - chercher dans les champs canoniques
  const v2Candidates = [
    payload?.skin_tone,
    payload?.avatar?.skin_tone,
    payload?.estimate?.skin_tone,
    payload?.savedAvatarPayload?.skin_tone,
    payload?.preferences?.skin_tone
  ].filter(Boolean);
  
  // Vérifier si on a une V2 valide
  for (const candidate of v2Candidates) {
    if (isSkinToneV2(candidate)) {
      logger.info('SKIN_TONE_RESOLUTION_V2', 'Found valid V2 skin tone (strict priority)', {
        skinToneRGB: `rgb(${candidate.rgb.r}, ${candidate.rgb.g}, ${candidate.rgb.b})`,
        skinToneHex: candidate.hex,
        source: candidate.source || 'v2_direct',
        confidence: candidate.confidence || 'unknown',
        schema: candidate.schema,
        philosophy: 'v2_strict_priority_success'
      });
      return { tone: candidate, source: 'v2-direct' };
    }
  }
  
  logger.debug('SKIN_TONE_RESOLUTION_V2', 'No V2 format found, checking legacy sources', {
    v2CandidatesChecked: v2Candidates.length,
    philosophy: 'v2_not_found_fallback_to_legacy'
  });
  
  // PHASE 1: Fallback contrôlé vers legacy - seulement si aucune V2 trouvée
  const legacyCandidates: any[] = [
    payload?.skinTone, // Legacy prop
    payload?.avatar?.skinTone, // Legacy in avatar
    payload?.preferences?.skinTone, // Legacy in preferences
    payload?.estimate?.photos_metadata?.[0]?.captureReport?.skin_tone,
    payload?.estimate?.photos_metadata?.[1]?.captureReport?.skin_tone,
    payload?.estimate?.photos_metadata?.[0]?.report?.skin_tone,
    payload?.estimate?.photos_metadata?.[1]?.report?.skin_tone,
    payload?.estimate?.extracted_data?.skin_tone,
    payload?.commit?.data?.skin_tone,
    payload?.match?.skin_tone,
    payload?.semantic?.skin_tone,
  ].filter(Boolean);

  const validLegacyTones = legacyCandidates.map(valid).filter(Boolean) as Array<{r: number; g: number; b: number}>;
  
  if (!validLegacyTones.length) {
    logger.debug('SKIN_TONE_RESOLUTION_V2', 'No valid legacy skin tones found, using default', {
      legacyCandidatesChecked: legacyCandidates.length,
      philosophy: 'no_legacy_skin_tone_available'
    });
    return { tone: DEFAULT_TONE_V2, source: 'default' };
  }

  // Calculate robust median (more stable than average)
  const rs = validLegacyTones.map(x => x.r).sort((a, b) => a - b);
  const gs = validLegacyTones.map(x => x.g).sort((a, b) => a - b);
  const bs = validLegacyTones.map(x => x.b).sort((a, b) => a - b);
  
  const mid = (arr: number[]) => arr[(arr.length - 1) >> 1];

  const medianR = mid(rs);
  const medianG = mid(gs);
  const medianB = mid(bs);
  
  // Calculate total pixel count if available
  const totalPixelCount = validLegacyTones.reduce((sum, tone) => {
    return sum + ((tone as any).pixelCount || 0);
  }, 0);
  
  const resolvedToneV2 = createCompleteSkinTone(
    medianR,
    medianG, 
    medianB,
    'legacy_unified_median',
    Math.min(0.95, 0.5 + validLegacyTones.length * 0.1), // Higher confidence with more sources
    totalPixelCount > 0 ? totalPixelCount : undefined
  );
  
  logger.info('SKIN_TONE_RESOLUTION_V2', 'Legacy skin tone converted to V2', {
    skinToneRGB: `rgb(${resolvedToneV2.rgb.r}, ${resolvedToneV2.rgb.g}, ${resolvedToneV2.rgb.b})`,
    skinToneHex: resolvedToneV2.hex,
    source: resolvedToneV2.source,
    confidence: resolvedToneV2.confidence?.toFixed(3),
    candidatesUsed: validLegacyTones.length,
    srgbFloat: `rgb(${resolvedToneV2.srgb_f32.r.toFixed(4)}, ${resolvedToneV2.srgb_f32.g.toFixed(4)}, ${resolvedToneV2.srgb_f32.b.toFixed(4)})`,
    linearFloat: `rgb(${resolvedToneV2.linear_f32.r.toFixed(4)}, ${resolvedToneV2.linear_f32.g.toFixed(4)}, ${resolvedToneV2.linear_f32.b.toFixed(4)})`,
    philosophy: 'legacy_to_v2_conversion_success'
  });
  
  return { tone: resolvedToneV2, source: 'legacy-converted' };
}