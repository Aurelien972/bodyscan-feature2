// supabase/functions/scan-refine-morphs/promptBuilder.ts
/**
 * AI Prompt Builder - Phase B Implementation
 * Builds structured prompts for AI-driven morphological refinement with K=5 envelope constraints
 */ export function buildAIRefinementPrompt(input) {
  const { photos, blend_shape_params, blend_limb_masses, mappingData, resolvedGender, k5_envelope, vision_classification, user_measurements, traceId } = input;
  console.log(`🔍 [promptBuilder] [${traceId}] PHASE B: Building DB-only AI refinement prompt:`, {
    resolvedGender,
    photosCount: photos?.length,
    blendShapeParamsCount: Object.keys(blend_shape_params || {}).length,
    blendLimbMassesCount: Object.keys(blend_limb_masses || {}).length,
    k5EnvelopeShapeKeys: Object.keys(k5_envelope?.shape_params_envelope || {}).length,
    k5EnvelopeLimbKeys: Object.keys(k5_envelope?.limb_masses_envelope || {}).length,
    visionClassification: vision_classification,
    hasUserMeasurements: !!user_measurements,
    philosophy: 'phase_b_db_only_k5_envelope_strict'
  });

  // Build K=5 envelope constraints section (CRITICAL)
  const k5EnvelopeSection = buildK5EnvelopeConstraints(k5_envelope, traceId);
  // Build DB physiological bounds section
  const dbBoundsSection = buildDBPhysiologicalBounds(mappingData, resolvedGender, traceId);
  // Build muscular gating constraints based on vision classification
  const muscularGatingSection = buildMuscularGatingConstraints(vision_classification, resolvedGender, traceId);
  // Build photo-derived metrics for AI guidance
  const photoMetricsSection = buildPhotoMetricsGuidance(user_measurements, traceId);
  // Build gender-specific constraints
  const genderConstraintsSection = buildGenderSpecificConstraints(resolvedGender, mappingData, vision_classification, traceId); // Pass vision_classification here

  const frontPhoto = photos?.find((p)=>p.view === 'front');
  const profilePhoto = photos?.find((p)=>p.view === 'profile');

  return `You are an expert 3D body morphing AI. Your task is to refine a morphological vector based on provided photos, strictly adhering to K=5 envelope and database physiological bounds.

CONTEXT:
- Gender: ${resolvedGender}
- Photos available: ${frontPhoto ? 'Front' : ''}${frontPhoto && profilePhoto ? ' + ' : ''}${profilePhoto ? 'Profile' : ''}
- Vision Classification: Obesity: ${vision_classification?.obesity}, Muscularity: ${vision_classification?.muscularity}, Morphotype: ${vision_classification?.morphotype}

INPUT DATA (BLENDING):
Shape Parameters: ${JSON.stringify(blend_shape_params, null, 2)}
Limb Masses: ${JSON.stringify(blend_limb_masses, null, 2)}

${k5EnvelopeSection}

${dbBoundsSection}

${muscularGatingSection}

${photoMetricsSection}

${genderConstraintsSection}

STRICT CONSTRAINTS:
1. NEVER exceed K=5 envelope for any key.
2. NEVER exceed DB physiological bounds.
3. NEVER ignore muscular gating (archetypes are pre-filtered).
4. Prioritize photo-realism WITHIN these strict constraints.
5. All values MUST be finite numbers.
6. Precision: 3 decimal places maximum.
7. No additional keys not present in K=5 envelope.

Output JSON ONLY:
{
  "final_shape_params": { /* refined shape parameters */ },
  "final_limb_masses": { /* refined limb masses */ },
  "ai_confidence": /* number (0-1) */,
  "refinement_notes": [ /* list of major adjustments */ ],
  "clamped_keys": [],
  "envelope_violations": [],
  "db_violations": [],
  "gender_violations": [],
  "out_of_range_count": 0,
  "missing_keys_added": [],
  "extra_keys_removed": []
}

Analyze photos and refine the morphological vector for a perfectly faithful avatar within strict constraints.`;
}

/**
 * Build K=5 envelope constraints section
 * PHASE B: Critical constraints that AI must never violate
 */ function buildK5EnvelopeConstraints(k5_envelope, traceId) {
  console.log(`🔍 [promptBuilder] [${traceId}] PHASE B: Building K=5 envelope constraints section:`, {
    shapeParamsEnvelopeKeys: Object.keys(k5_envelope?.shape_params_envelope || {}).length,
    limbMassesEnvelopeKeys: Object.keys(k5_envelope?.limb_masses_envelope || {}).length,
    archetypesUsed: k5_envelope?.envelope_metadata?.archetypes_used,
    philosophy: 'phase_b_k5_envelope_strict_constraints'
  });
  let envelopeSection = `

K=5 ENVELOPE - ABSOLUTE CONSTRAINTS (PRIORITY 1):

This envelope was built from the ${k5_envelope?.envelope_metadata?.archetypes_used?.length || 0} most relevant archetypes after strict muscular gating:
${k5_envelope?.envelope_metadata?.archetypes_used?.map((id)=>`- ${id}`).join('\n') || 'N/A'}

SHAPE PARAMETERS ENVELOPE (NEVER EXCEED THESE RANGES):`;
  // Add shape parameters envelope with detailed constraints
  Object.entries(k5_envelope?.shape_params_envelope || {}).forEach(([key, range])=>{
    const rangeWidth = range.max - range.min;
    const isNarrowRange = rangeWidth < 0.5;
    const constraintLevel = isNarrowRange ? 'VERY STRICT' : 'STRICT';
    envelopeSection += `\n- ${key}: [${range.min.toFixed(3)}, ${range.max.toFixed(3)}] (${constraintLevel} - archetypes: [${range.archetype_min.toFixed(3)}, ${range.archetype_max.toFixed(3)}])`;
  });
  envelopeSection += `\n\nLIMB MASSES ENVELOPE (NEVER EXCEED THESE RANGES):`;
  // Add limb masses envelope with detailed constraints
  Object.entries(k5_envelope?.limb_masses_envelope || {}).forEach(([key, range])=>{
    const rangeWidth = range.max - range.min;
    const isNarrowRange = rangeWidth < 0.3;
    const constraintLevel = isNarrowRange ? 'VERY STRICT' : 'STRICT';
    envelopeSection += `\n- ${key}: [${range.min.toFixed(3)}, ${range.max.toFixed(3)}] (${constraintLevel} - archetypes: [${range.archetype_min.toFixed(3)}, ${range.archetype_max.toFixed(3)}])`;
  });
  envelopeSection += `

K=5 ENVELOPE RULES:
1. Never propose a value outside the envelope for any key.
2. The envelope reflects the diversity of the 5 most relevant archetypes after muscular gating.
3. If the envelope is narrow (range < 0.5), respect this constraint VERY strictly.
4. If the envelope is wide, use photos to choose within this range.
5. Any value outside the envelope will be automatically clamped (fidelity loss).
6. The envelope already guarantees muscular coherence (gating applied).

K=5 ENVELOPE METADATA:
- Keys with archetype data: ${k5_envelope?.envelope_metadata?.keys_with_archetype_data || 0}
- Keys using DB fallback: ${k5_envelope?.envelope_metadata?.keys_using_db_fallback || 0}
- Generation timestamp: ${k5_envelope?.envelope_metadata?.envelope_generation_timestamp || 'N/A'}
- Source Archetypes: ${k5_envelope?.envelope_metadata?.archetypes_used?.join(', ') || 'N/A'}`;
  return envelopeSection;
}

/**
 * Build DB physiological bounds section
 * PHASE B: Absolute physiological limits that cannot be exceeded
 */ function buildDBPhysiologicalBounds(mappingData, resolvedGender, traceId) {
  console.log(`🔍 [promptBuilder] [${traceId}] PHASE B: Building DB physiological bounds section:`, {
    resolvedGender,
    dbMorphValuesCount: Object.keys(mappingData?.morph_values || {}).length,
    dbLimbMassesCount: Object.keys(mappingData?.limb_masses || {}).length,
    philosophy: 'phase_b_db_physiological_absolute_bounds'
  });
  let dbSection = `

DB PHYSIOLOGICAL BOUNDS - ABSOLUTE LIMITS (PRIORITY 2):

These bounds represent the absolute physiological limits for ${resolvedGender} gender:

SHAPE PARAMETERS DB BOUNDS (ABSOLUTE PHYSIOLOGICAL LIMITS):`;
  // Add shape parameters envelope with detailed constraints
  Object.entries(mappingData?.morph_values || {}).forEach(([key, range])=>{
    const isBanned = range.min === 0 && range.max === 0;
    const status = isBanned ? 'BANNED' : 'ALLOWED';
    dbSection += `\n- ${key}: [${range.min.toFixed(3)}, ${range.max.toFixed(3)}] (${status})`;
  });
  dbSection += `\n\nLIMB MASSES DB BOUNDS (ABSOLUTE PHYSIOLOGICAL LIMITS):`;
  // Add limb masses envelope with detailed constraints
  Object.entries(mappingData?.limb_masses || {}).forEach(([key, range])=>{
    const isFixed = range.min === range.max;
    const status = isFixed ? 'FIXED' : 'VARIABLE';
    dbSection += `\n- ${key}: [${range.min.toFixed(3)}, ${range.max.toFixed(3)}] (${status})`;
  });
  dbSection += `

DB BOUNDS RULES:
1. DB bounds are ABSOLUTE physiological limits.
2. No value can exceed these bounds, even within the K=5 envelope.
3. BANNED keys (min=max=0) MUST remain at 0.
4. FIXED keys (min=max) MUST retain their exact value.
5. The K=5 envelope is already clamped to DB bounds (double safety).`;
  return dbSection;
}

/**
 * Build muscular gating constraints section
 * PHASE B: Preserve muscular coherence from archetype selection
 */ function buildMuscularGatingConstraints(vision_classification, resolvedGender, traceId) {
  console.log(`🔍 [promptBuilder] [${traceId}] PHASE B: Building muscular gating constraints:`, {
    visionMuscularity: vision_classification?.muscularity,
    resolvedGender,
    philosophy: 'phase_b_muscular_gating_preservation'
  });
  let gatingSection = `

MUSCULAR GATING - COHERENCE PRESERVED:

Vision classification determined: "${vision_classification?.muscularity}"
Archetypes used for K=5 envelope were STRICTLY filtered based on this classification.

IMPLICATIONS FOR REFINEMENT:`;
  // Analyze current muscular level from vision classification
  const muscularityLevel = getMuscularityLevelFromClassification(vision_classification?.muscularity);
  console.log(`🔍 [promptBuilder] [${traceId}] Muscularity level for prompt: ${muscularityLevel} (from "${vision_classification?.muscularity}")`); // Added log
  if (muscularityLevel >= 0.7) {
    gatingSection += `
- HIGH MUSCULARITY detected (${vision_classification?.muscularity})
- Archetypes selected are consistent with this muscularity.
- ABSOLUTE PRIORITY: Maximize bodybuilderSize and bodybuilderDetails up to the UPPER LIMITS of the K=5 envelope.
- OBJECTIVE: Maximize athletic and muscular representation within physiological constraints.
- Caution: pearFigure should remain moderate to preserve muscular visibility.
- emaciated should remain within its envelope range (standard treatment, no special).`;
  } else if (muscularityLevel <= 0.3) {
    gatingSection += `
- ATROPHIED/LOW MUSCULARITY detected (${vision_classification?.muscularity})
- Archetypes selected are consistent with this condition.
- INSTRUCTION: Optimize bodybuilderSize and bodybuilderDetails towards the lower values of the K=5 envelope.
- OBJECTIVE: Visible but balanced athletic silhouette.
- emaciated can be optimized within its envelope range based on photos.
- Caution: avoid high muscular values that would contradict gating.`;
  } else {
    gatingSection += `
- NORMAL MUSCULARITY detected (${vision_classification?.muscularity})
- Archetypes selected reflect a balanced muscularity.
- You can refine all muscular parameters within the K=5 envelope.
- emaciated treated as standard morphological key within its range.`;
  }
  
  // Gender-specific muscular constraints
  if (resolvedGender === 'masculine') {
    gatingSection += `

MASCULINE SPECIFICITIES:
- pregnant, nipples, animeProportion MUST remain at 0 (banned by DB).
- superBreast limited by K=5 envelope (generally ≤ 0 for masculine).
- Focus on bodybuilderSize/bodybuilderDetails for masculine muscularity.
- emaciated = standard morphological key (no special treatment).

STRICT MASCULINE PHYSIOLOGICAL CONSTRAINTS:
- breastsSmall: NEVER exceed 1.0 (absolute masculine physiological limit).
- superBreast: MUST be 0.0 or negative, NEVER positive (masculine anatomy).
- These limits are NON-NEGOTIABLE physiological constraints for masculine gender.
- Any value exceeding these thresholds will be automatically corrected by validation.
- PRIORITY: Respect natural masculine anatomy before any other consideration.`;
  } else { // Feminine
    gatingSection += `

FEMININE SPECIFICITIES:
- All feminine keys available according to K=5 envelope.
- Balance superBreast, bigHips, assLarge based on photos.
- Feminine muscularity via bodybuilderSize/bodybuilderDetails within envelope.
- emaciated treated as standard morphological key (no special treatment).`;
  }
  gatingSection += `

CRITICAL GENDER REMINDER:
Gender constraints are already integrated into the K=5 envelope.
Strictly adhere to banned and fixed values defined by the DB.`;

  // ENHANCED: Special instructions for explicitly muscular classifications
  const explicitlyMuscularClassifications = [
    'Musclé',
    'Musclée',
    'Athlétique',
    'Normal costaud'
  ];
  // MODIFIED: Add condition for obesity classification
  if (explicitlyMuscularClassifications.includes(vision_classification?.muscularity) && (vision_classification?.obesity === 'Obèse' || vision_classification?.obesity === 'Obésité morbide')) {
    gatingSection += `

SPECIAL INSTRUCTION - MUSCULAR/ATHLETIC AND OBESE USER DETECTED:
- Classification: ${vision_classification?.muscularity} and ${vision_classification?.obesity}
- IMPERATIVE: Maximize bodybuilderSize AND bodybuilderDetails up to the MAXIMUM LIMITS allowed.
- CONSTRAINT: Absolutely respect K=5 envelope and DB physiological bounds.
- PRIORITY: Athletic and defined silhouette above all else.
- SAFETY: Keep emaciated at 0 or minimum value to avoid muscular contradiction.
- EXPECTED RESULT: Avatar faithfully representing user's musculature.`;
  }
  return gatingSection;
}

/**
 * Build photo-derived metrics guidance section
 * PHASE B: Use photo measurements to guide AI refinement
 */ function buildPhotoMetricsGuidance(user_measurements, traceId) {
  if (!user_measurements?.raw_measurements) {
    console.log(`🔍 [promptBuilder] [${traceId}] PHASE B: No user measurements available for photo metrics guidance`);
    return '\nPhoto Metrics: Not available - use direct visual analysis.\n';
  }
  const { raw_measurements, estimated_bmi } = user_measurements;
  const hip_to_shoulder_ratio = raw_measurements.hips_cm / raw_measurements.chest_cm;
  const waist_to_hip_ratio = raw_measurements.waist_cm / raw_measurements.hips_cm;
  const chest_to_waist_ratio = raw_measurements.chest_cm / raw_measurements.waist_cm;
  const bmi_category = estimated_bmi > 30 ? 'obese' : estimated_bmi > 25 ? 'overweight' : 'normal';
  console.log(`🔍 [promptBuilder] [${traceId}] PHASE B: Photo metrics calculated:`, {
    hip_to_shoulder_ratio: hip_to_shoulder_ratio.toFixed(3),
    waist_to_hip_ratio: waist_to_hip_ratio.toFixed(3),
    chest_to_waist_ratio: chest_to_waist_ratio.toFixed(3),
    estimated_bmi: estimated_bmi.toFixed(1),
    bmi_category,
    philosophy: 'phase_b_photo_metrics_ai_guidance'
  });
  return `

PHOTO METRICS - AI GUIDANCE:
- Hip-to-Shoulder Ratio: ${hip_to_shoulder_ratio.toFixed(3)} (hips/shoulders)
- Waist-to-Hip Ratio: ${waist_to_hip_ratio.toFixed(3)} (waist/hips)
- Chest-to-Waist Ratio: ${chest_to_waist_ratio.toFixed(3)} (chest/waist)
- Estimated BMI: ${estimated_bmi.toFixed(1)} (category: ${bmi_category})

PHOTO-REALISTIC GUIDANCE:
1. If hip-to-shoulder-ratio > 1.1 → optimize bigHips and assLarge within K=5 envelope.
2. If waist-to-hip-ratio < 0.8 → optimize narrowWaist within K=5 envelope.
3. If BMI > 30 → pearFigure towards upper envelope, bodybuilderSize towards lower.
4. If BMI < 20 → emaciated can be optimized within its envelope range.
5. TorsoMass controls torso width via bones (not via shape keys).
6. All adjustments MUST remain within the K=5 envelope.`;
}

/**
 * Build gender-specific constraints section
 * PHASE B: Enforce gender-specific DB bans and limitations
 */ function buildGenderSpecificConstraints(resolvedGender, mappingData, vision_classification, traceId) {
  console.log(`🔍 [promptBuilder] [${traceId}] PHASE B: Building gender-specific constraints:`, {
    resolvedGender,
    philosophy: 'phase_b_gender_specific_db_constraints'
  });
  // Find banned keys for this gender (range)
  const bannedShapeKeys = Object.entries(mappingData?.morph_values || {}).filter(([key, range])=>range.min === 0 && range.max === 0).map(([key])=>key);
  const fixedLimbMasses = Object.entries(mappingData?.limb_masses || {}).filter(([key, range])=>range.min === range.max).map(([key, range])=>({
      key,
      value: range.min
    }));
  let genderSection = `

GENDER ${resolvedGender.toUpperCase()} CONSTRAINTS:

BANNED KEYS (MUST REMAIN AT 0):
${bannedShapeKeys.length > 0 ? bannedShapeKeys.map((key)=>`- ${key}: 0 (banned by DB for ${resolvedGender})`).join('\n') : '- No banned keys'}

FIXED LIMB MASSES (EXACT VALUES):
${fixedLimbMasses.length > 0 ? fixedLimbMasses.map(({ key, value })=>`- ${key}: ${value.toFixed(3)} (fixed DB value)`).join('\n') : '- No fixed masses'}`;
  
  if (resolvedGender === 'masculine') {
    genderSection += `

MASCULINE SPECIFICITIES:
- pregnant, nipples, animeProportion MUST remain at 0 (banned by DB).
- superBreast limited by K=5 envelope (generally ≤ 0 for masculine).
- Focus on bodybuilderSize/bodybuilderDetails for masculine muscularity.
- emaciated = standard morphological key (no special treatment).

STRICT MASCULINE PHYSIOLOGICAL CONSTRAINTS:
- breastsSmall: NEVER exceed 1.0 (absolute masculine physiological limit).
- superBreast: MUST be 0.0 or negative, NEVER positive (masculine anatomy).
- These limits are NON-NEGOTIABLE physiological constraints for masculine gender.
- Any value exceeding these thresholds will be automatically corrected by validation.
- PRIORITY: Respect natural masculine anatomy before any other consideration.`;
  } else { // Feminine
    genderSection += `

FEMININE SPECIFICITIES:
- All feminine keys available according to K=5 envelope.
- Balance superBreast, bigHips, assLarge based on photos.
- Feminine muscularity via bodybuilderSize/bodybuilderDetails within envelope.
- emaciated treated as standard morphological key (no special treatment).`;
  }
  genderSection += `

CRITICAL GENDER REMINDER:
Gender constraints are already integrated into the K=5 envelope.
Strictly adhere to banned and fixed values defined by the DB.`;

  const explicitlyMuscularClassifications = [
    'Musclé',
    'Musclée',
    'Athlétique',
    'Normal costaud'
  ];
  if (explicitlyMuscularClassifications.includes(vision_classification?.muscularity) && (vision_classification?.obesity === 'Obèse' || vision_classification?.obesity === 'Obésité morbide')) {
    genderSection += `

SPECIAL INSTRUCTION - MUSCULAR/ATHLETIC AND OBESE USER DETECTED:
- Classification: ${vision_classification?.muscularity} and ${vision_classification?.obesity}
- IMPERATIVE: Maximize bodybuilderSize AND bodybuilderDetails up to the MAXIMUM LIMITS allowed.
- CONSTRAINT: Absolutely respect K=5 envelope and DB physiological bounds.
- PRIORITY: Athletic and defined silhouette above all else.
- EXPECTED RESULT: Avatar faithfully representing user's musculature.`;
  }
  return genderSection;
}

/**
 * Get muscularity level from classification string
 */ function getMuscularityLevelFromClassification(muscularity) {
  const muscularityLevels = {
    'Atrophié sévère': 0.1,
    'Atrophiée sévère': 0.1,
    'Légèrement atrophié': 0.2,
    'Moins musclée': 0.2,
    'Normal': 0.4,
    'Moyen musclé': 0.6,
    'Moyennement musclée': 0.6,
    'Musclé': 0.8,
    'Musclée': 0.8,
    'Normal costaud': 0.9,
    'Athlétique': 0.9
  };
  return muscularityLevels[muscularity] || 0.4;
}
