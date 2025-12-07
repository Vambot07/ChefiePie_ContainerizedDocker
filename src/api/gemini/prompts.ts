// Prompt templates for Gemini AI services

export const SUBSTITUTION_PROMPT_TEMPLATE = `You are a culinary expert analyzing ingredient substitutions for recipes.

Recipe: {recipeName}
Missing Ingredients: {missingIngredients}

For EACH missing ingredient, analyze and provide:
1. Is it ESSENTIAL (critical to the dish's success)? true/false
2. List of 2-3 SUITABLE SUBSTITUTIONS (if any exist)
3. If no substitutions are available AND the ingredient is essential, explain the IMPACT on the dish

Respond ONLY with valid JSON in this EXACT format:
[
  {
    "ingredient": "ingredient name",
    "isEssential": true/false,
    "substitutions": ["substitute1", "substitute2"],
    "impact": "description if essential and no substitutes available"
  }
]

IMPORTANT RULES:
- **CRITICAL RULE**: If a missing ingredient's name appears in the recipe name (e.g., "prawn" in "Prawn Fried Rice", "chicken" in "Chicken Curry"), it is AUTOMATICALLY ESSENTIAL regardless of substitution availability. This is the main ingredient that defines the dish.
- If substitutions exist, set impact to empty string ""
- If ingredient is NOT essential, set impact to empty string ""
- Only provide impact if the ingredient is ESSENTIAL AND no substitutions are available
- Return ONLY the JSON array, no markdown formatting, no explanations
- Ensure all substitutions are practical and commonly available
- Consider the recipe type and cuisine when suggesting substitutions
- For title ingredients (ingredients in recipe name), mark as essential even if substitutions exist, but still provide the substitutions`;



export const DETECTION_PROMPT_TEMPLATE = `Analyze this image and identify all food ingredients visible.
                        List each ingredient on a new line.
                        DOnt be specific (e.g., if "red bell pepper" just give "pepper").
                        Only list raw ingredients, not prepared dishes.
                        Do not use bullet points or numbering.`