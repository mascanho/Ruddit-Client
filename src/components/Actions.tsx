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
    <div className="flex items-center gap-1">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 opacity-60 hover:opacity-100 hover:text-green-500"
              onClick={onExportCsv}
            >
              <FileSpreadsheet className="h-3.5 w-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs">
            <p>Export CSV ({filteredAndSortedDataLength} filtered items)</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 opacity-60 hover:opacity-100 hover:text-orange-500"
              onClick={onExportJson}
            >
              <FileJson className="h-3.5 w-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs">
            <p>Export JSON ({filteredAndSortedDataLength} filtered items)</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 opacity-60 hover:opacity-100 hover:text-blue-500"
              onClick={onImport}
            >
              <Upload className="h-3.5 w-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs">
        Import Data
      </TooltipContent>
    </Tooltip>
  </TooltipProvider>

  <ClearTableButton onClearTable={onClearTable} />
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