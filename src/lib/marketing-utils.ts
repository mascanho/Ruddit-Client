export type IntentLevel = "high" | "medium" | "low";
export type KeywordCategory = "brand" | "competitor" | "general";

const HIGH_INTENT_PATTERNS = [
  /looking for/i,
  /recommend/i,
  // /suggestion/i,
  // /alternative to/i,
  // /vs/i,
  // /comparison/i,
  // /review/i,
  // /best/i,
  // /help with/i,
  // /how to/i,
  // /pricing/i,
  // /cost/i,
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
  const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`\\b${escaped}\\b`, 'i');
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
