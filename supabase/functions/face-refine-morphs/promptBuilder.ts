import { canonicalizeDict, canonicalizeK5Envelope } from '../_shared/utils/faceKeys.ts';

/** Builds the OpenAI prompt (canonical keys only) */
export function buildAIRefinementPrompt(options: any) {
  const { photos, blend_face_params, mappingData, resolvedGender, k5_envelope, face_semantic_profile, traceId } = options;

  const blend = canonicalizeDict<number>(blend_face_params || {});
  const k5    = canonicalizeK5Envelope(k5_envelope);
  const dbb   = mappingData.face_values || {};

  const blendStr = Object.entries(blend).map(([k,v]) => `${k}: ${Number.isFinite(v) ? v.toFixed(3) : '0.000'}`).join(', ');
  const k5Str    = Object.entries(k5.shape_params_envelope).map(([k,b]) => `${k}: [${b.min.toFixed(3)}, ${b.max.toFixed(3)}]`).join(', ');
  const dbStr    = Object.entries(dbb).map(([k,b]) => `${k}: [${b.min.toFixed(3)}, ${b.max.toFixed(3)}]`).join(', ');

  const prompt = `
You are an expert 3D facial morphing AI. Refine the face morphs.

Input:
- Blended Face Params (canonical keys, no "BS_LOD0."): { ${blendStr} }
- K=5 Envelope (strict): { ${k5Str} }
- DB Physiological Bounds (hard): { ${dbStr} }
- Semantic: { face_shape: ${face_semantic_profile.face_shape}, eye_shape: ${face_semantic_profile.eye_shape}, nose_type: ${face_semantic_profile.nose_type}, lip_fullness: ${face_semantic_profile.lip_fullness} }
- Resolved Gender: ${resolvedGender}

Rules:
1) Stay within K=5 envelope; clamp to nearest boundary if needed.
2) Then enforce DB bounds; clamp if needed.
3) Return ONLY canonical keys (no "BS_LOD0.").

Output JSON ONLY:
{
  "ai_refine": true,
  "final_face_params": { "FaceJawWidth": <number>, "...": <number> },
  "clamped_keys": ["..."],
  "envelope_violations": ["..."],
  "db_violations": ["..."],
  "gender_violations": ["..."],
  "out_of_range_count": <number>,
  "missing_keys_added": ["..."],
  "extra_keys_removed": ["..."],
  "active_keys_count": <number>,
  "mapping_version": "v1.0",
  "ai_confidence": <number>,
  "refinement_deltas": {
    "top_10_face_deltas": [{"key":"FaceJawWidth","delta":0.12,"blend":0.10,"final":0.22}],
    "total_face_changes": <number>
  }
}
`;
  console.log(`📝 [promptBuilder] [${traceId}] AI Prompt built (canonical).`);
  return prompt;
}
