// @ts-nocheck
import React from "react";
import { Activity } from "lucide-react";
import moment from "moment";

export interface LogEntry {
  id: string;
  timestamp: number;
  type: "info" | "success" | "warning" | "error";
  message: string;
}

interface AutomationLogsPanelProps {
  logs: LogEntry[];
  clearLogs: () => void;
  scrollRef: React.RefObject<HTMLDivElement | null>;
}

export function AutomationLogsPanel({
  logs,
  clearLogs,
  scrollRef,
}: AutomationLogsPanelProps) {
  return (
    <div className="lg:col-span-2 rounded-lg border border-border/40 bg-background/30 flex flex-col h-[180px]">
      <div className="px-2 py-1.5 border-b border-border/40 bg-muted/10 flex justify-between items-center">
        <h3 className="text-[10px] font-black uppercase tracking-widest opacity-60 flex items-center gap-1.5">
          <Activity className="h-3 w-3" />
          Data Feed
        </h3>
        <button
          onClick={clearLogs}
          disabled={logs.length === 0}
          className="text-[9px] font-black uppercase tracking-tighter opacity-40 hover:opacity-100 disabled:opacity-10"
        >
          FLUSH
        </button>
      </div>
      <div
        ref={scrollRef}
        className="p-2 flex-1 overflow-y-auto custom-scroll text-[10px] font-mono space-y-1 bg-black/5"
      >
        {logs.length === 0 ? (
          <div className="text-center text-[10px] font-black uppercase tracking-[0.2em] opacity-10 pt-16">
            AWAITING TELEMETRY
          </div>
        ) : (
          [...logs].reverse().map((log) => (
            <div
              key={log.id}
              className="flex gap-2 items-start opacity-80 hover:opacity-100 transition-opacity"
            >
              <span className="text-muted-foreground/40 shrink-0">
                [{moment(log.timestamp).format("HH:mm:ss")}]
              </span>
              <span
                className={`flex-1 leading-relaxed ${log.type === "error" ? "text-red-500 font-bold" : log.type === "success" ? "text-green-500" : log.type === "warning" ? "text-yellow-500" : "text-foreground/70"}`}
              >
                <span className="opacity-40 mr-1">{">"}</span>
                {log.message}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
