/**
 * Actions component for the Reddit Table
 * Contains export, import, and clear table buttons
 */

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { FileSpreadsheet, FileJson, Upload, Trash2 } from "lucide-react";

interface ActionsProps {
  filteredAndSortedDataLength: number;
  onExportCsv: () => void;
  onExportJson: () => void;
  onImport: () => void;
  onClearTable: () => void;
}

export function Actions({
  filteredAndSortedDataLength,
  onExportCsv,
  onExportJson,
  onImport,
  onClearTable,
}: ActionsProps) {
  return (
    <div className="flex items-center gap-1.5 p-1 bg-muted/30 rounded-lg border border-border/40 ml-auto">
      <div className="flex items-center gap-0.5 px-1 border-r border-border/40 mr-1">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground/60 hover:text-green-500 hover:bg-green-500/10 transition-all active:scale-90"
                onClick={onExportCsv}
              >
                <FileSpreadsheet className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-[10px] font-bold uppercase tracking-wider bg-background/95 backdrop-blur-md">
              <p>Export CSV ({filteredAndSortedDataLength} items)</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground/60 hover:text-orange-500 hover:bg-orange-500/10 transition-all active:scale-90"
                onClick={onExportJson}
              >
                <FileJson className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-[10px] font-bold uppercase tracking-wider bg-background/95 backdrop-blur-md">
              <p>Export JSON ({filteredAndSortedDataLength} items)</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      <div className="flex items-center gap-1">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground/60 hover:text-blue-500 hover:bg-blue-500/10 transition-all active:scale-90"
                onClick={onImport}
              >
                <Upload className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-[10px] font-bold uppercase tracking-wider bg-background/95 backdrop-blur-md">
              Import Workspace
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <ClearTableButton onClearTable={onClearTable} />
      </div>
    </div>
  );
}

interface ClearTableButtonProps {
  onClearTable: () => void;
}

export function ClearTableButton({ onClearTable }: ClearTableButtonProps) {
  return (
    <Button
      variant="destructive"
      size="sm"
      className="h-7 text-[10px] font-bold uppercase tracking-wider"
      onClick={onClearTable}
    >
      <Trash2 className="h-3 w-3 mr-1.5" />
      Clear Table
    </Button>
  );
}