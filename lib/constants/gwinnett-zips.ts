/** Gwinnett County pilot ZIP allowlist (PDF Appendix A). */
export const GWINNETT_ZIP_CODES = [
  "30043",
  "30044",
  "30045",
  "30046",
  "30096",
  "30097",
  "30071",
  "30092",
  "30039",
  "30024",
  "30518",
] as const;

export type GwinnettZipCode = (typeof GWINNETT_ZIP_CODES)[number];
