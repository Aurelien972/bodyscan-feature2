/**
 * Profile Domain Types - Simplified for Body Scan
 * Essential profile data for identity and avatar functionality
 */

type Sex = 'male' | 'female' | 'other';
type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'athlete';
type Objective = 'fat_loss' | 'recomp' | 'muscle_gain';

export interface UserProfile {
  userId: string;
  sex?: Sex;
  birthdate?: string; // ISO
  height_cm?: number;
  weight_kg?: number;
  target_weight_kg?: number;
  objective?: Objective;
  activity_level?: ActivityLevel;
  job_category?: 'office' | 'field' | 'shift' | 'manual' | 'student' | 'other';
  updated_at?: string;
}