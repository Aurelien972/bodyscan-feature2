/**
 * Limb Masses Normalization
 * Single source of truth for limb masses extraction and validation
 */

type LimbMasses = Partial<{
  armMass: number;
  forearmMass: number;
  thighMass: number;
  calfMass: number;
  torsoMass: number;
  neckMass: number;
  hipMass?: number;
  shoulderMass?: number;
  gate?: number | boolean;
  isActive?: boolean;
}>;

const EXPECTED_KEYS = ['armMass', 'forearmMass', 'thighMass', 'calfMass', 'torsoMass', 'neckMass'];

function toNum(v: any): number | null {
  const n = typeof v === 'string' ? parseFloat(v) : (typeof v === 'number' ? v : NaN);
  return Number.isFinite(n) ? n : null;
}

export function normalizeLimbMasses(scan: any): { masses: LimbMasses; count: number; missing: string[] } {
  // 1) trouve la meilleure source
  const raw = scan?.limb_masses ?? 
              scan?.limbMasses ?? 
              scan?.match?.blended_limb_masses ??
              scan?.match?.primary_archetype?.limb_masses ?? 
              scan?.match?.selected_archetypes?.[0]?.limb_masses ??
              scan?.estimate?.extracted_data?.limb_masses ??
              null;
  
  const parsed = typeof raw === 'string' ? safeParseJSON(raw) : raw;
  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Missing limb_masses in scan');
  }

  // 2) numérise et nettoie
  const masses: LimbMasses = {};
  for (const k of EXPECTED_KEYS) {
    const val = toNum(parsed[k]);
    if (val !== null) {
      masses[k as keyof LimbMasses] = val; // ex: 0.65, 1.148, etc.
    }
  }
  
  // flags
  const gate = toNum(parsed.gate);
  masses.gate = (gate === null) ? 1 : gate; // défaut = 1 (ou true)
  masses.isActive = parsed.isActive ?? true; // défaut = true

  // 3) stats & manquants
  const present = Object.keys(masses).filter(k => EXPECTED_KEYS.includes(k));
  const missing = EXPECTED_KEYS.filter(k => !present.includes(k));
  
  return { masses, count: present.length, missing };
}

function safeParseJSON(s: string) {
  try { 
    return JSON.parse(s); 
  } catch { 
    return null; 
  }
}