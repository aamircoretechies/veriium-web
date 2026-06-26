import { z } from "zod";

import { jsonError, jsonOk } from "@/lib/api/response";
import { searchMechanics } from "@/lib/mechanics/search";
import {
  mechanicSearchQuerySchema,
  parseMechanicSearchQuery,
} from "@/types/api/mechanic-search";

export async function GET(request: Request) {
  const parsed = mechanicSearchQuerySchema.safeParse(
    parseMechanicSearchQuery(new URL(request.url).searchParams),
  );

  if (!parsed.success) {
    return jsonError(
      400,
      "validation_error",
      z.prettifyError(parsed.error),
    );
  }

  const result = await searchMechanics(parsed.data);
  return jsonOk(result);
}
