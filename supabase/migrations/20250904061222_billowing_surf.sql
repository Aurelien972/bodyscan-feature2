/*
  # Create Weighted Distance Function for Archetype Matching

  1. New Functions
    - `calculate_archetype_weighted_distance` - Calculates semantic distance between user and archetype
    - `map_obesity_to_numeric` - Maps obesity classes to numeric values
    - `map_muscularity_to_numeric` - Maps muscularity classes to numeric values
    - `map_level_to_numeric` - Maps level classes to numeric values
    - `map_morphotype_to_numeric` - Maps morphotype classes to numeric values

  2. Indexes
    - Composite indexes on semantic columns for optimized filtering
    - Individual indexes on morph_index and muscle_index

  3. Configuration
    - Configurable weights for distance calculation components
*/

-- Create mapping functions for semantic classes to numeric values

CREATE OR REPLACE FUNCTION map_obesity_to_numeric(obesity_class TEXT)
RETURNS NUMERIC AS $$
BEGIN
  RETURN CASE obesity_class
    WHEN 'Non obèse' THEN 0
    WHEN 'Surpoids' THEN 1
    WHEN 'Obèse' THEN 2
    WHEN 'Obésité morbide' THEN 3
    ELSE 0 -- Default to 'Non obèse'
  END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE OR REPLACE FUNCTION map_muscularity_to_numeric(muscularity_class TEXT)
RETURNS NUMERIC AS $$
BEGIN
  RETURN CASE muscularity_class
    WHEN 'Atrophié' THEN 0
    WHEN 'Normal' THEN 1
    WHEN 'Moyen musclé' THEN 2
    WHEN 'Athlétique' THEN 3
    ELSE 1 -- Default to 'Normal'
  END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE OR REPLACE FUNCTION map_level_to_numeric(level_class TEXT)
RETURNS NUMERIC AS $$
BEGIN
  RETURN CASE level_class
    WHEN 'Émacié' THEN 0
    WHEN 'Mince' THEN 1
    WHEN 'Normal' THEN 2
    WHEN 'Surpoids' THEN 3
    WHEN 'Obèse' THEN 4
    WHEN 'Obèse morbide' THEN 5
    ELSE 2 -- Default to 'Normal'
  END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE OR REPLACE FUNCTION map_morphotype_to_numeric(morphotype_class TEXT)
RETURNS NUMERIC AS $$
BEGIN
  RETURN CASE morphotype_class
    WHEN 'REC' THEN 0 -- Rectangle
    WHEN 'SAB' THEN 1 -- Sablier/Hourglass
    WHEN 'POI' THEN 2 -- Poire/Pear
    WHEN 'POM' THEN 3 -- Pomme/Apple
    WHEN 'TRI' THEN 4 -- Triangle inversé
    WHEN 'OVA' THEN 5 -- Ovale
    ELSE 0 -- Default to 'REC'
  END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Main weighted distance calculation function
CREATE OR REPLACE FUNCTION calculate_archetype_weighted_distance(
  p_user_morph_index NUMERIC,
  p_user_muscle_index NUMERIC,
  p_user_bmi NUMERIC,
  p_user_obesity_class TEXT,
  p_user_muscularity_class TEXT,
  p_user_level_class TEXT,
  p_user_morphotype_class TEXT,
  p_archetype_id TEXT,
  p_weight_obesity NUMERIC DEFAULT 0.5,
  p_weight_muscularity NUMERIC DEFAULT 0.2,
  p_weight_level NUMERIC DEFAULT 0.1,
  p_weight_morphotype NUMERIC DEFAULT 0.1,
  p_weight_morph_index NUMERIC DEFAULT 0.05,
  p_weight_muscle_index NUMERIC DEFAULT 0.05
)
RETURNS NUMERIC AS $$
DECLARE
  archetype_record RECORD;
  user_obesity_numeric NUMERIC;
  user_muscularity_numeric NUMERIC;
  user_level_numeric NUMERIC;
  user_morphotype_numeric NUMERIC;
  archetype_obesity_numeric NUMERIC;
  archetype_muscularity_numeric NUMERIC;
  archetype_level_numeric NUMERIC;
  archetype_morphotype_numeric NUMERIC;
  archetype_bmi_center NUMERIC;
  dist_obesity NUMERIC;
  dist_muscularity NUMERIC;
  dist_level NUMERIC;
  dist_morphotype NUMERIC;
  dist_morph_index NUMERIC;
  dist_muscle_index NUMERIC;
  dist_bmi NUMERIC;
  weighted_distance NUMERIC;
BEGIN
  -- Get archetype data
  SELECT 
    obesity, muscularity, level, morphotype, 
    morph_index, muscle_index, bmi_range
  INTO archetype_record
  FROM morph_archetypes
  WHERE id = p_archetype_id;
  
  IF NOT FOUND THEN
    RETURN 999999; -- Very high distance for non-existent archetypes
  END IF;
  
  -- Map user classes to numeric values
  user_obesity_numeric := map_obesity_to_numeric(p_user_obesity_class);
  user_muscularity_numeric := map_muscularity_to_numeric(p_user_muscularity_class);
  user_level_numeric := map_level_to_numeric(p_user_level_class);
  user_morphotype_numeric := map_morphotype_to_numeric(p_user_morphotype_class);
  
  -- Map archetype classes to numeric values
  archetype_obesity_numeric := map_obesity_to_numeric(archetype_record.obesity);
  archetype_muscularity_numeric := map_muscularity_to_numeric(archetype_record.muscularity);
  archetype_level_numeric := map_level_to_numeric(archetype_record.level);
  archetype_morphotype_numeric := map_morphotype_to_numeric(archetype_record.morphotype);
  
  -- Calculate BMI center for archetype
  archetype_bmi_center := ((archetype_record.bmi_range->>0)::NUMERIC + (archetype_record.bmi_range->>1)::NUMERIC) / 2;
  
  -- Calculate component distances
  dist_obesity := ABS(user_obesity_numeric - archetype_obesity_numeric);
  dist_muscularity := ABS(user_muscularity_numeric - archetype_muscularity_numeric);
  dist_level := ABS(user_level_numeric - archetype_level_numeric);
  dist_morphotype := ABS(user_morphotype_numeric - archetype_morphotype_numeric);
  dist_morph_index := ABS(p_user_morph_index - COALESCE(archetype_record.morph_index, 0));
  dist_muscle_index := ABS(p_user_muscle_index - COALESCE(archetype_record.muscle_index, 0));
  dist_bmi := ABS(p_user_bmi - archetype_bmi_center) / 10.0; -- Normalize BMI difference
  
  -- Calculate weighted distance
  weighted_distance := 
    (p_weight_obesity * dist_obesity) +
    (p_weight_muscularity * dist_muscularity) +
    (p_weight_level * dist_level) +
    (p_weight_morphotype * dist_morphotype) +
    (p_weight_morph_index * dist_morph_index) +
    (p_weight_muscle_index * dist_muscle_index) +
    (0.0 * dist_bmi); -- BMI is already considered in obesity/level
  
  RETURN weighted_distance;
END;
$$ LANGUAGE plpgsql STABLE;

-- Create optimized indexes for semantic filtering
CREATE INDEX IF NOT EXISTS idx_morph_archetypes_semantic_composite 
ON morph_archetypes (gender, obesity, muscularity, level, morphotype);

CREATE INDEX IF NOT EXISTS idx_morph_archetypes_morph_index 
ON morph_archetypes (morph_index) WHERE morph_index IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_morph_archetypes_muscle_index 
ON morph_archetypes (muscle_index) WHERE muscle_index IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_morph_archetypes_gender_obesity 
ON morph_archetypes (gender, obesity);

CREATE INDEX IF NOT EXISTS idx_morph_archetypes_gender_muscularity 
ON morph_archetypes (gender, muscularity);

-- Create a view for easier archetype selection with pre-calculated distances
CREATE OR REPLACE VIEW v_archetype_selection AS
SELECT 
  id,
  name,
  gender,
  obesity,
  muscularity,
  level,
  morphotype,
  morph_index,
  muscle_index,
  bmi_range,
  morph_values,
  limb_masses,
  notes
FROM morph_archetypes
WHERE 
  morph_values IS NOT NULL 
  AND limb_masses IS NOT NULL
  AND obesity IS NOT NULL
  AND muscularity IS NOT NULL
  AND level IS NOT NULL
  AND morphotype IS NOT NULL;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION map_obesity_to_numeric(TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION map_muscularity_to_numeric(TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION map_level_to_numeric(TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION map_morphotype_to_numeric(TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION calculate_archetype_weighted_distance(
  NUMERIC, NUMERIC, NUMERIC, TEXT, TEXT, TEXT, TEXT, TEXT, NUMERIC, NUMERIC, NUMERIC, NUMERIC, NUMERIC, NUMERIC
) TO authenticated, service_role;

GRANT SELECT ON v_archetype_selection TO authenticated, service_role;