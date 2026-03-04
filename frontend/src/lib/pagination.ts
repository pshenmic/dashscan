import { z } from "zod";
import type { PaginationResult } from "@/lib/api/types";

export const paginationSearchSchema = z.object({
  page: z.number().int().min(1).catch(1),
});

export type PaginationSearch = z.infer<typeof paginationSearchSchema>;

export function getPageCount(pagination: PaginationResult | undefined): number {
  if (!pagination) return 0;
  return Math.ceil(pagination.total / pagination.limit);
}
