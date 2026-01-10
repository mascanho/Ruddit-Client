import React from "react";
import { Bot, Play, StopCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import moment from "moment";

interface AutomationControlPanelProps {
    isRunning: boolean;
    setIsRunning: (isRunning: boolean) => void;
    intervalMinutes: number;
    setIntervalMinutes: (minutes: number) => void;
    lastRun: number | null;
}

export function AutomationControlPanel({
    isRunning,
    setIsRunning,
    intervalMinutes,
    setIntervalMinutes,
    lastRun,
}: AutomationControlPanelProps) {
    return (
        <div className="px-3 py-2 border-b border-border flex items-center justify-between bg-muted/20">
            <div className="flex items-center gap-3">
                <div className="p-1 rounded-md bg-primary/10">
                    <Bot className="h-4 w-4 text-primary" />
                </div>
                <h2 className="text-xs font-black uppercase tracking-widest text-foreground/80">
                    Digital Agent
                </h2>
                <Badge
                    variant="outline"
                    className={`flex items-center gap-1.5 text-[9px] font-black py-0 px-2 rounded-full border-none ${isRunning ? "bg-green-500/10 text-green-500" : "bg-gray-500/10 text-muted-foreground"}`}
                >
                    <div
                        className={`h-1.5 w-1.5 rounded-full ${isRunning ? "bg-green-500 animate-pulse" : "bg-gray-500"}`}
                    ></div>
                    {isRunning ? "ACTIVE" : "STANDBY"}
                </Badge>
            </div>
            <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground/60 tracking-wider">
                        Interval:
                    </span>
                    <select
                        value={intervalMinutes.toString()}
                        onChange={(e) => setIntervalMinutes(parseInt(e.target.value))}
                        disabled={isRunning}
                        className="bg-transparent border-none text-[10px] font-bold text-primary focus:ring-0 cursor-pointer p-0 h-auto"
                    >
                        <option value="5">5m</option>
                        <option value="15">15m</option>
                        <option value="30">30m</option>
                        <option value="60">1h</option>
                    </select>
                </div>
                <div className="flex items-center gap-2 border-l border-border/50 pl-4">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground/60 tracking-wider">
                        Last Run:
                    </span>
                    <span className="text-[10px] font-bold font-mono text-foreground/80">
                        {lastRun ? moment(lastRun).format("HH:mm:ss") : "--:--:--"}
                    </span>
                </div>
                <button
                    onClick={() => setIsRunning(!isRunning)}
                    className={`flex items-center gap-2 px-4 h-7 text-[10px] font-black uppercase tracking-widest rounded-md transition-all ${isRunning ? "bg-destructive/10 text-destructive border border-destructive/20 hover:bg-destructive hover:text-white" : "bg-primary text-white hover:bg-primary/90 shadow-sm"}`}
                >
                    {isRunning ? (
                        <>
                            <StopCircle className="h-3.5 w-3.5" /> STop Agent
                        </>
                    ) : (
                        <>
                            <Play className="h-3.5 w-3.5" /> Initialize
                        </>
                    )}
                </button>
            </div>
        </div>
    );
}
