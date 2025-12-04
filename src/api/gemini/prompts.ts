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
- If substitutions exist, set impact to empty string ""
- If ingredient is NOT essential, set impact to empty string ""
- Only provide impact if the ingredient is ESSENTIAL AND no substitutions are available
- Return ONLY the JSON array, no markdown formatting, no explanations
- Ensure all substitutions are practical and commonly available
- Consider the recipe type and cuisine when suggesting substitutions`;
