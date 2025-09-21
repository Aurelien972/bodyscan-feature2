// supabase/functions/scan-refine-morphs/openaiClient.ts
/**
 * OpenAI Client for AI-Driven Morphological Refinement
 * Handles OpenAI API calls with structured JSON output
 */ /**
 * Call OpenAI for AI-driven morphological refinement
 */ export async function callOpenAIForRefinement(prompt, photos, traceId) {
  console.log(`🔍 [openaiClient] [${traceId}] Calling OpenAI for AI-driven refinement`);
  const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
  if (!openaiApiKey) {
    throw new Error('OpenAI API key not configured');
  }
  // Build content array with prompt and photos
  const content = [
    {
      type: 'text',
      text: prompt
    }
  ];
  // Add available photos
  photos.forEach((photo)=>{
    if (photo.url) {
      content.push({
        type: 'image_url',
        image_url: {
          url: photo.url
        }
      });
    }
  });
  console.log(`🔍 [openaiClient] [${traceId}] OpenAI request prepared:`, {
    model: 'gpt-4o',
    contentItems: content.length,
    photosIncluded: photos.length,
    promptLength: prompt.length,
    philosophy: 'ai_driven_structured_json_output'
  });
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'user',
            content: content
          }
        ],
        max_tokens: 3000,
        temperature: 0.1 // Low temperature for consistent, precise results
      })
    });
    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`❌ [openaiClient] [${traceId}] OpenAI API error:`, {
        status: response.status,
        statusText: response.statusText,
        body: errorBody.substring(0, 500)
      });
      throw new Error(`OpenAI API error: ${response.status} - ${response.statusText}`);
    }
    const result = await response.json();
    const responseContent = result.choices[0]?.message?.content;
    if (!responseContent) {
      console.error(`❌ [openaiClient] [${traceId}] OpenAI returned empty content:`, {
        choices: result.choices,
        usage: result.usage,
        finish_reason: result.choices[0]?.finish_reason
      });
      throw new Error('OpenAI returned empty content');
    }
    console.log(`🔍 [openaiClient] [${traceId}] OpenAI raw response received:`, {
      contentLength: responseContent.length,
      usage: result.usage,
      finish_reason: result.choices[0]?.finish_reason
    });
    // Parse and validate JSON response
    const parsedResult = parseAIRefinementResponse(responseContent, traceId);
    // PHASE 1: Strict validation of parsed result structure
    if (!parsedResult.final_shape_params || typeof parsedResult.final_shape_params !== 'object') {
      throw new Error('OpenAI response missing or invalid final_shape_params');
    }
    if (!parsedResult.final_limb_masses || typeof parsedResult.final_limb_masses !== 'object') {
      throw new Error('OpenAI response missing or invalid final_limb_masses');
    }
    if (Object.keys(parsedResult.final_shape_params).length === 0) {
      throw new Error('OpenAI response final_shape_params is empty');
    }
    if (Object.keys(parsedResult.final_limb_masses).length === 0) {
      throw new Error('OpenAI response final_limb_masses is empty');
    }
    // PHASE 1: Validate all values are finite numbers
    for (const [key, value] of Object.entries(parsedResult.final_shape_params)){
      if (typeof value !== 'number' || !Number.isFinite(value)) {
        throw new Error(`OpenAI response final_shape_params.${key} is not a finite number: ${value}`);
      }
    }
    for (const [key, value] of Object.entries(parsedResult.final_limb_masses)){
      if (typeof value !== 'number' || !Number.isFinite(value)) {
        throw new Error(`OpenAI response final_limb_masses.${key} is not a finite number: ${value}`);
      }
    }
    console.log(`✅ [openaiClient] [${traceId}] AI refinement response parsed successfully:`, {
      finalShapeParamsCount: Object.keys(parsedResult.final_shape_params).length,
      finalLimbMassesCount: Object.keys(parsedResult.final_limb_masses).length,
      confidence: parsedResult.confidence,
      refinementNotesCount: parsedResult.refinement_notes.length,
      validationPassed: true,
      philosophy: 'ai_driven_structured_success'
    });
    return parsedResult;
  } catch (error) {
    console.error(`❌ [openaiClient] [${traceId}] OpenAI API call failed:`, error);
    throw error;
  }
}
/**
 * Parse AI refinement response with robust error handling
 */ function parseAIRefinementResponse(content, traceId) {
  console.log(`🔍 [openaiClient] [${traceId}] Parsing AI refinement response`);
  try {
    // Clean the content to extract JSON
    let jsonContent = content.trim();
    // Remove markdown code blocks if present
    if (jsonContent.startsWith('```json')) {
      jsonContent = jsonContent.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (jsonContent.startsWith('```')) {
      jsonContent = jsonContent.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }
    // Find JSON object boundaries
    const jsonStart = jsonContent.indexOf('{');
    const jsonEnd = jsonContent.lastIndexOf('}');
    if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
      jsonContent = jsonContent.substring(jsonStart, jsonEnd + 1);
    }
    const parsed = JSON.parse(jsonContent);
    // Validate required fields
    if (!parsed.final_shape_params || typeof parsed.final_shape_params !== 'object') {
      throw new Error('Missing or invalid final_shape_params in AI response');
    }
    if (!parsed.final_limb_masses || typeof parsed.final_limb_masses !== 'object') {
      throw new Error('Missing or invalid final_limb_masses in AI response');
    }
    // Validate all values are finite numbers
    for (const [key, value] of Object.entries(parsed.final_shape_params)){
      if (typeof value !== 'number' || !Number.isFinite(value)) {
        throw new Error(`Invalid final_shape_params.${key}: must be a finite number, got ${value}`);
      }
    }
    for (const [key, value] of Object.entries(parsed.final_limb_masses)){
      if (typeof value !== 'number' || !Number.isFinite(value)) {
        throw new Error(`Invalid final_limb_masses.${key}: must be a finite number, got ${value}`);
      }
    }
    // Ensure confidence is valid
    const confidence = typeof parsed.confidence === 'number' && Number.isFinite(parsed.confidence) ? Math.max(0, Math.min(1, parsed.confidence)) : 0.8;
    // Ensure refinement_notes is an array
    const refinement_notes = Array.isArray(parsed.refinement_notes) ? parsed.refinement_notes : [
      'AI refinement applied'
    ];

    // Ensure all expected array and numeric properties are present
    const clamped_keys = Array.isArray(parsed.clamped_keys) ? parsed.clamped_keys : [];
    const envelope_violations = Array.isArray(parsed.envelope_violations) ? parsed.envelope_violations : [];
    const db_violations = Array.isArray(parsed.db_violations) ? parsed.db_violations : [];
    const gender_violations = Array.isArray(parsed.gender_violations) ? parsed.gender_violations : [];
    const missing_keys_added = Array.isArray(parsed.missing_keys_added) ? parsed.missing_keys_added : [];
    const extra_keys_removed = Array.isArray(parsed.extra_keys_removed) ? parsed.extra_keys_removed : [];
    const out_of_range_count = typeof parsed.out_of_range_count === 'number' ? parsed.out_of_range_count : 0;

    console.log(`✅ [openaiClient] [${traceId}] AI response parsed and validated:`, {
      finalShapeParamsCount: Object.keys(parsed.final_shape_params).length,
      finalLimbMassesCount: Object.keys(parsed.final_limb_masses).length,
      confidence,
      refinementNotesCount: refinement_notes.length,
      clampedKeysCount: clamped_keys.length,
      envelopeViolationsCount: envelope_violations.length,
      dbViolationsCount: db_violations.length,
      outOfRangeCount: out_of_range_count
    });
    return {
      final_shape_params: parsed.final_shape_params,
      final_limb_masses: parsed.final_limb_masses,
      confidence,
      refinement_notes,
      clamped_keys,
      envelope_violations,
      db_violations,
      gender_violations,
      missing_keys_added,
      extra_keys_removed,
      out_of_range_count
    };
  } catch (error) {
    console.error(`❌ [openaiClient] [${traceId}] Failed to parse AI refinement response:`, {
      error: error instanceof Error ? error.message : 'Unknown error',
      contentPreview: content.substring(0, 200)
    });
    throw new Error(`Failed to parse AI refinement response: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
