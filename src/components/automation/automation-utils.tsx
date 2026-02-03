import React from "react";

// Custom-styled native HTML components
export interface CustomButtonProps {
    onClick?: React.MouseEventHandler<HTMLButtonElement>;
    children: React.ReactNode;
    className?: string;
    disabled?: boolean;
    title?: string;
}

export const CustomButton = ({
    onClick,
    children,
    className = "",
    disabled = false,
    title = "",
}: CustomButtonProps) => (
    <button
        onClick={onClick}
        disabled={disabled}
        title={title}
        className={`inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 ${className}`}
    >
        {children}
    </button>
);

export interface KeywordBadgeProps {
    children: React.ReactNode;
    className?: string;
    onClick?: (keyword: string) => void;
    keyword?: string;
}

export const KeywordBadge = ({
    children,
    className = "",
    onClick,
    keyword,
}: KeywordBadgeProps) => (
    <span
        onClick={() => onClick && keyword && onClick(keyword)}
        className={`inline-block text-[10px] py-0.5 px-1.5 rounded-full font-medium whitespace-nowrap ${className} ${onClick ? "cursor-pointer" : ""}`}
    >
        {children}
    </span>
);

export type KeywordCategory = {
    keywords: string[];
    className: string;
};

export const HighlightedText = ({
    text,
    categories,
}: {
    text: string;
    categories: KeywordCategory[];
}) => {
    if (!text) return null;

    const allKeywords = categories
        .flatMap((c) => c.keywords)
        .filter((kw) => kw && kw.trim() !== "")
        // Sort by length (longer phrases first) to avoid partial matches
        .sort((a, b) => b.length - a.length);

    if (allKeywords.length === 0) return <>{text}</>;

    const keywordStyleMap = new Map<string, string>();
    categories.forEach((category) => {
        (category.keywords || []).forEach((kw) => {
            if (kw && kw.trim() !== "") {
                keywordStyleMap.set(kw.toLowerCase(), category.className);
            }
        });
    });

    // Create regex that matches whole phrases, sorted by length to prioritize longer matches
    const escapeRegexString = (str: string) => {
        return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    };
    const escapedKeywords = allKeywords.map((kw) => escapeRegexString(kw));
    const regex = new RegExp(`(${escapedKeywords.join("|")})`, "gi");

    let highlightedText = text;
    const matches = [];
    let match;

    // Find all matches with their positions
    while ((match = regex.exec(text)) !== null) {
        matches.push({
            keyword: match[0].toLowerCase(),
            start: match.index,
            end: match.index + match[0].length,
        });
        regex.lastIndex = match.index + 1; // Prevent infinite loops with overlapping matches
    }

    // Sort matches by start position and then by length (longer first)
    matches.sort((a, b) => {
        if (a.start !== b.start) return a.start - b.start;
        return (b.end - b.start) - (a.end - a.start); // Fixed: Longer matches first
    });

    // Build highlighted text
    const parts = [];
    let lastIndex = 0;

    for (const match of matches) {
        // Skip overlapping matches
        if (match.start < lastIndex) continue;

        // Add text before match
        if (match.start > lastIndex) {
            parts.push(String(text.slice(lastIndex, match.start)));
        }

        // Add highlighted match
        const matchedText = String(text.slice(match.start, match.end));
        const className = keywordStyleMap.get(match.keyword);
        if (className) {
            parts.push(
                <mark
                    key={`${match.start}-${match.end}`}
                    className={`${className} text-current px-0.5 rounded-sm`}
                >
                    {matchedText}
                </mark>,
            );
        } else {
            parts.push(matchedText);
        }

        lastIndex = match.end;
    }

    // Add remaining text
    if (lastIndex < text.length) {
        parts.push(String(text.slice(lastIndex)));
    }

    return <>{parts}</>;
};

export const formatElapsedTime = (timestamp: number | undefined): string => {
    if (timestamp === undefined || timestamp === null) return "N/A";

    const timeInMilliseconds =
        timestamp < 4_100_000_000 ? timestamp * 1000 : timestamp;

    const postDate = new Date(timeInMilliseconds);
    const now = new Date();
    const diffSeconds = Math.floor((now.getTime() - postDate.getTime()) / 1000);

    if (diffSeconds < 60)
        return `${diffSeconds} second${diffSeconds === 1 ? "" : "s"} ago`;

    const diffMinutes = Math.floor(diffSeconds / 60);
    if (diffMinutes < 60)
        return `${diffMinutes} minute${diffMinutes === 1 ? "" : "s"} ago`;

    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24)
        return `${diffHours} hour${diffHours === 1 ? "" : "s"} ago`;

    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 30) return `${diffDays} day${diffDays === 1 ? "" : "s"} ago`;

    const diffMonths = Math.floor(diffDays / 30);
    if (diffMonths < 12)
        return `${diffMonths} month${diffMonths === 1 ? "" : "s"} ago`;

    const diffYears = Math.floor(diffMonths / 12);
    return `${diffYears} year${diffYears === 1 ? "" : "s"} ago`;
};
