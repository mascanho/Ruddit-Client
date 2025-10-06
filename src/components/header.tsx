"use client";

import { Search, Bell, Download, FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ReactNode } from "react";

interface HeaderProps {
  children?: ReactNode;
}

export function Header({ children }: HeaderProps) {
  const exportToCSV = () => {
    console.log("[v0] Exporting data to CSV...");
    alert("CSV export functionality - would download mentions.csv");
  };

  const exportToExcel = () => {
    console.log("[v0] Exporting data to Excel...");
    alert("Excel export functionality - would download mentions.xlsx");
  };

  return (
    <header className="border-b border-border bg-card fixed w-full bg-white z-50  ">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-lg">
                  R
                </span>
              </div>
              <h1 className="text-xl font-semibold">Reddit Tracker</h1>
            </div>

            <nav className="hidden md:flex items-center gap-6">
              <a href="#" className="text-sm font-medium text-foreground">
                Overview
              </a>
              <a
                href="#"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Analytics
              </a>
              <a
                href="#"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Reports
              </a>
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative hidden md:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search mentions..."
                className="pl-9 w-64 bg-background"
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={exportToCSV}
              className="gap-2 bg-transparent"
            >
              <Download className="w-4 h-4" />
              <span className="hidden lg:inline">CSV</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={exportToExcel}
              className="gap-2 bg-transparent"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span className="hidden lg:inline">Excel</span>
            </Button>
            {children}
            <Button variant="ghost" size="icon">
              <Bell className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
