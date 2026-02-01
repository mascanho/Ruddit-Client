export type IntentLevel = "high" | "medium" | "low";
export type KeywordCategory = "brand" | "competitor" | "general";

export function calculateIntent(
  text: string,
  highIntentKeywords: string[],
  mediumIntentKeywords: string[]
): IntentLevel {
  const lowerText = text.toLowerCase();

  // Helper to check against keywords with word boundaries
  const matchesAny = (keywords: string[]) => {
    return keywords.some((keyword) => {
      try {
        const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        // Use word boundaries for cleaner matching
        const regex = new RegExp(`\\b${escaped}\\b`, "i");
        return regex.test(lowerText);
      } catch (e) {
        // Fallback to simple include if regex fails (shouldn't happen with escape)
        return lowerText.includes(keyword.toLowerCase());
      }
    });
  };

  if (matchesAny(highIntentKeywords)) {
    return "high";
  }

  if (matchesAny(mediumIntentKeywords)) {
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
      return "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20";
    case "investigating":
      return "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20";
    case "replied":
      return "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20";
    case "closed":
      return "bg-slate-500/10 text-slate-700 dark:text-slate-400 border-slate-500/20";
    case "ignored":
      return "bg-slate-500/5 text-slate-400 dark:text-slate-500 border-slate-500/10 opacity-60";
    default:
      return "bg-slate-500/10 text-slate-600 border-slate-500/20";
  }
}

export function getIntentColor(intent?: string) {
  switch (intent) {
    case "high":
      return "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20 font-bold shadow-[0_0_10px_rgba(244,63,94,0.1)]";
    case "medium":
      return "bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/20";
    case "low":
      return "bg-slate-500/5 text-slate-500 dark:text-slate-400 border-slate-500/10";
    default:
      return "bg-slate-500/5 text-slate-500 dark:text-slate-400 border-slate-500/10";
  }
}

export function getSegmentColor(segment?: string) {
  if (!segment || segment === "") {
    return "bg-slate-500/5 text-slate-500 dark:text-slate-400 border-slate-500/10";
  }

  const colors = [
    "bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20",
    "bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border-indigo-500/20",
    "bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 border-cyan-500/20",
    "bg-teal-500/10 text-teal-700 dark:text-teal-400 border-teal-500/20",
    "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20",
    "bg-lime-500/10 text-lime-700 dark:text-lime-400 border-lime-500/20",
    "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20",
    "bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/20",
    "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20",
    "bg-pink-500/10 text-pink-700 dark:text-pink-400 border-pink-500/20",
  ];

  let hash = 0;
  for (let i = 0; i < segment.length; i++) {
    hash = segment.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % colors.length;
  return colors[index];
}

export function getToneColor(tone?: string) {
  switch (tone) {
    case "positive":
      return "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20";
    case "neutral":
      return "bg-slate-500/10 text-slate-700 dark:text-slate-400 border-slate-500/20";
    case "negative":
      return "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20";
    default:
      return "bg-slate-500/5 text-slate-500 dark:text-slate-400 border-slate-500/10";
  }
}
