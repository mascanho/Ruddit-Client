"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface KeywordHighlighterProps {
    text: string;
    brandKeywords?: string[];
    competitorKeywords?: string[];
    generalKeywords?: string[];
    searchQuery?: string;
    className?: string;
}

const escapeRegExp = (string: string) => {
    return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};

export function KeywordHighlighter({
    text,
    brandKeywords = [],
    competitorKeywords = [],
    generalKeywords = [],
    searchQuery = "",
    className,
}: KeywordHighlighterProps) {
    if (!text) return null;

    // Combine and deduplicate general keywords and search query
    const searchTerms = searchQuery
        .split(/\s+/)
        .filter((k) => k.length > 0)
        .map((k) => k.toLowerCase());

    const allGeneral = Array.from(new Set([
        ...generalKeywords.map(k => k.toLowerCase()),
        ...searchTerms
    ]));

    const brand = brandKeywords.map(k => k.toLowerCase());
    const competitor = competitorKeywords.map(k => k.toLowerCase());

    // Create a combined list of all keywords for the regex
    const allKeywords = [
        ...brand,
        ...competitor,
        ...allGeneral
    ].filter(Boolean);

    if (allKeywords.length === 0) return <span className={className}>{text}</span>;

    // Create a regex with all keywords, sorting by length descending to match longest first
    const sortedKeywords = allKeywords
        .sort((a, b) => b.length - a.length)
        .map(escapeRegExp);

    const regex = new RegExp(`(${sortedKeywords.join("|")})`, "gi");
    const parts = text.split(regex);

    return (
        <span className={className}>
            {parts.map((part, i) => {
                const lowerPart = part.toLowerCase();

                let highlightClass = "";

                if (brand.includes(lowerPart)) {
                    highlightClass = "bg-violet-100 text-violet-900 dark:bg-violet-900/50 dark:text-violet-200 px-0.5 rounded font-bold";
                } else if (competitor.includes(lowerPart)) {
                    highlightClass = "bg-rose-100 text-rose-900 dark:bg-rose-900/50 dark:text-rose-200 px-0.5 rounded font-bold";
                } else if (allGeneral.some(k => k === lowerPart)) {
                    highlightClass = "bg-amber-100 text-amber-900 dark:bg-amber-700/50 dark:text-amber-100 px-0.5 rounded";
                }

                if (highlightClass) {
                    return (
                        <span key={i} className={highlightClass}>
                            {part}
                        </span>
                    );
                }

                return <React.Fragment key={i}>{part}</React.Fragment>;
            })}
        </span>
    );
}
