/**
 * Measurement Enhancer
 * Enhances and validates measurements from vision analysis
 */ export function enhanceMeasurements(visionAnalysis, userMetrics) {
  const processingNotes = visionAnalysis.processing_notes || [];
  // Enhanced scale handling with fallbacks
  let finalPixelPerCm = visionAnalysis.pixel_per_cm;
  let scaleMethod = visionAnalysis.scale_method;
  if (!finalPixelPerCm || !isFinite(finalPixelPerCm) || finalPixelPerCm <= 0) {
    // Fallback: estimate from user height and image dimensions
    const estimatedBodyHeightPixels = 1000 * 0.8; // Assume body takes 80% of 1000px image height
    finalPixelPerCm = estimatedBodyHeightPixels / userMetrics.height_cm;
    scaleMethod = 'user_height_fallback';
    processingNotes.push(`Scale fallback applied: ${finalPixelPerCm.toFixed(2)} px/cm`);
    console.log('🔍 [measurementEnhancer] Applied scale fallback', {
      originalScale: visionAnalysis.pixel_per_cm,
      fallbackScale: finalPixelPerCm,
      method: scaleMethod,
      userHeight: userMetrics.height_cm
    });
  }
  // Ensure measurements include user data as fallback and add estimations
  // Start by copying all existing properties from visionAnalysis.measurements
  const enhancedMeasurements = {
    ...visionAnalysis.measurements || {},
    waist_cm: visionAnalysis.measurements?.waist_cm || calculateFallbackWaist(userMetrics),
    hips_cm: visionAnalysis.measurements?.hips_cm || calculateFallbackHips(userMetrics),
    chest_cm: visionAnalysis.measurements?.chest_cm || calculateFallbackChest(userMetrics),
    height_cm: visionAnalysis.measurements?.height_cm || userMetrics.height_cm,
    weight_kg: visionAnalysis.measurements?.weight_kg || userMetrics.weight_kg,
    estimated_body_fat_perc: visionAnalysis.measurements?.estimated_body_fat_perc || calculateFallbackBodyFat(userMetrics),
    estimated_muscle_mass_kg: visionAnalysis.measurements?.estimated_muscle_mass_kg || calculateFallbackMuscleMass(userMetrics)
  };
  // Validate measurements consistency
  if (enhancedMeasurements.hips_cm < enhancedMeasurements.waist_cm) {
    enhancedMeasurements.hips_cm = enhancedMeasurements.waist_cm + 5;
    processingNotes.push('Corrected hips measurement (anatomical consistency)');
  }
  if (enhancedMeasurements.chest_cm < enhancedMeasurements.waist_cm - 20) {
    enhancedMeasurements.chest_cm = enhancedMeasurements.waist_cm - 10;
    processingNotes.push('Corrected chest measurement (anatomical consistency)');
  }
  // Update vision analysis with enhanced data
  visionAnalysis.measurements = enhancedMeasurements;
  visionAnalysis.pixel_per_cm = finalPixelPerCm;
  visionAnalysis.scale_method = scaleMethod;
  visionAnalysis.processing_notes = processingNotes;
  return enhancedMeasurements;
}
/**
 * Calculate fallback measurements based on BMI and gender
 */ function calculateFallbackWaist(userMetrics) {
  const bmi = userMetrics.weight_kg / Math.pow(userMetrics.height_cm / 100, 2);
  const baseWaist = userMetrics.gender === 'feminine' ? 70 : 85;
  const bmiAdjustment = Math.max(0.8, Math.min(1.3, bmi / 22));
  return baseWaist * bmiAdjustment;
}
function calculateFallbackChest(userMetrics) {
  const bmi = userMetrics.weight_kg / Math.pow(userMetrics.height_cm / 100, 2);
  const baseChest = userMetrics.gender === 'feminine' ? 88 : 100;
  const bmiAdjustment = Math.max(0.8, Math.min(1.3, bmi / 22));
  return baseChest * bmiAdjustment;
}
function calculateFallbackHips(userMetrics) {
  const bmi = userMetrics.weight_kg / Math.pow(userMetrics.height_cm / 100, 2);
  const baseHips = 95;
  const bmiAdjustment = Math.max(0.8, Math.min(1.3, bmi / 22));
  const waist = calculateFallbackWaist(userMetrics);
  return Math.max(waist + 5, baseHips * bmiAdjustment);
}
function calculateFallbackBodyFat(userMetrics) {
  const bmi = userMetrics.weight_kg / Math.pow(userMetrics.height_cm / 100, 2);
  return Math.max(8, Math.min(35, 15 + (bmi - 22) * 1.5));
}
function calculateFallbackMuscleMass(userMetrics) {
  const bmi = userMetrics.weight_kg / Math.pow(userMetrics.height_cm / 100, 2);
  return userMetrics.weight_kg * (0.4 + Math.max(0, (25 - bmi) / 20) * 0.2);
}
