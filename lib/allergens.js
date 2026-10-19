// Allergen catalogue and per-market configuration.
//
// IMPORTANT: Official allergen lists differ between countries and change over
// time. The market lists below are a convenience for prioritising what the AI
// looks for. They are NOT legal guidance. Always verify against the national
// food authority and the product's own label.

export const ALLERGENS = {
  milk: {
    name: "Milk and dairy",
    short: "Milk",
    examples: "cheese, butter, cream, yogurt, whey, casein, lactose",
  },
  eggs: {
    name: "Eggs",
    short: "Eggs",
    examples: "egg white, yolk, mayonnaise, albumin, lysozyme",
  },
  peanuts: {
    name: "Peanuts",
    short: "Peanuts",
    examples: "peanut butter, groundnut, peanut oil (unrefined)",
  },
  tree_nuts: {
    name: "Tree nuts",
    short: "Tree nuts",
    examples: "almonds, cashews, walnuts, pistachios, hazelnuts, pecans, macadamia",
  },
  wheat: {
    name: "Wheat",
    short: "Wheat",
    examples: "flour, semolina, durum, breadcrumbs, noodles, couscous",
  },
  gluten_cereals: {
    name: "Other gluten-containing cereals",
    short: "Gluten cereals",
    examples: "barley, rye, oats (cross-contact), spelt, kamut, malt",
  },
  soy: {
    name: "Soy",
    short: "Soy",
    examples: "soy sauce, tofu, miso, tempeh, soy lecithin, edamame",
  },
  fish: {
    name: "Fish",
    short: "Fish",
    examples: "fish fillets, anchovy, fish sauce, Worcestershire sauce, fish gelatin",
  },
  crustaceans: {
    name: "Crustaceans (shellfish)",
    short: "Crustaceans",
    examples: "shrimp, prawn, crab, lobster, crayfish, shrimp paste",
  },
  mollusks: {
    name: "Mollusks",
    short: "Mollusks",
    examples: "squid, clams, mussels, oysters, scallops, snails, oyster sauce",
  },
  sesame: {
    name: "Sesame",
    short: "Sesame",
    examples: "sesame seeds, tahini, sesame oil, hummus",
  },
  mustard: {
    name: "Mustard",
    short: "Mustard",
    examples: "mustard seeds, prepared mustard, some dressings and marinades",
  },
  celery: {
    name: "Celery",
    short: "Celery",
    examples: "celery stalks, celeriac, celery salt, some stock and spice mixes",
  },
  lupin: {
    name: "Lupin",
    short: "Lupin",
    examples: "lupin flour, lupin seeds, some gluten-free or European baked goods",
  },
  sulphites: {
    name: "Sulphites and sulphur dioxide",
    short: "Sulphites",
    examples: "dried fruit, wine, vinegar, some processed potatoes, E220-E228",
  },
};

export const ALLERGEN_IDS = Object.keys(ALLERGENS);

export const MARKETS = {
  global: {
    name: "General (all 15 categories)",
    allergens: ALLERGEN_IDS,
    note: "Checks every category in the catalogue. Use this if your market is not listed.",
  },
  us: {
    name: "United States",
    allergens: [
      "milk", "eggs", "fish", "crustaceans", "tree_nuts", "peanuts",
      "wheat", "soy", "sesame", "sulphites",
    ],
    note: "Based on the US major food allergens list (including sesame) plus sulphites, which have their own labeling threshold. Rules can change.",
  },
  eu: {
    name: "European Union / United Kingdom",
    allergens: ALLERGEN_IDS,
    note: "The EU and UK regulate 14 allergen groups, including celery, mustard, lupin, mollusks and sulphites. Rules can change.",
  },
  ph: {
    name: "Philippines",
    allergens: [
      "milk", "eggs", "peanuts", "tree_nuts", "wheat", "gluten_cereals",
      "soy", "fish", "crustaceans", "sulphites",
    ],
    note: "Based on DOH Administrative Order 2014-0030 (cereals containing gluten, crustaceans, eggs, fish, peanuts, soybeans, milk, tree nuts, and sulphite at 10 mg/kg or more). The list is a minimum, so other allergens such as sesame and mollusks are also checked if you add them to your profile. Rules can change; confirm with the Philippine FDA.",
  },
  ca: {
    name: "Canada",
    allergens: [
      "milk", "eggs", "peanuts", "tree_nuts", "wheat", "gluten_cereals",
      "soy", "fish", "crustaceans", "mollusks", "sesame", "mustard", "sulphites",
    ],
    note: "Based on Canada's priority allergen and gluten source lists. Rules can change.",
  },
  au: {
    name: "Australia / New Zealand",
    allergens: [
      "milk", "eggs", "peanuts", "tree_nuts", "wheat", "gluten_cereals",
      "soy", "fish", "crustaceans", "mollusks", "sesame", "lupin", "sulphites",
    ],
    note: "Based on the Food Standards Australia New Zealand declaration list. Rules can change.",
  },
};

export const MARKET_IDS = Object.keys(MARKETS);
export const DEFAULT_MARKET = "ph";

/**
 * Allergen ids the AI must assess: the market list plus any extra ids the
 * person has added to their personal profile.
 */
export function allergensToAssess(marketId, userAllergens = []) {
  const market = MARKETS[marketId] || MARKETS[DEFAULT_MARKET];
  const set = new Set([...market.allergens, ...userAllergens]);
  return ALLERGEN_IDS.filter((id) => set.has(id));
}

export const STATUS_META = {
  detected: {
    label: "Detected / declared",
    short: "Detected",
    rank: 3,
  },
  possible: {
    label: "May be present",
    short: "Possible",
    rank: 2,
  },
  unknown: {
    label: "Unknown",
    short: "Unknown",
    rank: 1,
  },
  not_identified: {
    label: "Not identified",
    short: "Not identified",
    rank: 0,
  },
};

export const EVIDENCE_LABELS = {
  ingredient_label: "Ingredient label",
  verified_product_data: "Verified product data",
  user_provided: "Information you provided",
  visual_inference: "Visual inference (AI guess)",
  none: "No evidence available",
};

export const ASSESSMENT_META = {
  allergens_detected: {
    label: "Allergens detected",
    tone: "red",
  },
  possible_allergens: {
    label: "Possible allergens",
    tone: "orange",
  },
  verification_required: {
    label: "Verification required",
    tone: "orange",
  },
  insufficient_information: {
    label: "Insufficient information",
    tone: "slate",
  },
};
