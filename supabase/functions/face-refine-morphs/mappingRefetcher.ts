import { createClient } from 'npm:@supabase/supabase-js@2.54.0';
import { toCanonicalKey } from '../_shared/utils/faceKeys.ts';

/**
 * Fetches face morphology mapping data directly from database
 * Returns canonical keys (no BS_LOD0.)
 */
export async function refetchFaceMorphologyMapping(mappingVersion: string, gender: string) {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ [mappingRefetcher] Supabase configuration missing');
    return null;
  }
  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  console.log(`🔍 [mappingRefetcher] Fetching face_archetypes for ${gender} mapping`);
  try {
    const { data: rows, error } = await supabase
      .from('face_archetypes')
      .select('face_values, gender')
      .eq('gender', gender);

    if (error) {
      console.error('❌ [mappingRefetcher] Database query failed:', error);
      return null;
    }
    if (!rows || rows.length === 0) {
      console.warn(`⚠️ [mappingRefetcher] No face archetypes found for gender: ${gender}`);
      return null;
    }

    // Build canonical min/max per key from DB JSON
    const faceValues: Record<string, {min:number,max:number}> = {};
    for (const r of rows) {
      const fv = r.face_values as Record<string, number>;
      if (!fv) continue;
      for (const [rawKey, val] of Object.entries(fv)) {
        if (typeof val !== 'number' || !Number.isFinite(val)) continue;
        const key = toCanonicalKey(rawKey);
        const cur = faceValues[key];
        if (!cur) {
          faceValues[key] = { min: val, max: val };
        } else {
          cur.min = Math.min(cur.min, val);
          cur.max = Math.max(cur.max, val);
        }
      }
    }

    console.log(`✅ [mappingRefetcher] Canonical face mapping built for ${gender}:`, {
      faceValuesCount: Object.keys(faceValues).length,
      philosophy: 'face_mapping_from_db_canonical'
    });

    return { face_values: faceValues }; // canonical keys only
  } catch (err) {
    console.error('❌ [mappingRefetcher] Error refetching face morphology mapping:', err);
    return null;
  }
}
