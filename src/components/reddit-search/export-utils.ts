import { save } from "@tauri-apps/plugin-dialog";
import { writeTextFile } from "@tauri-apps/plugin-fs";
import { toast } from "sonner";
import moment from "moment";
import type { SearchResult } from "./types";

export async function exportToCSV(data: SearchResult[]): Promise<void> {
    if (data.length === 0) {
        toast.error("No data to export");
        return;
    }

    const headers = [
        "id",
        "title",
        "subreddit",
        "url",
        "score",
        "num_comments",
        "formatted_date",
        "intent",
        "author",
        "selftext",
    ];

    const csvContent = [
        headers.join(","),
        ...data.map((row) => {
            return headers
                .map((header) => {
                    let val = row[header as keyof SearchResult] || "";
                    if (typeof val === "number") val = val.toString();
                    if (typeof val === "boolean") val = val ? "true" : "false";
                    const escaped = String(val).replace(/"/g, '""');
                    return `"${escaped}"`;
                })
                .join(",");
        }),
    ].join("\n");

    try {
        const filePath = await save({
            filters: [
                {
                    name: "CSV File",
                    extensions: ["csv"],
                },
            ],
            defaultPath: `ruddit_export_${moment().format("YYYY-MM-DD_HHmm")}.csv`,
        });

        if (filePath) {
            await writeTextFile(filePath, csvContent);
            toast.success(`Exported ${data.length} items to CSV successfully`);
        }
    } catch (err) {
        console.error("Export error:", err);
        toast.error("Failed to export CSV");
    }
}

export async function exportToJSON(data: SearchResult[]): Promise<void> {
    if (data.length === 0) {
        toast.error("No data to export");
        return;
    }

    const dataStr = JSON.stringify(data, null, 2);

    try {
        const filePath = await save({
            filters: [
                {
                    name: "JSON File",
                    extensions: ["json"],
                },
            ],
            defaultPath: `ruddit_export_${moment().format("YYYY-MM-DD_HHmm")}.json`,
        });

        if (filePath) {
            await writeTextFile(filePath, dataStr);
            toast.success(`Exported ${data.length} items to JSON successfully`);
        }
    } catch (err) {
        console.error("Export error:", err);
        toast.error("Failed to export JSON");
    }
}
