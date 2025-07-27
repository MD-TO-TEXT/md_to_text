import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

// Import tool functions
import { convertText } from './convert-text.js';
import { convertFile } from './convert-file.js';
import { convertUrl } from './convert-url.js';
import { batchConvert } from './batch-convert.js';

// Import schemas
import { 
  ConvertTextParamsSchema,
  ConvertFileParamsSchema, 
  ConvertUrlParamsSchema,
  BatchConvertParamsSchema
} from '../types/schemas.js';

/**
 * Register all tools with the MCP server
 */
export function registerTools(server: McpServer): void {
  // Convert markdown text to plain text
  server.tool(
    "convert_text",
    "Convert markdown text to plain text",
    {
      markdown: z.string().describe("Markdown text to convert"),
      options: z.object({
        preserveLinks: z.boolean().optional().describe("Whether to preserve link URLs"),
        listStyle: z.enum(['bullets', 'numbers', 'none']).optional().describe("List style format"),
        codeHandling: z.enum(['preserve', 'remove', 'inline']).optional().describe("How to handle code blocks"),
        tableFormat: z.enum(['simple', 'grid', 'none']).optional().describe("Table format style"),
        headingStyle: z.enum(['hash', 'underline', 'none']).optional().describe("Heading style format"),
      }).optional()
    },
    async ({ markdown, options }) => {
      const result = await convertText({ markdown, options });
      return result;
    }
  );

  // Convert local markdown file to plain text
  server.tool(
    "convert_file",
    "Convert local markdown file to plain text",
    {
      path: z.string().describe("Local file path"),
      options: z.object({
        preserveLinks: z.boolean().optional().describe("Whether to preserve link URLs"),
        listStyle: z.enum(['bullets', 'numbers', 'none']).optional().describe("List style format"),
        codeHandling: z.enum(['preserve', 'remove', 'inline']).optional().describe("How to handle code blocks"),
        tableFormat: z.enum(['simple', 'grid', 'none']).optional().describe("Table format style"),
        headingStyle: z.enum(['hash', 'underline', 'none']).optional().describe("Heading style format"),
      }).optional()
    },
    async ({ path, options }) => {
      const result = await convertFile({ path, options });
      return result;
    }
  );

  // Convert remote URL to plain text
  server.tool(
    "convert_url",
    "Fetch remote URL markdown content and convert to plain text",
    {
      url: z.string().url().describe("Remote markdown file URL"),
      options: z.object({
        preserveLinks: z.boolean().optional().describe("Whether to preserve link URLs"),
        listStyle: z.enum(['bullets', 'numbers', 'none']).optional().describe("List style format"),
        codeHandling: z.enum(['preserve', 'remove', 'inline']).optional().describe("How to handle code blocks"),
        tableFormat: z.enum(['simple', 'grid', 'none']).optional().describe("Table format style"),
        headingStyle: z.enum(['hash', 'underline', 'none']).optional().describe("Heading style format"),
      }).optional()
    },
    async ({ url, options }) => {
      const result = await convertUrl({ url, options });
      return result;
    }
  );

  // Batch convert directory of markdown files
  server.tool(
    "batch_convert",
    "Batch convert markdown files in a directory",
    {
      directory: z.string().describe("Directory path"),
      pattern: z.string().optional().describe("File name pattern (default: *.md)"),
      recursive: z.boolean().optional().describe("Whether to recursively process subdirectories"),
      options: z.object({
        preserveLinks: z.boolean().optional().describe("Whether to preserve link URLs"),
        listStyle: z.enum(['bullets', 'numbers', 'none']).optional().describe("List style format"),
        codeHandling: z.enum(['preserve', 'remove', 'inline']).optional().describe("How to handle code blocks"),
        tableFormat: z.enum(['simple', 'grid', 'none']).optional().describe("Table format style"),
        headingStyle: z.enum(['hash', 'underline', 'none']).optional().describe("Heading style format"),
      }).optional()
    },
    async ({ directory, pattern, recursive, options }) => {
      const result = await batchConvert({ directory, pattern, recursive, options });
      return result;
    }
  );
} 