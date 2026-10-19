import { z } from "zod";
import { ALLERGEN_IDS, MARKET_IDS, DEFAULT_MARKET } from "./allergens";

export const ConfidenceSchema = z.enum(["low", "medium", "high"]);
export const StatusSchema = z.enum(["detected", "possible", "not_identified", "unknown"]);
export const EvidenceTypeSchema = z.enum([
  "ingredient_label",
  "verified_product_data",
  "user_provided",
  "visual_inference",
  "none",
]);
export const CrossContactSchema = z.enum([
  "unknown",
  "possible",
  "precautionary_statement_present",
]);
export const LabelLegibilitySchema = z.enum(["clear", "partial", "unreadable", "no_label"]);
export const OverallAssessmentSchema = z.enum([
  "allergens_detected",
  "possible_allergens",
  "verification_required",
  "insufficient_information",
]);

const shortText = (max) => z.string().trim().min(1).max(max);
const textList = (maxItems, maxLen = 120) =>
  z.array(z.string().trim().min(1).max(maxLen)).max(maxItems).default([]);

export const AllergenFindingSchema = z.object({
  id: z.enum(ALLERGEN_IDS),
  status: StatusSchema,
  evidenceType: EvidenceTypeSchema,
  reason: shortText(700),
  confidence: ConfidenceSchema.nullish(),
  possibleIngredient: z.string().trim().max(200).nullish(),
  recommendedAction: shortText(500),
});

/**
 * The JSON object we require from the vision model. Values are strictly
 * validated (enums, lengths). Unknown extra keys are dropped, never trusted.
 */
export const ModelOutputSchema = z.object({
  isFood: z.boolean(),
  foodName: shortText(160),
  foodCategory: shortText(120),
  identificationConfidence: ConfidenceSchema,
  isMixedDish: z.boolean().default(false),
  visibleIngredients: textList(40),
  inferredIngredients: textList(40),
  allergens: z.array(AllergenFindingSchema).max(30),
  unknownIngredients: textList(30),
  crossContactRisk: CrossContactSchema.default("unknown"),
  limitations: z.array(z.string().trim().min(1).max(400)).max(6).default([]),

  // Label / packaged-food fields (null or empty when no label is visible)
  labelLegibility: LabelLegibilitySchema.default("no_label"),
  labelText: z.string().trim().max(6000).nullish(),
  productName: z.string().trim().max(160).nullish(),
  brand: z.string().trim().max(120).nullish(),
  declaredAllergens: textList(30, 80),
  precautionaryStatements: textList(10, 300),
  readabilityNotes: z.string().trim().max(500).nullish(),
});

/** Form fields (besides images) accepted by the analyze endpoints. */
export const AnalyzeRequestSchema = z.object({
  market: z.enum(MARKET_IDS).default(DEFAULT_MARKET),
  context: z.string().trim().max(500).optional(),
  userAllergens: z.array(z.enum(ALLERGEN_IDS)).max(ALLERGEN_IDS.length).default([]),
});

export const SAFETY_NOTICE_TEXT =
  "This AI assessment is informational only. A food image cannot confirm all ingredients, hidden allergens, or cross-contact. If you have a food allergy, verify the complete ingredient label and manufacturer information. Do not consume a food if its safety cannot be established for your specific allergy.";
