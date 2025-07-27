import fs from 'fs/promises';
import path from 'path';
import { ConvertFileParams, ToolResult, ConversionError, SecurityError } from '../types/index.js';
import { markdownConverter } from '../engine/index.js';
import { securityValidator } from '../security/index.js';

/**
 * Convert local markdown file to plain text
 */
export async function convertFile(params: ConvertFileParams): Promise<ToolResult> {
  try {
    if (!params.path) {
      throw new ConversionError('File path is required');
    }

    // Security validation
    securityValidator.validateFilePath(params.path);

    // Check if file exists and get stats
    let stats;
    try {
      stats = await fs.stat(params.path);
    } catch (error) {
      throw new ConversionError(`File not found or cannot be accessed: ${params.path}`);
    }

    // Check if it's a file (not directory)
    if (!stats.isFile()) {
      throw new ConversionError(`Path is not a file: ${params.path}`);
    }

    // Validate file size
    securityValidator.validateFileSize(stats.size);

    // Read file content
    let content: string;
    try {
      content = await fs.readFile(params.path, 'utf-8');
    } catch (error) {
      throw new ConversionError(`Failed to read file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    // Convert markdown to plain text
    const result = markdownConverter.convert(content, params.options);

    return {
      content: [
        {
          type: 'text',
          text: result.text
        }
      ],
      metadata: {
        ...result.metadata,
        fileName: path.basename(params.path),
        filePath: params.path,
        fileSize: stats.size,
        lastModified: stats.mtime.toISOString()
      }
    };

  } catch (error) {
    let errorMessage: string;
    
    if (error instanceof SecurityError) {
      errorMessage = `Security error: ${error.message}`;
    } else if (error instanceof ConversionError) {
      errorMessage = error.message;
    } else {
      errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    }

    return {
      content: [
        {
          type: 'text',
          text: `Error converting file: ${errorMessage}`
        }
      ]
    };
  }
} 