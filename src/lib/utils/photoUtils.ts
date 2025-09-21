// src/lib/utils/photoUtils.ts
import logger from './logger';
import type { PhotoCaptureReport } from '../../domain/types';
import { extractSkinToneFromPhoto } from '../image/skinToneExtractor';

/**
 * Validation result interface
 */
interface ValidationResult {
  isValid: boolean;
  issues: string[];
}

/**
 * Photo processing result interface
 */
interface PhotoProcessingResult {
  processedFile: File;
  validationReport: {
    originalSizeKB: number;
    finalSizeKB: number;
    compressionApplied: boolean;
    qualityScore: number;
  };
}

/**
 * Validate image format and basic properties
 */
export function validateImageFormat(file: File): ValidationResult {
  const issues: string[] = [];

  // Check if it's actually an image
  if (!file.type.startsWith('image/')) {
    issues.push('File is not an image');
    return { isValid: false, issues };
  }

  // Check file size (max 15MB)
  const maxSize = 15 * 1024 * 1024;
  if (file.size > maxSize) {
    issues.push('File is too large (max 15MB)');
    return { isValid: false, issues };
  }

  // Check minimum file size (1KB)
  if (file.size < 1024) {
    issues.push('File is too small (min 1KB)');
    return { isValid: false, issues };
  }

  // Warn about non-JPEG formats
  // Keep this warning, as JPEG is often preferred for photos due to size/quality balance
  if (!file.type.includes('jpeg') && !file.type.includes('jpg')) {
    issues.push('JPEG format is recommended for better compatibility');
  }

  return {
    isValid: issues.length === 0 || !issues.some(issue =>
      issue.includes('not an image') ||
      issue.includes('too large') ||
      issue.includes('too small')
    ),
    issues
  };
}

/**
 * Validate image quality by loading and analyzing the image
 */
export async function validateImageQuality(file: File): Promise<ValidationResult> {
  return new Promise((resolve) => {
    const issues: string[] = [];
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    img.onload = () => {
      try {
        // Check minimum dimensions
        if (img.width < 200 || img.height < 200) {
          issues.push('Image resolution is too low (minimum 200x200)');
        }

        // Check maximum dimensions
        if (img.width > 4000 || img.height > 4000) {
          issues.push('Image resolution is very high and will be optimized');
        }

        // Check aspect ratio (should be reasonable for body photos)
        const aspectRatio = img.width / img.height;
        if (aspectRatio < 0.3 || aspectRatio > 3) {
          issues.push('Unusual aspect ratio detected');
        }

        // Basic quality check by drawing to canvas
        if (ctx) {
          canvas.width = Math.min(img.width, 100);
          canvas.height = Math.min(img.height, 100);
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

          // If we can draw it, it's probably not corrupted
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const hasValidPixels = imageData.data.some(value => value > 0);

          if (!hasValidPixels) {
            issues.push('Image appears to be corrupted or blank');
          }
        }

        resolve({
          isValid: !issues.some(issue =>
            issue.includes('corrupted') ||
            issue.includes('too low')
          ),
          issues
        });

      } catch (error) {
        issues.push('Failed to analyze image quality');
        resolve({ isValid: false, issues });
      }
    };

    img.onerror = () => {
      issues.push('Image file is corrupted or invalid');
      resolve({ isValid: false, issues });
    };

    img.src = URL.createObjectURL(file);
  });
}

/**
 * Compress image if needed
 * @param file The image file to compress.
 * @param maxSizeKB The maximum size in KB for the compressed image.
 * @param quality The quality for JPEG compression (0.0 to 1.0).
 * @param outputMimeType The desired MIME type for the output file (e.g., 'image/jpeg', 'image/png').
 */
async function compressImage(
  file: File,
  maxSizeKB: number = 2048,
  quality: number = 0.8,
  outputMimeType: string = 'image/jpeg' // Default to JPEG
): Promise<{
  compressedFile: File;
  compressionApplied: boolean;
  originalSizeKB: number;
  finalSizeKB: number;
}> {
  const originalSizeKB = Math.round(file.size / 1024);

  // If file is already small enough, return as-is
  if (originalSizeKB <= maxSizeKB) {
    logger.debug('PHOTO_UTILS', 'No compression needed', {
      fileName: file.name,
      originalSizeKB,
      maxSizeKB
    });
    return {
      compressedFile: file,
      compressionApplied: false,
      originalSizeKB,
      finalSizeKB: originalSizeKB
    };
  }

  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      try {
        // Calculate new dimensions to reduce file size
        let { width, height } = img;
        const maxDimension = 1920; // Max dimension for compressed image

        if (width > maxDimension || height > maxDimension) {
          const ratio = Math.min(maxDimension / width, maxDimension / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        canvas.width = width;
        canvas.height = height;

        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);

          canvas.toBlob((blob) => {
            if (blob) {
              const compressedFile = new File([blob], file.name, {
                type: outputMimeType, // Use dynamic MIME type
                lastModified: Date.now()
              });

              const finalSizeKB = Math.round(blob.size / 1024);

              logger.debug('PHOTO_UTILS', 'Image compressed', {
                fileName: file.name,
                originalSizeKB,
                finalSizeKB,
                compressionApplied: true,
                outputMimeType
              });

              resolve({
                compressedFile,
                compressionApplied: true,
                originalSizeKB,
                finalSizeKB
              });
            } else {
              reject(new Error('Failed to create blob after compression'));
            }
          }, outputMimeType, quality); // Use dynamic MIME type and quality
        } else {
          reject(new Error('Failed to get canvas context for compression'));
        }
      } catch (error) {
        reject(error);
      }
    };

    img.onerror = () => reject(new Error('Failed to load image for compression'));
    img.src = URL.createObjectURL(file);
  });
}

/**
 * Process photo for upload with validation, compression, and EXIF stripping
 */
export async function processPhotoForUpload(file: File): Promise<PhotoProcessingResult> {
  logger.info('🔍 [PhotoProcessing] Starting photo processing', {
    fileName: file.name,
    fileSize: Math.round(file.size / 1024),
    fileType: file.type
  });

  try {
    // Determine the output MIME type based on the original file type
    // Prefer JPEG if original is JPEG, otherwise use PNG if original is PNG, fallback to JPEG
    const outputMimeType = file.type.includes('jpeg') || file.type.includes('jpg')
                           ? 'image/jpeg'
                           : file.type.includes('png')
                           ? 'image/png'
                           : 'image/jpeg'; // Default fallback

    logger.debug('PHOTO_UTILS', 'Determined output MIME type', {
      originalType: file.type,
      outputMimeType
    });

    // Step 1: Compress if needed, using the determined output MIME type
    const compressionResult = await compressImage(file, 2048, 0.85, outputMimeType);

    // Step 2: Strip EXIF data, using the determined output MIME type
    const strippedBlob = await stripExif(compressionResult.compressedFile, outputMimeType);

    // Step 3: Create final file with the correct MIME type
    const processedFile = new File([strippedBlob], file.name, {
      type: outputMimeType, // Use dynamic MIME type
      lastModified: Date.now()
    });

    const finalSizeKB = Math.round(processedFile.size / 1024);

    // Step 4: Calculate quality score
    const qualityScore = calculateQualityScore(
      compressionResult.originalSizeKB,
      finalSizeKB,
      compressionResult.compressionApplied
    );

    logger.info('✅ [PhotoProcessing] Photo processing completed', {
      originalSizeKB: compressionResult.originalSizeKB,
      finalSizeKB,
      compressionApplied: compressionResult.compressionApplied,
      qualityScore,
      finalMimeType: outputMimeType
    });

    return {
      processedFile,
      validationReport: {
        originalSizeKB: compressionResult.originalSizeKB,
        finalSizeKB,
        compressionApplied: compressionResult.compressionApplied,
        qualityScore
      }
    };

  } catch (error) {
    logger.error('❌ [PhotoProcessing] Photo processing failed', {
      error: error instanceof Error ? error.message : String(error)
    });

    // Fallback: just strip EXIF without compression, trying to preserve original type
    try {
      const fallbackMimeType = file.type.startsWith('image/') ? file.type : 'image/jpeg';
      const strippedBlob = await stripExif(file, fallbackMimeType);
      const processedFile = new File([strippedBlob], file.name, {
        type: fallbackMimeType,
        lastModified: Date.now()
      });

      const originalSizeKB = Math.round(file.size / 1024);
      const finalSizeKB = Math.round(processedFile.size / 1024);

      logger.warn('PHOTO_UTILS', 'Photo processing fallback executed', {
        fileName: file.name,
        originalSizeKB,
        finalSizeKB,
        fallbackMimeType
      });

      return {
        processedFile,
        validationReport: {
          originalSizeKB,
          finalSizeKB,
          compressionApplied: false,
          qualityScore: 0.7 // Default quality score for fallback
        }
      };
    } catch (fallbackError) {
      throw new Error(`Photo processing failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}

/**
 * Calculate quality score based on processing results
 */
function calculateQualityScore(
  originalSizeKB: number,
  finalSizeKB: number,
  compressionApplied: boolean
): number {
  let score = 1.0;

  // Reduce score if heavy compression was needed
  if (compressionApplied) {
    const compressionRatio = finalSizeKB / originalSizeKB;
    if (compressionRatio < 0.3) {
      score -= 0.3; // Heavy compression
    } else if (compressionRatio < 0.5) {
      score -= 0.2; // Moderate compression
    } else {
      score -= 0.1; // Light compression
    }
  }

  // Adjust based on final file size
  if (finalSizeKB < 100) {
    score -= 0.2; // Very small file might indicate quality loss
  } else if (finalSizeKB > 3000) {
    score -= 0.1; // Large file might be inefficient
  }

  return Math.max(0.1, Math.min(1.0, score));
}

/**
 * Strip EXIF data from image file
 * @param file The image file to strip EXIF data from.
 * @param outputMimeType The desired MIME type for the output blob (e.g., 'image/jpeg', 'image/png').
 */
export async function stripExif(file: File, outputMimeType: string = 'image/jpeg'): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;

      if (ctx) {
        ctx.drawImage(img, 0, 0);
        canvas.toBlob((blob) => {
          if (blob) {
            logger.debug('PHOTO_UTILS', 'EXIF stripped', {
              fileName: file.name,
              outputMimeType
            });
            resolve(blob);
          } else {
            reject(new Error('Failed to create blob from canvas after EXIF stripping'));
          }
        }, outputMimeType, 0.95); // Use dynamic MIME type and quality
      } else {
        reject(new Error('Failed to get canvas context for EXIF stripping'));
      }
    };

    img.onerror = () => reject(new Error('Failed to load image for EXIF stripping'));
    img.src = URL.createObjectURL(file);
  });
}

/**
 * Create comprehensive photo capture report
 */
export async function createPhotoCaptureReport(
  file: File,
  photoType: 'front' | 'profile',
  validationResult: any,
  stream?: MediaStream
): Promise<PhotoCaptureReport> {
  const timestamp = new Date().toISOString();

  logger.info('📸 [PhotoCapture] Creating capture report', {
    type: photoType,
    fileSize: Math.round(file.size / 1024),
    isValid: validationResult.isValid,
    confidence: Math.round(validationResult.confidence * 100)
  });

  // Extract skin tone from the image
  let skinTone;
  try {
    // Convert file to ImageData for skin tone extraction
    const imageData = await fileToImageData(file);

    // ENHANCED: Try to detect face region for better skin tone extraction
    const faceRegion = await detectFaceRegionForSkinTone(imageData);
    const skinToneResult = extractSkinToneFromPhoto(imageData, faceRegion);

    if (skinToneResult) {
      const { r, g, b, confidence } = skinToneResult;
      skinTone = {
        r, g, b, // Keep original RGB format for consistency
        confidence: confidence || 0.5,
        source: faceRegion ? 'face_region_extraction' : 'general_extraction',
        extraction_method: 'enhanced_algorithm'
      };
    } else {
      throw new Error('Skin tone extraction returned null');
    }

    logger.debug('🎨 [PhotoCapture] Skin tone extracted', {
      type: photoType,
      skinTone: {
        r: skinTone.r,
        g: skinTone.g,
        b: skinTone.b,
        confidence: skinTone.confidence
      }
    });
  } catch (error) {
    logger.warn('🎨 [PhotoCapture] Skin tone extraction failed, using fallback', {
      type: photoType,
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    // Fallback skin tone
    skinTone = {
      r: 212, g: 165, b: 116,
      confidence: 0.5,
      source: 'fallback',
      extraction_method: 'fallback_neutral'
    };
  }

  // Get camera stream info if available
  let streamInfo;
  if (stream) {
    try {
      // Simplified stream info
      streamInfo = {
        focal_length_mm: null,
        iso: null,
        exposure_ms: null,
      };
    } catch (error) {
      logger.warn('📹 [PhotoCapture] Failed to get stream info', {
        type: photoType,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  const report: PhotoCaptureReport = {
    timestamp,
    photoType,
    fileInfo: {
      name: file.name,
      size: file.size,
      type: file.type,
      lastModified: file.lastModified
    },
    validation: validationResult,
    quality: validationResult.qualityMetrics || {
      blur_score: 0.5,
      brightness: 0.5,
      contrast: 0.5,
      sharpness: 0.5
    },
    content: validationResult.contentMetrics || {
      person_detected: false,
      face_detected: false,
      pose_quality: 0.5
    },
    scale: validationResult.scaleMetrics || {
      person_size_ratio: 0.5,
      distance_score: 0.5
    },
    skinTone,
    streamInfo,
    userId: null // Will be set by the calling component
  };

  logger.info('📸 [PhotoCapture] Capture report created', {
    type: photoType,
    hasValidation: !!validationResult,
    hasSkinTone: !!skinTone,
    skinToneConfidence: skinTone?.confidence,
    skinToneSource: skinTone?.source,
    hasStreamInfo: !!streamInfo
  });

  return report;
}

/**
 * Detect face region for better skin tone extraction
 */
async function detectFaceRegionForSkinTone(imageData: ImageData): Promise<{ x: number; y: number; width: number; height: number } | null> {
  try {
    const { data, width, height } = imageData;

    // Simple face detection based on skin tone concentration in upper portion
    const faceRegionY = Math.floor(height * 0.1);
    const faceRegionHeight = Math.floor(height * 0.3);
    const faceRegionX = Math.floor(width * 0.25);
    const faceRegionWidth = Math.floor(width * 0.5);

    let skinPixelCount = 0;
    let totalPixels = 0;

    // Sample the potential face region
    for (let y = faceRegionY; y < faceRegionY + faceRegionHeight; y += 3) {
      for (let x = faceRegionX; x < faceRegionX + faceRegionWidth; x += 3) {
        if (x >= 0 && x < width && y >= 0 && y < height) {
          const idx = (y * width + x) * 4;
          const r = data[idx];
          const g = data[idx + 1];
          const b = data[idx + 2];

          // Basic skin tone detection
          if (r > 50 && g > 30 && b > 20 && r > g && r > b) {
            skinPixelCount++;
          }
          totalPixels++;
        }
      }
    }

    const skinRatio = totalPixels > 0 ? skinPixelCount / totalPixels : 0;

    // If we found a reasonable concentration of skin pixels, return the region
    if (skinRatio > 0.15) {
      return {
        x: faceRegionX,
        y: faceRegionY,
        width: faceRegionWidth,
        height: faceRegionHeight
      };
    }

    return null;
  } catch (error) {
    console.warn('Face region detection failed:', error);
    return null;
  }
}
/**
 * Convert File to ImageData for processing
 */
async function fileToImageData(file: File): Promise<ImageData> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;

      if (ctx) {
        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        resolve(imageData);
      } else {
        reject(new Error('Failed to get canvas context'));
      }
    };

    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = URL.createObjectURL(file);
  });
}

/**
 * Convert RGB to hex
 */
function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map(x => {
    const hex = Math.round(x).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  }).join('');
}

/**
 * Convert RGB to HSL
 */
function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
  r /= 255;
  g /= 255;
  b /= 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100) / 100,
    l: Math.round(l * 100) / 100
  };
}
