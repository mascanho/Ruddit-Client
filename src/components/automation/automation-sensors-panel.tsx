import React from "react";
import { useState, useEffect } from "react";
import { Radar } from "lucide-react";
import { KeywordBadge } from "./automation-utils";

export interface SensorCategory {
    title: string;
    keywords: string[];
    className: string;
}

interface AutomationSensorsPanelProps {
    noKeywords: boolean;
    keywordCategories: SensorCategory[];
    visibleKeywords: number;
    keywordsExpanded: boolean;
    setKeywordsExpanded: (expanded: boolean) => void;
    handleKeywordClick: (keyword: string) => void;
}

export function AutomationSensorsPanel({
    noKeywords,
    keywordCategories,
    visibleKeywords,
    keywordsExpanded,
    setKeywordsExpanded,
    handleKeywordClick,
}: AutomationSensorsPanelProps) {
    const [isHydrated, setIsHydrated] = useState(false);

    useEffect(() => {
        setIsHydrated(true);
    }, []);
    return (
        <div className="lg:col-span-1 rounded-lg border border-border/40 bg-background/30 flex flex-col h-[180px]">
            <div className="flex justify-between items-center px-2 py-1.5 border-b border-border/40 bg-muted/10">
                <h3 className="text-[10px] font-black uppercase tracking-widest opacity-60 flex items-center gap-1.5">
                    <Radar className="h-3 w-3" />
                    Sensors
                </h3>
                {!noKeywords && (
                    <button
                        onClick={() => setKeywordsExpanded(!keywordsExpanded)}
                        className="text-[9px] font-black uppercase tracking-tighter opacity-40 hover:opacity-100 transition-opacity"
                    >
                        {keywordsExpanded ? "COMPRESS" : "EXPAND"}
                    </button>
                )}
            </div>
            <div className="p-2 flex-1 overflow-y-auto custom-scroll">
                {noKeywords ? (
                    <span className="text-[10px] text-muted-foreground italic opacity-50">
                        No active sensor patterns.
                    </span>
                ) : (
                    <div className="space-y-3">
                        {isHydrated && keywordCategories.map(
                            (category) =>
                                category.keywords.length > 0 && (
                                    <div key={category.title}>
                                        <h4 className="text-[9px] font-black uppercase tracking-tighter text-muted-foreground/40 mb-1 flex items-center gap-1">
                                            <span className="w-1 h-1 rounded-full bg-current opacity-30"></span>
                                            {category.title}
                                        </h4>
                                        <div className="flex flex-wrap gap-1">
                                            {category.keywords
                                                .slice(0, visibleKeywords)
                                                .map((k) => (
                                                    <KeywordBadge
                                                        key={String(k)}
                                                        className={`${category.className} text-[9px] font-bold px-1.5 py-0 rounded transition-all hover:scale-105`}
                                                        onClick={handleKeywordClick}
                                                        keyword={String(k)}
                                                    >
                                                        {String(k)}
                                                    </KeywordBadge>
                                                ))}
                                            {category.keywords.length > visibleKeywords && (
                                                <span className="text-[9px] font-bold text-muted-foreground/40 p-0.5">
                                                    +{category.keywords.length - visibleKeywords}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                )
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
