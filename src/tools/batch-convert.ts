import fs from 'fs/promises';
import path from 'path';
import { BatchConvertParams, ToolResult, BatchResult, ConversionError, SecurityError } from '../types/index.js';
import { markdownConverter } from '../engine/index.js';
import { securityValidator } from '../security/index.js';

/**
 * Batch convert markdown files in a directory
 */
export async function batchConvert(params: BatchConvertParams): Promise<ToolResult> {
  try {
    if (!params.directory) {
      throw new ConversionError('Directory path is required');
    }

    // Security validation
    securityValidator.validateFilePath(params.directory);

    // Check if directory exists
    let stats;
    try {
      stats = await fs.stat(params.directory);
    } catch (error) {
      throw new ConversionError(`Directory not found or cannot be accessed: ${params.directory}`);
    }

    if (!stats.isDirectory()) {
      throw new ConversionError(`Path is not a directory: ${params.directory}`);
    }

    // Scan for markdown files
    const pattern = params.pattern || '*.md';
    const recursive = params.recursive !== false; // default to true

    const files = await findMarkdownFiles(params.directory, pattern, recursive);

    if (files.length === 0) {
      return {
        content: [
          {
            type: 'text',
            text: `No markdown files found in directory: ${params.directory}`
          }
        ]
      };
    }

    // Process files with concurrency limit
    const result = await processBatch(files, params.options);

    // Format result
    const summary = formatBatchResult(result);

    return {
      content: [
        {
          type: 'text',
          text: summary
        }
      ],
      metadata: result
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
          text: `Error in batch conversion: ${errorMessage}`
        }
      ]
    };
  }
}

/**
 * Find markdown files in directory
 */
async function findMarkdownFiles(directory: string, pattern: string, recursive: boolean): Promise<string[]> {
  const files: string[] = [];
  
  // Convert simple pattern to regex
  const regex = patternToRegex(pattern);

  async function scanDirectory(dir: string): Promise<void> {
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        
        if (entry.isDirectory() && recursive) {
          await scanDirectory(fullPath);
        } else if (entry.isFile() && regex.test(entry.name)) {
          files.push(fullPath);
        }
      }
    } catch (error) {
      // Skip directories we can't read
      console.error(`Warning: Cannot read directory ${dir}`);
    }
  }

  await scanDirectory(directory);
  return files;
}

/**
 * Convert simple pattern to regex
 */
function patternToRegex(pattern: string): RegExp {
  // Simple implementation - convert * to .* and escape other regex chars
  const escaped = pattern
    .replace(/[.+^${}()|[\]\\]/g, '\\$&') // Escape regex chars
    .replace(/\*/g, '.*'); // Convert * to .*
  
  return new RegExp(`^${escaped}$`, 'i');
}

/**
 * Process files in batches with concurrency control
 */
async function processBatch(files: string[], options?: any): Promise<BatchResult> {
  const result: BatchResult = {
    success: true,
    totalFiles: files.length,
    processedFiles: 0,
    failedFiles: 0,
    results: []
  };

  // Process with limited concurrency
  const CONCURRENCY_LIMIT = 5;
  const chunks = chunkArray(files, CONCURRENCY_LIMIT);

  for (const chunk of chunks) {
    const promises = chunk.map(async (file) => {
      try {
        // Validate file path
        securityValidator.validateFilePath(file);

        // Read and convert file
        const content = await fs.readFile(file, 'utf-8');
        const stats = await fs.stat(file);
        
        // Validate file size
        securityValidator.validateFileSize(stats.size);

        const convertResult = markdownConverter.convert(content, options);

        result.processedFiles++;
        result.results.push({
          file: path.relative(process.cwd(), file),
          success: true,
          text: convertResult.text.substring(0, 200) + (convertResult.text.length > 200 ? '...' : '') // Truncate for summary
        });

      } catch (error) {
        result.failedFiles++;
        result.results.push({
          file: path.relative(process.cwd(), file),
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });

    await Promise.all(promises);
  }

  result.success = result.failedFiles === 0;
  return result;
}

/**
 * Chunk array into smaller arrays
 */
function chunkArray<T>(array: T[], chunkSize: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize));
  }
  return chunks;
}

/**
 * Format batch result for display
 */
function formatBatchResult(result: BatchResult): string {
  const lines = [
    `Batch conversion completed`,
    `Total files: ${result.totalFiles}`,
    `Processed: ${result.processedFiles}`,
    `Failed: ${result.failedFiles}`,
    `Success rate: ${((result.processedFiles / result.totalFiles) * 100).toFixed(1)}%`,
    ''
  ];

  if (result.results.length > 0) {
    lines.push('Results:');
    
    for (const fileResult of result.results) {
      if (fileResult.success) {
        lines.push(`✅ ${fileResult.file}`);
        if (fileResult.text) {
          lines.push(`   Preview: ${fileResult.text.split('\n')[0]}`);
        }
      } else {
        lines.push(`❌ ${fileResult.file}: ${fileResult.error}`);
      }
    }
  }

  return lines.join('\n');
} 