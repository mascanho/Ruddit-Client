export type IntentLevel = "high" | "medium" | "low";
export type KeywordCategory = "brand" | "competitor" | "general";

const HIGH_INTENT_PATTERNS = [
  // Explicit buying intent
  /looking for/i,
  /need (a|an|some)?/i,
  /seeking/i,
  /in the market for/i,
  /shortlist/i,

  // Evaluation & comparison
  /recommend/i,
  /suggest/i,
  /alternative(s)? to/i,
  /\bvs\b|\bversus\b/i,
  /comparison/i,
  /review(s)?/i,
  /best/i,
  /top\s?\d+/i,

  // Commercial intent
  /pricing/i,
  /price(s)?/i,
  /cost/i,
  /budget/i,
  /licen[cs]e/i,
  /subscription/i,
  /SaaS/i,

  // Sales process signals
  /demo/i,
  /trial/i,
  /RFP/i,
  /RFQ/i,
  /business case/i,
  /vendor(s)?/i,
  /provider(s)?/i,
];

const MEDIUM_INTENT_PATTERNS = [
  /issues with/i,
  /problem/i,
  /error/i,
  /question/i,
  /anyone used/i,
  /thoughts on/i,
  /experience with/i,
];

export function calculateIntent(text: string): IntentLevel {
  const lowerText = text.toLowerCase();

  if (HIGH_INTENT_PATTERNS.some((pattern) => pattern.test(lowerText))) {
    return "high";
  }

  if (MEDIUM_INTENT_PATTERNS.some((pattern) => pattern.test(lowerText))) {
    return "medium";
  }

  return "low";
}

export function matchesKeyword(text: string, keyword: string): boolean {
  const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(`\\b${escaped}\\b`, "i");
  return regex.test(text);
}

export function categorizePost(
  text: string,
  brandKeywords: string[] = [],
  competitorKeywords: string[] = [],
): KeywordCategory {
  // Check for brand match first
  if (brandKeywords.some((k) => matchesKeyword(text, k))) {
    return "brand";
  }

  // Check for competitor match
  if (competitorKeywords.some((k) => matchesKeyword(text, k))) {
    return "competitor";
  }

  return "general";
}

export function getStatusColor(status?: string) {
  switch (status) {
    case "new":
      return "bg-blue-100 text-blue-800 border-blue-200";
    case "investigating":
      return "bg-yellow-100 text-yellow-800 border-yellow-200";
    case "replied":
      return "bg-green-100 text-green-800 border-green-200";
    case "closed":
      return "bg-gray-100 text-gray-800 border-gray-200";
    case "ignored":
      return "bg-gray-100 text-gray-500 border-gray-200 opacity-60";
    default:
      return "bg-slate-100 text-slate-800 border-slate-200";
  }
}

export function getIntentColor(intent?: string) {
  switch (intent) {
    case "high":
      return "bg-rose-100 text-rose-800 border-rose-200 font-bold";
    case "medium":
      return "bg-orange-100 text-orange-800 border-orange-200";
    case "low":
      return "bg-slate-50 text-slate-500 border-slate-200";
    default:
      return "bg-slate-50 text-slate-500 border-slate-200";
  }
}

export function getSegmentColor(segment?: string) {
  if (!segment || segment === "") {
    return "bg-slate-100 text-slate-600 border-slate-200";
  }

  // Simple hash-based color assignment for different segments
  const colors = [
    "bg-purple-100 text-purple-800 border-purple-200",
    "bg-indigo-100 text-indigo-800 border-indigo-200",
    "bg-cyan-100 text-cyan-800 border-cyan-200",
    "bg-teal-100 text-teal-800 border-teal-200",
    "bg-emerald-100 text-emerald-800 border-emerald-200",
    "bg-lime-100 text-lime-800 border-lime-200",
    "bg-amber-100 text-amber-800 border-amber-200",
    "bg-orange-100 text-orange-800 border-orange-200",
    "bg-red-100 text-red-800 border-red-200",
    "bg-pink-100 text-pink-800 border-pink-200",
  ];

  // Use a simple hash of the segment name to pick a color
  let hash = 0;
  for (let i = 0; i < segment.length; i++) {
    hash = segment.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % colors.length;
  return colors[index];
}
