/*
  # Face Scan RPC Functions

  1. New Functions
    - `face_match_top5` - Finds K=5 closest face archetypes based on categorical matching
    - `face_k5_envelope` - Constructs min/max envelope from selected archetypes' face_values

  2. Security
    - Functions are accessible to authenticated users
    - Input validation and sanitization included
    - Uses existing face_archetypes table structure

  3. Performance
    - Leverages existing indexes on face_archetypes
    - Optimized queries for categorical matching
    - Efficient JSON aggregation for envelope construction
*/

-- Function to find K=5 closest face archetypes based on categorical matching
CREATE OR REPLACE FUNCTION face_match_top5(
  p_gender text,
  p_face_shape text,
  p_eye_shape text,
  p_nose_type text,
  p_lip_fullness text
)
RETURNS TABLE (
  id uuid,
  name text,
  gender text,
  face_shape text,
  eye_shape text,
  nose_type text,
  lip_fullness text,
  face_values jsonb,
  match_score integer
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    fa.id,
    fa.name,
    fa.gender,
    fa.face_shape,
    fa.eye_shape,
    fa.nose_type,
    fa.lip_fullness,
    fa.face_values,
    (
      CASE WHEN fa.gender = p_gender THEN 1 ELSE 0 END +
      CASE WHEN fa.face_shape = p_face_shape THEN 1 ELSE 0 END +
      CASE WHEN fa.eye_shape = p_eye_shape THEN 1 ELSE 0 END +
      CASE WHEN fa.nose_type = p_nose_type THEN 1 ELSE 0 END +
      CASE WHEN fa.lip_fullness = p_lip_fullness THEN 1 ELSE 0 END
    ) as match_score
  FROM face_archetypes fa
  WHERE fa.gender = p_gender  -- Always filter by gender first
  ORDER BY match_score DESC, fa.name ASC
  LIMIT 5;
END;
$$;

-- Function to construct K=5 envelope from selected archetype IDs
CREATE OR REPLACE FUNCTION face_k5_envelope(p_ids uuid[])
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result jsonb := '{}';
  morph_key text;
  min_val numeric;
  max_val numeric;
  allowed_keys text[] := ARRAY[
    'browInnerUp', 'browDownLeft', 'browDownRight', 'browOuterUpLeft', 'browOuterUpRight',
    'eyeLookUpLeft', 'eyeLookUpRight', 'eyeLookDownLeft', 'eyeLookDownRight',
    'eyeLookInLeft', 'eyeLookInRight', 'eyeLookOutLeft', 'eyeLookOutRight',
    'eyeBlinkLeft', 'eyeBlinkRight', 'eyeSquintLeft', 'eyeSquintRight',
    'eyeWideLeft', 'eyeWideRight', 'cheekPuff', 'cheekSquintLeft', 'cheekSquintRight',
    'noseSneerLeft', 'noseSneerRight', 'jawOpen', 'jawForward', 'jawLeft', 'jawRight',
    'mouthFunnel', 'mouthPucker', 'mouthLeft', 'mouthRight', 'mouthRollUpper',
    'mouthRollLower', 'mouthShrugUpper', 'mouthShrugLower', 'mouthClose',
    'mouthSmileLeft', 'mouthSmileRight', 'mouthFrownLeft', 'mouthFrownRight',
    'mouthDimpleLeft', 'mouthDimpleRight', 'mouthUpperUpLeft', 'mouthUpperUpRight',
    'mouthLowerDownLeft', 'mouthLowerDownRight', 'mouthPressLeft', 'mouthPressRight',
    'mouthStretchLeft', 'mouthStretchRight', 'tongueOut'
  ];
BEGIN
  -- Validate input
  IF p_ids IS NULL OR array_length(p_ids, 1) = 0 THEN
    RAISE EXCEPTION 'p_ids cannot be null or empty';
  END IF;

  -- For each allowed morph key, calculate min/max across all selected archetypes
  FOREACH morph_key IN ARRAY allowed_keys
  LOOP
    SELECT 
      MIN((face_values->>morph_key)::numeric),
      MAX((face_values->>morph_key)::numeric)
    INTO min_val, max_val
    FROM face_archetypes 
    WHERE id = ANY(p_ids)
      AND face_values ? morph_key
      AND (face_values->>morph_key) ~ '^-?[0-9]+\.?[0-9]*$';  -- Valid numeric check

    -- Only include keys that have valid numeric values
    IF min_val IS NOT NULL AND max_val IS NOT NULL THEN
      result := result || jsonb_build_object(
        morph_key, 
        jsonb_build_object(
          'min', min_val,
          'max', max_val
        )
      );
    END IF;
  END LOOP;

  RETURN result;
END;
$$;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION face_match_top5(text, text, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION face_k5_envelope(uuid[]) TO authenticated;