/**
 * Interplay Evaluator
 * Evaluates interplay conditions for dynamic bone enabling
 */

import type { InterplayRule } from '../boneMapping';

/**
 * Check if a limb mass key should be applied to bones based on interplay rules
 */
export function shouldApplyLimbMassToBones(
  limbMassKey: string,
  shapeParams: Record<string, number> = {},
  interplayRules: InterplayRule[]
): boolean {
  // Check interplay rules for dynamic enabling
  for (const rule of interplayRules) {
    if (rule.enable_keys?.includes(limbMassKey)) {
      const shouldEnable = evaluateInterplayCondition(rule.when, shapeParams);
      
      console.log('INTERPLAY_EVALUATOR', 'Interplay rule evaluation', {
        limbMassKey,
        condition: rule.when,
        shouldEnable,
        shapeParamsUsed: Object.keys(shapeParams).filter(k => rule.when.includes(k)),
        philosophy: 'phase_a_interplay_evaluation'
      });
      
      if (shouldEnable) {
        return true;
      }
    }
  }
  
  return false;
}

/**
 * Evaluate interplay condition
 * Simple expression evaluator for bone mapping conditions
 */
function evaluateInterplayCondition(
  condition: string,
  shapeParams: Record<string, number>
): boolean {
  console.log('INTERPLAY_EVALUATOR', 'Evaluating condition with enhanced debugging', {
    condition,
    shapeParamsAvailable: Object.keys(shapeParams),
    shapeParamsValues: Object.entries(shapeParams).map(([k, v]) => ({ key: k, value: v.toFixed(3) })),
    philosophy: 'condition_evaluation_debug'
  });
  
  try {
    // Replace shape param names with their values
    let expression = condition;
    
    Object.entries(shapeParams).forEach(([key, value]) => {
      const regex = new RegExp(`\\b${key}\\b`, 'g');
      expression = expression.replace(regex, value.toString());
    });
    
    console.log('INTERPLAY_EVALUATOR', 'Expression evaluation details', {
      originalCondition: condition,
      processedExpression: expression,
      philosophy: 'expression_processing_debug'
    });
    
    // Simple evaluation for basic conditions
    if (expression.includes('>=')) {
      const [left, right] = expression.split('>=').map(s => s.trim());
      const leftVal = parseFloat(left);
      const rightVal = parseFloat(right);
      const result = !isNaN(leftVal) && !isNaN(rightVal) && leftVal >= rightVal;
      
      console.log('INTERPLAY_EVALUATOR', 'Condition evaluation result', {
        condition,
        leftVal,
        rightVal,
        result,
        leftIsNaN: isNaN(leftVal),
        rightIsNaN: isNaN(rightVal),
        philosophy: 'condition_result_debug'
      });
      
      return result;
    }
    
    if (expression.includes('<=')) {
      const [left, right] = expression.split('<=').map(s => s.trim());
      const leftVal = parseFloat(left);
      const rightVal = parseFloat(right);
      return !isNaN(leftVal) && !isNaN(rightVal) && leftVal <= rightVal;
    }
    
    if (expression.includes('||')) {
      const conditions = expression.split('||').map(s => s.trim());
      return conditions.some(cond => evaluateInterplayCondition(cond, shapeParams));
    }
    
    if (expression.includes('&&')) {
      const conditions = expression.split('&&').map(s => s.trim());
      return conditions.every(cond => evaluateInterplayCondition(cond, shapeParams));
    }
    
    // Fallback: return false for unknown expressions
    console.warn('INTERPLAY_EVALUATOR', 'Unknown interplay condition format', {
      condition,
      expression,
      philosophy: 'phase_a_condition_evaluation_fallback'
    });
    
    return false;
  } catch (error) {
    console.error('INTERPLAY_EVALUATOR', 'Error evaluating interplay condition', {
      condition,
      error: error instanceof Error ? error.message : 'Unknown error',
      philosophy: 'phase_a_condition_evaluation_error'
    });
    return false;
  }
}