import { ConvertUrlParams, ToolResult, ConversionError, SecurityError, NetworkError } from '../types/index.js';
import { markdownConverter } from '../engine/index.js';
import { securityValidator } from '../security/index.js';

/**
 * Convert remote markdown URL to plain text
 */
export async function convertUrl(params: ConvertUrlParams): Promise<ToolResult> {
  try {
    if (!params.url) {
      throw new ConversionError('URL is required');
    }

    // Security validation
    securityValidator.validateUrl(params.url);

    // Fetch content from URL
    const content = await fetchUrlContent(params.url);

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
        sourceUrl: params.url,
        fetchedAt: new Date().toISOString()
      }
    };

  } catch (error) {
    let errorMessage: string;
    
    if (error instanceof SecurityError) {
      errorMessage = `Security error: ${error.message}`;
    } else if (error instanceof NetworkError) {
      errorMessage = `Network error: ${error.message}`;
    } else if (error instanceof ConversionError) {
      errorMessage = error.message;
    } else {
      errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    }

    return {
      content: [
        {
          type: 'text',
          text: `Error converting URL: ${errorMessage}`
        }
      ]
    };
  }
}

/**
 * Fetch content from URL with timeout and error handling
 */
async function fetchUrlContent(url: string): Promise<string> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), securityValidator.getConfig().urlTimeout);

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'md-to-text-mcp/1.0.0',
        'Accept': 'text/markdown, text/plain, text/html, */*',
        'Accept-Encoding': 'gzip, deflate',
      },
      signal: controller.signal,
      redirect: 'follow'
      // Note: fetch API doesn't support custom redirect limits
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new NetworkError(
        `HTTP ${response.status}: ${response.statusText}`,
        response.status
      );
    }

    // Check content type
    const contentType = response.headers.get('content-type') || '';
    
    // If it's HTML, we might need to extract markdown content
    if (contentType.includes('text/html')) {
      const html = await response.text();
      return extractMarkdownFromHtml(html);
    }

    // For text content, return as-is
    const content = await response.text();
    
    // Validate content size
    const contentSize = new TextEncoder().encode(content).length;
    securityValidator.validateFileSize(contentSize);

    return content;

  } catch (error) {
    clearTimeout(timeoutId);
    
    if (error instanceof NetworkError) {
      throw error;
    }
    
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        throw new NetworkError('Request timed out');
      }
      throw new NetworkError(`Network error: ${error.message}`);
    }
    
    throw new NetworkError('Unknown network error occurred');
  }
}

/**
 * Extract markdown content from HTML (basic implementation)
 */
function extractMarkdownFromHtml(html: string): string {
  // Basic HTML to text conversion
  // Remove script and style tags
  let text = html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/<[^>]*>/g, '') // Remove all HTML tags
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();

  return text;
} 