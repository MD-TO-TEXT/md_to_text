import { marked } from 'marked';
import { ConvertOptions, ConvertResult, ConversionError } from '../types/index.js';
import { securityValidator } from '../security/index.js';

// Custom renderer for plain text output
class PlainTextRenderer {
  private convertOptions: ConvertOptions;
  public options: any = {}; // Required by marked interface

  constructor(options: ConvertOptions = {}) {
    this.convertOptions = options;
  }

  // Required by _Renderer interface
  checkbox(checked: boolean): string {
    return checked ? '[x] ' : '[ ] ';
  }

  // Required by _Renderer interface  
  text(text: string): string {
    return text;
  }

  // Headings
  heading(text: string, level: number): string {
    switch (this.convertOptions.headingStyle) {
      case 'hash':
        return '#'.repeat(level) + ' ' + text + '\n\n';
      case 'underline':
        const underline = level <= 2 ? '=' : '-';
        return text + '\n' + underline.repeat(text.length) + '\n\n';
      case 'none':
        return text + '\n\n';
      default:
        return text + '\n\n';
    }
  }

  // Paragraphs
  paragraph(text: string): string {
    return text + '\n\n';
  }

  // Lists
  list(body: string, ordered: boolean): string {
    if (this.convertOptions.listStyle === 'none') {
      return body + '\n';
    }
    return body + '\n';
  }

  listitem(text: string, task: boolean, checked: boolean): string {
    // Handle task list items
    if (task) {
      const checkbox = checked ? '[x]' : '[ ]';
      return `${checkbox} ${text}\n`;
    }

    // Regular list items - we'll track ordering manually
    switch (this.convertOptions.listStyle) {
      case 'bullets':
        return '• ' + text + '\n';
      case 'numbers':
        return '1. ' + text + '\n'; // Simplified numbering
      case 'none':
        return text + '\n';
      default:
        return '• ' + text + '\n';
    }
  }

  // Links
  link(href: string, title: string | null, text: string): string {
    if (this.convertOptions.preserveLinks) {
      const titleText = title ? ` "${title}"` : '';
      return `${text} (${href}${titleText})`;
    }
    return text;
  }

  // Images
  image(href: string, title: string | null, text: string): string {
    if (this.convertOptions.preserveLinks) {
      const titleText = title ? ` "${title}"` : '';
      return `[Image: ${text || 'image'}] (${href}${titleText})`;
    }
    return `[Image: ${text || 'image'}]`;
  }

  // Code blocks
  code(code: string, language?: string): string {
    switch (this.convertOptions.codeHandling) {
      case 'preserve':
        return '\n```' + (language || '') + '\n' + code + '\n```\n\n';
      case 'remove':
        return '';
      case 'inline':
        return code;
      default:
        return '\n' + code + '\n\n';
    }
  }

  // Inline code
  codespan(code: string): string {
    switch (this.convertOptions.codeHandling) {
      case 'preserve':
        return '`' + code + '`';
      case 'remove':
        return '';
      case 'inline':
        return code;
      default:
        return code;
    }
  }

  // Blockquotes
  blockquote(quote: string): string {
    return quote.split('\n').map(line => '> ' + line).join('\n') + '\n\n';
  }

  // Tables
  table(header: string, body: string): string {
    switch (this.convertOptions.tableFormat) {
      case 'simple':
        return header + body + '\n';
      case 'grid':
        return this.formatGridTable(header, body);
      case 'none':
        return '';
      default:
        return header + body + '\n';
    }
  }

  tablerow(content: string): string {
    return content + '\n';
  }

  tablecell(content: string, flags: { header: boolean, align: "center" | "left" | "right" | null }): string {
    return content + '\t';
  }

  // Horizontal rules
  hr(): string {
    return '\n---\n\n';
  }

  // Line breaks
  br(): string {
    return '\n';
  }

  // Strong/Bold
  strong(text: string): string {
    return text; // Remove formatting
  }

  // Emphasis/Italic
  em(text: string): string {
    return text; // Remove formatting
  }

  // Strikethrough
  del(text: string): string {
    return text; // Remove formatting
  }

  // HTML (clean it)
  html(html: string): string {
    return securityValidator.sanitizeOutput(html);
  }

  private formatGridTable(header: string, body: string): string {
    // Simple grid table formatting
    const headerLines = header.trim().split('\n');
    const bodyLines = body.trim().split('\n');
    
    if (headerLines.length === 0) return body + '\n';
    
    const separator = '+' + '-'.repeat(20) + '+'.repeat(headerLines[0].split('\t').length - 1) + '\n';
    
    return separator + header.replace(/\t/g, ' | ') + separator + body.replace(/\t/g, ' | ') + separator + '\n';
  }
}

export class MarkdownConverter {
  constructor() {
    // Configure marked options
    marked.setOptions({
      breaks: true,
      gfm: true,
      silent: false
    });
  }

  /**
   * Convert markdown text to plain text
   */
  convert(markdown: string, options: ConvertOptions = {}): ConvertResult {
    const startTime = Date.now();
    
    try {
      if (!markdown || typeof markdown !== 'string') {
        throw new ConversionError('Input must be a non-empty string');
      }

      // Preprocess markdown
      const preprocessed = this.preprocess(markdown);

      // Set up custom renderer
      const renderer = new PlainTextRenderer(options);
      
      // Convert using custom string processing instead of marked renderer
      // This is a simpler approach that doesn't rely on marked's complex renderer API
      const text = this.convertWithCustomLogic(preprocessed, options);
      const processedText = this.postprocess(text, options);

      // Extract metadata
      const metadata = this.extractMetadata(markdown, processedText, startTime);

      return {
        text: securityValidator.sanitizeOutput(processedText),
        metadata
      };

    } catch (error) {
      if (error instanceof ConversionError) {
        throw error;
      }
      throw new ConversionError('Failed to convert markdown', error as Error);
    }
  }

  /**
   * Custom markdown to text conversion logic
   */
  private convertWithCustomLogic(markdown: string, options: ConvertOptions): string {
    let text = markdown;

    // Convert headings
    text = text.replace(/^#{1,6}\s+(.+)$/gm, (match, content, offset, string) => {
      const level = match.indexOf(' ');
      switch (options.headingStyle) {
        case 'hash':
          return '#'.repeat(level) + ' ' + content + '\n';
        case 'underline':
          const underline = level <= 2 ? '=' : '-';
          return content + '\n' + underline.repeat(content.length) + '\n';
        case 'none':
          return content + '\n';
        default:
          return content + '\n';
      }
    });

    // Convert links
    if (options.preserveLinks) {
      text = text.replace(/\[([^\]]*)\]\(([^)]*)\)/g, '$1 ($2)');
    } else {
      text = text.replace(/\[([^\]]*)\]\([^)]*\)/g, '$1');
    }

    // Convert images
    if (options.preserveLinks) {
      text = text.replace(/!\[([^\]]*)\]\(([^)]*)\)/g, '[Image: $1] ($2)');
    } else {
      text = text.replace(/!\[([^\]]*)\]\([^)]*\)/g, '[Image: $1]');
    }

    // Convert code blocks
    switch (options.codeHandling) {
      case 'preserve':
        // Keep code blocks as-is
        break;
      case 'remove':
        text = text.replace(/```[\s\S]*?```/g, '');
        text = text.replace(/`[^`]*`/g, '');
        break;
      case 'inline':
        text = text.replace(/```[\s\S]*?```/g, (match) => {
          return match.replace(/```[^\n]*\n/, '').replace(/```$/, '');
        });
        text = text.replace(/`([^`]*)`/g, '$1');
        break;
    }

    // Convert lists
    if (options.listStyle === 'none') {
      text = text.replace(/^\s*[\*\-\+]\s+/gm, '');
      text = text.replace(/^\s*\d+\.\s+/gm, '');
    } else if (options.listStyle === 'bullets') {
      text = text.replace(/^\s*[\*\-\+]\s+/gm, '• ');
      text = text.replace(/^\s*\d+\.\s+/gm, '• ');
    } else if (options.listStyle === 'numbers') {
      text = text.replace(/^\s*[\*\-\+]\s+/gm, '1. ');
      // Keep numbered lists as-is
    }

    // Convert blockquotes
    text = text.replace(/^\s*>\s*/gm, '> ');

    // Convert bold/italic (remove formatting)
    text = text.replace(/\*\*([^*]*)\*\*/g, '$1');
    text = text.replace(/\*([^*]*)\*/g, '$1');
    text = text.replace(/__([^_]*)__/g, '$1');
    text = text.replace(/_([^_]*)_/g, '$1');
    text = text.replace(/~~([^~]*)~~/g, '$1');

    // Convert horizontal rules
    text = text.replace(/^\s*---+\s*$/gm, '---');

    return text;
  }

  /**
   * Preprocess markdown text
   */
  private preprocess(markdown: string): string {
    // Remove YAML front matter
    let processed = markdown.replace(/^---\s*\n[\s\S]*?\n---\s*\n/, '');
    
    // Normalize line endings
    processed = processed.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    
    // Remove HTML comments
    processed = processed.replace(/<!--[\s\S]*?-->/g, '');
    
    return processed.trim();
  }

  /**
   * Postprocess converted text
   */
  private postprocess(text: string, options: ConvertOptions): string {
    // Clean up extra whitespace
    let processed = text
      .replace(/\n{3,}/g, '\n\n') // Max 2 consecutive newlines
      .replace(/[ \t]+$/gm, '')   // Remove trailing spaces
      .replace(/^[ \t]+/gm, '')   // Remove leading spaces (optional)
      .trim();

    return processed;
  }

  /**
   * Extract metadata from conversion process
   */
  private extractMetadata(original: string, converted: string, startTime: number) {
    const processingTime = Date.now() - startTime;
    const elementsFound = this.analyzeMarkdownElements(original);

    return {
      originalLength: original.length,
      convertedLength: converted.length,
      processingTime,
      elementsFound
    };
  }

  /**
   * Analyze markdown elements in the original text
   */
  private analyzeMarkdownElements(markdown: string): string[] {
    const elements: string[] = [];
    
    // Check for various markdown elements
    if (/^#{1,6}\s/.test(markdown)) elements.push('headings');
    if (/^\s*[\*\-\+]\s/m.test(markdown)) elements.push('unordered-lists');
    if (/^\s*\d+\.\s/m.test(markdown)) elements.push('ordered-lists');
    if (/\[.*?\]\(.*?\)/.test(markdown)) elements.push('links');
    if (/!\[.*?\]\(.*?\)/.test(markdown)) elements.push('images');
    if (/```[\s\S]*?```/.test(markdown)) elements.push('code-blocks');
    if (/`[^`\n]+`/.test(markdown)) elements.push('inline-code');
    if (/^\s*>/.test(markdown)) elements.push('blockquotes');
    if (/\|.*?\|/.test(markdown)) elements.push('tables');
    if (/^\s*---+\s*$/m.test(markdown)) elements.push('horizontal-rules');
    if (/\*\*.*?\*\*/.test(markdown)) elements.push('bold');
    if (/\*.*?\*/.test(markdown)) elements.push('italic');
    if (/~~.*?~~/.test(markdown)) elements.push('strikethrough');
    
    return elements;
  }

  /**
   * Get supported options
   */
  getSupportedOptions(): ConvertOptions {
    return {
      preserveLinks: true,
      listStyle: 'bullets',
      codeHandling: 'preserve',
      tableFormat: 'simple',
      headingStyle: 'hash'
    };
  }
}

// Export singleton instance
export const markdownConverter = new MarkdownConverter(); 