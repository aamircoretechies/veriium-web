import { z } from "zod";

export const sendDriverCodeSchema = z.object({
  phone: z.string().min(1),
});

export const verifyDriverCodeSchema = z.object({
  phone: z.string().min(1),
  code: z.string().regex(/^\d{6}$/, "Code must be exactly 6 digits."),
});

export type SendDriverCodeRequest = z.infer<typeof sendDriverCodeSchema>;
export type VerifyDriverCodeRequest = z.infer<typeof verifyDriverCodeSchema>;
