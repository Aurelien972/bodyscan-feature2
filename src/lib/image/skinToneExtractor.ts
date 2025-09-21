/**
 * Skin Tone Extractor
 * Pure image processing functions for skin tone extraction
 */

/**
 * Extract skin tone from photo data
 */
export function extractSkinToneFromPhoto(
  photoData: ImageData,
  faceRegion?: { x: number; y: number; width: number; height: number }
): { r: number; g: number; b: number; confidence?: number } | null {
  try {
    const { data, width, height } = photoData;
    
    // ENHANCED: Pre-processing for better skin tone detection
    const preprocessedData = preprocessImageData(data, width, height);
    
    // ENHANCED: Prioritize face region for more accurate skin tone extraction
    const regionToSample = faceRegion || {
      x: Math.floor(width * 0.3),   // Wider sampling for better coverage
      y: Math.floor(height * 0.1),  // Start higher for face area
      width: Math.floor(width * 0.4), // Wider for better sampling
      height: Math.floor(height * 0.3), // Taller for better coverage
    };
    
    let totalR = 0, totalG = 0, totalB = 0;
    let skinPixelCount = 0;
    let totalSampledPixels = 0;
    let allPixelR = 0, allPixelG = 0, allPixelB = 0; // For fallback calculation
    
    // ENHANCED: Smart sampling density based on region type
    const samplingStep = faceRegion ? 1 : 2; // Denser sampling for face regions
    
    for (let y = regionToSample.y; y < regionToSample.y + regionToSample.height; y += samplingStep) {
      for (let x = regionToSample.x; x < regionToSample.x + regionToSample.width; x += samplingStep) {
        if (x >= 0 && x < width && y >= 0 && y < height) {
          const idx = (y * width + x) * 4;
          const r = preprocessedData[idx];
          const g = preprocessedData[idx + 1];
          const b = preprocessedData[idx + 2];
          
          totalSampledPixels++;
          allPixelR += r;
          allPixelG += g;
          allPixelB += b;
          
          // Enhanced skin tone detection with improved inclusivity
          if (isSkinToneEnhanced(r, g, b)) {
            totalR += r;
            totalG += g;
            totalB += b;
            skinPixelCount++;
          }
        }
      }
    }
    
    // ENHANCED: Adaptive validation with face region bonus
    const skinPixelRatio = totalSampledPixels > 0 ? skinPixelCount / totalSampledPixels : 0;
    
    // CRITICAL: More lenient thresholds for better inclusivity
    if (skinPixelCount < 5 || skinPixelRatio < 0.02) {
      // FALLBACK: Use face region average if available
      if (faceRegion && totalSampledPixels > 50) {
        const avgR = Math.round(allPixelR / totalSampledPixels);
        const avgG = Math.round(allPixelG / totalSampledPixels);
        const avgB = Math.round(allPixelB / totalSampledPixels);
        
        // Enhanced validation for face region fallback
        if (avgR > 20 && avgG > 10 && avgB > 5 && avgR < 255 && avgG < 250 && avgB < 240) {
          console.log('Using face region fallback for skin tone', {
            avgR, avgG, avgB,
            skinPixelCount,
            totalSampledPixels,
            skinPixelRatio: skinPixelRatio.toFixed(3),
            confidence: 0.5,
            reason: 'face_region_fallback_due_to_low_skin_detection'
          });
          
          return { r: avgR, g: avgG, b: avgB, confidence: 0.5 };
        }
      }
      
      console.log('Insufficient skin pixels found', {
        skinPixelCount,
        totalSampledPixels,
        skinPixelRatio: skinPixelRatio.toFixed(3),
        region: regionToSample,
        hadFaceRegion: !!faceRegion,
        fallbackAttempted: !!faceRegion && totalSampledPixels > 50
      });
      return null;
    }
    
    const avgR = Math.round(totalR / skinPixelCount);
    const avgG = Math.round(totalG / skinPixelCount);
    const avgB = Math.round(totalB / skinPixelCount);
    
    // ENHANCED: Improved confidence calculation with face region bonus
    const sampleSizeConfidence = Math.min(1, skinPixelCount / 30);
    const ratioConfidence = Math.min(1, skinPixelRatio * 5);
    const colorConsistencyConfidence = calculateColorConsistency(preprocessedData, regionToSample, avgR, avgG, avgB, width);
    
    // ENHANCED: Skin tone categorization for better confidence assessment
    const isDarkSkin = avgR < 100 && avgG < 80 && avgB < 70;
    const isLightSkin = avgR > 200 && avgG > 180 && avgB > 160;
    
    // Confidence multiplier based on skin tone and region type
    let confidenceMultiplier = 1.0;
    if (isDarkSkin || isLightSkin) {
      confidenceMultiplier = 0.8; // Slightly lower confidence for extreme tones due to detection challenges
    }
    
    let confidence = (sampleSizeConfidence * 0.4 + ratioConfidence * 0.3 + colorConsistencyConfidence * 0.3) * 0.9 * confidenceMultiplier;
    
    // Face region bonus for confidence
    if (faceRegion && skinPixelRatio > 0.1) {
      confidence = Math.min(1.0, confidence * 1.3); // Increased bonus for face region
    }
    
    console.log('Extracted skin tone', {
      avgR, avgG, avgB,
      skinPixelCount,
      totalSampledPixels,
      skinPixelRatio: skinPixelRatio.toFixed(3),
      confidence,
      region: regionToSample,
      usedFaceRegion: !!faceRegion,
      skinToneCategory: isDarkSkin ? 'dark' : isLightSkin ? 'light' : 'medium',
      confidenceMultiplier,
      confidenceBreakdown: {
        sampleSize: sampleSizeConfidence.toFixed(3),
        ratio: ratioConfidence.toFixed(3),
        colorConsistency: colorConsistencyConfidence.toFixed(3)
      }
    });
    
    return { r: avgR, g: avgG, b: avgB, confidence };
    
  } catch (error) {
    console.log('Extraction failed:', error);
    return null;
  }
}

/**
 * Pre-process image data for better skin tone detection
 * Applies basic brightness and contrast normalization
 */
function preprocessImageData(data: Uint8ClampedArray, width: number, height: number): Uint8ClampedArray {
  const processedData = new Uint8ClampedArray(data.length);
  
  // Calculate image statistics for normalization
  let totalBrightness = 0;
  let pixelCount = 0;
  
  for (let i = 0; i < data.length; i += 4) {
    const brightness = (data[i] + data[i + 1] + data[i + 2]) / 3;
    totalBrightness += brightness;
    pixelCount++;
  }
  
  const avgBrightness = totalBrightness / pixelCount;
  const targetBrightness = 128; // Target middle brightness
  const brightnessFactor = targetBrightness / Math.max(avgBrightness, 1);
  
  // Apply brightness normalization with gentle adjustment
  const adjustmentFactor = Math.min(1.5, Math.max(0.7, brightnessFactor));
  
  for (let i = 0; i < data.length; i += 4) {
    processedData[i] = Math.min(255, Math.max(0, data[i] * adjustmentFactor));     // R
    processedData[i + 1] = Math.min(255, Math.max(0, data[i + 1] * adjustmentFactor)); // G
    processedData[i + 2] = Math.min(255, Math.max(0, data[i + 2] * adjustmentFactor)); // B
    processedData[i + 3] = data[i + 3]; // Alpha unchanged
  }
  
  return processedData;
}

/**
 * Enhanced skin tone detection with improved inclusivity
 */
function isSkinToneEnhanced(r: number, g: number, b: number): boolean {
  // ENHANCED: Multi-method skin tone detection for maximum inclusivity
  const y = 0.299 * r + 0.587 * g + 0.114 * b;
  const cb = -0.169 * r - 0.331 * g + 0.5 * b + 128;
  const cr = 0.5 * r - 0.419 * g - 0.081 * b + 128;
  
  // Enhanced luminance validation for extreme skin tones
  const luminanceValid = y > 5 && y < 250; // Even more inclusive range
  
  // Enhanced chrominance validation for diverse skin tones
  const chrominanceValid = (
    cb >= 55 && cb <= 150 &&  // Expanded range for diverse skin tones
    cr >= 110 && cr <= 195    // Expanded range for diverse skin tones
  );
  
  // Enhanced RGB validation with better thresholds
  const rgbValidation = (
    r > 8 && g > 4 && b > 2 &&     // Lower minimums for very dark skin
    r < 255 && g < 252 && b < 245 && // Maximum values for very light skin
    Math.max(r, g, b) - Math.min(r, g, b) > 1 // Minimal variation requirement
  );
  
  // Enhanced dark skin detection with more inclusive thresholds
  const darkSkinSpecial = (
    y < 120 && // Expanded dark luminance threshold
    r >= g && r >= b && // Red channel dominance (common in dark skin)
    (r - Math.min(g, b)) >= 1 // Minimal red dominance requirement
  );
  
  // Enhanced light skin detection
  const lightSkinSpecial = (
    y > 160 && // Light luminance threshold
    Math.abs(r - g) < 40 && Math.abs(g - b) < 40 && // Similar RGB values for light skin
    r > 130 && g > 100 && b > 80 // High RGB values
  );
  
  // Additional method: HSV-based skin detection for edge cases
  const hsvSkinDetection = (() => {
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const delta = max - min;
    
    if (max === 0) return false;
    
    const saturation = delta / max;
    const value = max / 255;
    
    // Skin typically has moderate saturation and reasonable value
    return saturation > 0.05 && saturation < 0.9 && value > 0.1 && value < 0.98;
  })();
  
  return (luminanceValid && chrominanceValid && rgbValidation) || darkSkinSpecial || lightSkinSpecial || hsvSkinDetection;
}
/**
 * Calculate color consistency within the sampled region
 */
function calculateColorConsistency(
  data: Uint8ClampedArray,
  regionToSample: { x: number; y: number; width: number; height: number },
  avgR: number,
  avgG: number,
  avgB: number,
  imageWidth: number
): number {
  let totalVariance = 0;
  let validPixels = 0;
  
  // Enhanced sampling for color consistency calculation
  
  for (let y = regionToSample.y; y < regionToSample.y + regionToSample.height; y += 3) {
    for (let x = regionToSample.x; x < regionToSample.x + regionToSample.width; x += 3) {
      if (x >= 0 && x < imageWidth && y >= 0) {
        const idx = (y * imageWidth + x) * 4;
        if (idx >= 0 && idx < data.length - 3) {
          const r = data[idx];
          const g = data[idx + 1];
          const b = data[idx + 2];
        
          // Use enhanced skin tone detection for consistency
          if (isSkinToneEnhanced(r, g, b)) {
            const variance = Math.pow(r - avgR, 2) + Math.pow(g - avgG, 2) + Math.pow(b - avgB, 2);
            totalVariance += variance;
            validPixels++;
          }
        }
      }
    }
  }
  
  if (validPixels === 0) return 0;
  
  const avgVariance = totalVariance / validPixels;
  const maxVariance = 20000; // Even more inclusive threshold
  
  return Math.max(0, Math.min(1, 1 - (avgVariance / maxVariance)));
}
