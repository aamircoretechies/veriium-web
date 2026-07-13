/** Parse Mechanics.service_zip_codes multiline text to a deduped ZIP list. */
export function parseMechanicZipCodes(raw: string | undefined): string[] {
  if (!raw?.trim()) return [];
  return [
    ...new Set(
      raw
        .split(/[\n,\s]+/)
        .map((zip) => zip.trim())
        .filter(Boolean),
    ),
  ];
}
