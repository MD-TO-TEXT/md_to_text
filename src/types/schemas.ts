import { z } from "zod";

// Convert options schema
export const ConvertOptionsSchema = z.object({
  preserveLinks: z.boolean().optional(),
  listStyle: z.enum(['bullets', 'numbers', 'none']).optional(),
  codeHandling: z.enum(['preserve', 'remove', 'inline']).optional(),
  tableFormat: z.enum(['simple', 'grid', 'none']).optional(),
  headingStyle: z.enum(['hash', 'underline', 'none']).optional(),
}).optional();

// Tool parameter schemas
export const ConvertTextParamsSchema = z.object({
  markdown: z.string().describe("Markdown text to convert"),
  options: ConvertOptionsSchema,
});

export const ConvertFileParamsSchema = z.object({
  path: z.string().describe("Path to the local markdown file"),
  options: ConvertOptionsSchema,
});

export const ConvertUrlParamsSchema = z.object({
  url: z.string().url().describe("URL of the remote markdown file"),
  options: ConvertOptionsSchema,
});

export const BatchConvertParamsSchema = z.object({
  directory: z.string().describe("Directory path to scan for markdown files"),
  pattern: z.string().optional().describe("File name pattern (default: *.md)"),
  recursive: z.boolean().optional().describe("Whether to recursively scan subdirectories"),
  options: ConvertOptionsSchema,
});

// Export types
export type ConvertTextParams = z.infer<typeof ConvertTextParamsSchema>;
export type ConvertFileParams = z.infer<typeof ConvertFileParamsSchema>;
export type ConvertUrlParams = z.infer<typeof ConvertUrlParamsSchema>;
export type BatchConvertParams = z.infer<typeof BatchConvertParamsSchema>; 