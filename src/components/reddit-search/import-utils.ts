import { open } from "@tauri-apps/plugin-dialog";
import { readTextFile } from "@tauri-apps/plugin-fs";
import { toast } from "sonner";
import type { SearchResult } from "./types";

export async function importData(
    onImport: (data: SearchResult[]) => void
): Promise<void> {
    try {
        const selected = await open({
            multiple: false,
            filters: [
                {
                    name: "Data Files",
                    extensions: ["json", "csv"],
                },
            ],
        });

        if (!selected) return;

        const filePath = Array.isArray(selected) ? selected[0] : selected;
        if (!filePath) return;

        const content = await readTextFile(filePath);

        if (filePath.endsWith(".json")) {
            await importJSON(content, onImport);
        } else if (filePath.endsWith(".csv")) {
            await importCSV(content, onImport);
        } else {
            toast.error("Unsupported file extension");
        }
    } catch (err) {
        console.error("Import error", err);
        toast.error("Failed to process file");
    }
}

async function importJSON(
    content: string,
    onImport: (data: SearchResult[]) => void
): Promise<void> {
    try {
        const parsed = JSON.parse(content);
        console.log("Parsed JSON:", parsed);

        if (Array.isArray(parsed)) {
            if (parsed.length === 0) {
                toast.warning("JSON file is empty");
                return;
            }
            onImport(parsed);
            toast.success(`Imported ${parsed.length} items from JSON`);
        } else {
            toast.error("Invalid JSON structure. Expected an array.");
        }
    } catch (err) {
        console.error("JSON parse error:", err);
        toast.error("Failed to parse JSON file");
    }
}


async function importCSV(
    content: string,
    onImport: (data: SearchResult[]) => void
): Promise<void> {
    const lines = content.split(/\r\n|\n/).filter((l) => l.trim());
    if (lines.length < 2) {
        toast.error("CSV file appears empty or missing headers");
        return;
    }

    // Parse headers - remove quotes if present
    const headerLine = lines[0];
    const headers = parseCSVLine(headerLine).map(h => h.trim().replace(/^"|"$/g, ''));

    console.log("CSV Headers:", headers);

    const newItems: SearchResult[] = [];

    for (let i = 1; i < lines.length; i++) {
        const currentLine = lines[i];
        if (!currentLine.trim()) continue;

        const values = parseCSVLine(currentLine);

        if (values.length !== headers.length) {
            console.warn(`Row ${i} has ${values.length} values but expected ${headers.length}`);
            continue;
        }

        const rowData: any = {};
        headers.forEach((header, idx) => {
            const key = header.trim();
            let val = values[idx].trim().replace(/^"|"$/g, ''); // Remove surrounding quotes

            if (
                key === "score" ||
                key === "num_comments" ||
                key === "timestamp" ||
                key === "relevance_score"
            ) {
                rowData[key] = Number(val) || 0;
            } else if (key === "is_self") {
                rowData[key] = val === "true";
            } else {
                rowData[key] = val;
            }
        });

        // Ensure required fields exist
        if (!rowData.id) {
            rowData.id = Math.random().toString(36).substr(2, 9);
        }
        if (!rowData.sort_type) {
            rowData.sort_type = "hot";
        }
        if (!rowData.snippet) {
            rowData.snippet = rowData.selftext ? rowData.selftext.slice(0, 200) : "";
        }
        if (!rowData.relevance_score) {
            rowData.relevance_score = 0;
        }

        newItems.push(rowData as SearchResult);
    }

    console.log("Parsed items:", newItems);

    if (newItems.length > 0) {
        onImport(newItems);
        toast.success(`Imported ${newItems.length} items from CSV`);
    } else {
        toast.error("Failed to parse rows from CSV");
    }
}

// Helper function to parse a CSV line respecting quotes
function parseCSVLine(line: string): string[] {
    const values: string[] = [];
    let inQuote = false;
    let currentVal = "";

    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
            if (inQuote && line[i + 1] === '"') {
                currentVal += '"';
                i++; // Skip the escaped quote
            } else {
                inQuote = !inQuote;
            }
        } else if (char === "," && !inQuote) {
            values.push(currentVal);
            currentVal = "";
        } else {
            currentVal += char;
        }
    }
    values.push(currentVal);

    return values;
}
