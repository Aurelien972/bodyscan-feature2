/**
 * Lighting Setup
 * Professional lighting configuration for realistic avatar rendering
 */

import * as THREE from 'three';
import logger from '../../utils/logger';

/**
 * Setup professional VisionOS26 lighting system
 * Enhanced for realistic skin rendering across all skin tones
 * ENHANCED: Optimized for PBR materials with true subsurface scattering
 */
export function setupLighting(scene: THREE.Scene): void {
  // Ensure scene is properly initialized
  if (!scene) {
    throw new Error('Scene is not initialized - cannot setup lighting');
  }
  
  // ENHANCED: Key light optimized for SSS skin materials
  const keyLight = new THREE.DirectionalLight(0xfff8f0, 2.8); // Warmer white, increased intensity for SSS
  keyLight.position.set(2, 4, 3);
  keyLight.castShadow = true;
  keyLight.shadow.mapSize.width = 2048;
  keyLight.shadow.mapSize.height = 2048;
  keyLight.shadow.camera.near = 0.1;
  keyLight.shadow.camera.far = 20;
  keyLight.shadow.camera.left = -5;
  keyLight.shadow.camera.right = 5;
  keyLight.shadow.camera.top = 5;
  keyLight.shadow.camera.bottom = -5;
  keyLight.shadow.bias = -0.0001; // Reduce shadow acne
  keyLight.shadow.normalBias = 0.02; // Improve shadow quality
  
  scene.add(keyLight);

  // ENHANCED: Fill light optimized for SSS skin rendering
  const fillLight = new THREE.DirectionalLight(0xfff5e6, 1.6); // Warmer fill, increased for SSS
  fillLight.position.set(-2, 3, 2);
  scene.add(fillLight);

  // ENHANCED: Back light for SSS rim lighting
  const backLight = new THREE.DirectionalLight(0xf5f0ff, 1.4); // Slightly warmer cool light for SSS
  backLight.position.set(0, 2, -3);
  scene.add(backLight);

  // ENHANCED: Side lights for SSS lateral illumination
  const leftSideLight = new THREE.DirectionalLight(0xfff2e6, 0.8); // Warmer side light for SSS
  leftSideLight.position.set(-4, 1.5, 0);
  scene.add(leftSideLight);
  
  const rightSideLight = new THREE.DirectionalLight(0xfff2e6, 0.8); // Warmer side light for SSS
  rightSideLight.position.set(4, 1.5, 0);
  scene.add(rightSideLight);

  // ENHANCED: Rim light for SSS edge definition
  const rimLight = new THREE.DirectionalLight(0xeef0ff, 0.6); // Warmer rim light for SSS
  rimLight.position.set(1, 4, -2);
  scene.add(rimLight);

  // ENHANCED: Ambient light for SSS global illumination
  const ambientLight = new THREE.AmbientLight(0x4a4540, 0.7); // Warmer ambient for SSS
  scene.add(ambientLight);
  
  // ENHANCED: Bottom light for SSS lower body illumination
  const bottomLight = new THREE.DirectionalLight(0xfff0e1, 0.4); // Warmer bottom light for SSS
  bottomLight.position.set(0, -1, 2);
  scene.add(bottomLight);
  
  // ENHANCED: Hemisphere light for SSS natural illumination
  const hemisphereLight = new THREE.HemisphereLight(0x8ac6eb, 0x9b5520, 0.6); // Warmer sky/ground for SSS
  scene.add(hemisphereLight);
  
  // ENHANCED: Face light for SSS facial illumination
  const faceLight = new THREE.DirectionalLight(0xfff5dc, 0.4); // Warmer face light for SSS
  faceLight.position.set(0, 3, 4);
  scene.add(faceLight);
  
  logger.info('ENHANCED_SSS_LIGHTING_SETUP', 'Enhanced SSS-optimized lighting setup completed', {
    totalLights: 10,
    lightingStrategy: 'enhanced_sss_optimized_multi_temperature_warmer',
    keyLightIntensity: 2.8,
    ambientEnhanced: 'increased_for_sss_global_illumination',
    temperatureVariation: 'warmer_spectrum_for_sss_skin_rendering',
    shadowQuality: 'enhanced_with_bias_correction',
    intensityOptimization: 'enhanced_for_sss_light_penetration',
    sceneChildren: scene.children.length,
    lightsAdded: scene.children.filter(child => child.isLight).length,
    sssOptimizations: {
      warmerColorTemperatures: true,
      increasedIntensityForTransmission: true,
      multiDirectionalForSSS: true,
      naturalSkinIllumination: true
    },
    philosophy: 'enhanced_sss_photo_realistic_skin_rendering_all_tones'
  });
}