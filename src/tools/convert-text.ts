import { ConvertTextParams, ToolResult, ConversionError } from '../types/index.js';
import { markdownConverter } from '../engine/index.js';

/**
 * Convert markdown text to plain text
 */
export async function convertText(params: ConvertTextParams): Promise<ToolResult> {
  try {
    if (!params.markdown) {
      throw new ConversionError('Markdown text is required');
    }

    // Convert markdown to plain text
    const result = markdownConverter.convert(params.markdown, params.options);

    return {
      content: [
        {
          type: 'text',
          text: result.text
        }
      ],
      metadata: result.metadata
    };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    return {
      content: [
        {
          type: 'text',
          text: `Error converting markdown: ${errorMessage}`
        }
      ]
    };
  }
} 