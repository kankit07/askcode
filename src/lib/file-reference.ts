import { z } from "zod";

export const fileReferenceSchema = z.object({
  fileName: z.string(),
  sourceCode: z.string(),
  summary: z.string(),
  similarity: z.number().optional(),
});

export type FileReference = z.infer<typeof fileReferenceSchema>;

/** Parses the `Question.fileReferences` JSON column, dropping bad entries. */
export function parseFileReferences(value: unknown): FileReference[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    const parsed = fileReferenceSchema.safeParse(item);
    return parsed.success ? [parsed.data] : [];
  });
}
