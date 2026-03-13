import { z } from "zod";
import type { PaginationResult } from "@/lib/api/types";

export const PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const;

export const paginationSearchSchema = z.object({
  page: z.number().int().min(1).catch(1),
  limit: z
    .union([z.literal(10), z.literal(25), z.literal(50), z.literal(100)])
    .catch(10),
});

export type PaginationSearch = z.infer<typeof paginationSearchSchema>;

export function getPageCount(pagination: PaginationResult | undefined): number {
  if (!pagination) return 0;
  return Math.ceil(pagination.total / pagination.limit);
}
