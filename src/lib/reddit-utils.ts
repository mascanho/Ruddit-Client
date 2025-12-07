
/**
 * Parses a Reddit ID string (base36) into a number (base10).
 * Handles cases where the ID might initially appear numeric but contains hidden alphanumeric chars later.
 * @param id The Reddit ID string (e.g. "15bf", "t3_15bf")
 * @returns The numeric representation
 */
export function parseRedditId(id: string): number {
    // Remove t3_ or t1_ prefixes if present
    const cleanId = id.replace(/^t[0-9]_/, "");
    return parseInt(cleanId, 36);
}
