// Core types for markdown conversion

export interface ConvertOptions {
  preserveLinks?: boolean;
  listStyle?: 'bullets' | 'numbers' | 'none';
  codeHandling?: 'preserve' | 'remove' | 'inline';
  tableFormat?: 'simple' | 'grid' | 'none';
  headingStyle?: 'hash' | 'underline' | 'none';
}

export interface ConvertResult {
  text: string;
  metadata?: {
    originalLength: number;
    convertedLength: number;
    processingTime: number;
    elementsFound: string[];
  };
}

export interface ToolResult {
  [x: string]: unknown; // Add index signature for MCP compatibility
  content: Array<{
    type: 'text';
    text: string;
  }>;
  metadata?: any;
}

// Tool parameter types
export interface ConvertTextParams {
  markdown: string;
  options?: ConvertOptions;
}

export interface ConvertFileParams {
  path: string;
  options?: ConvertOptions;
}

export interface ConvertUrlParams {
  url: string;
  options?: ConvertOptions;
}

export interface BatchConvertParams {
  directory: string;
  pattern?: string;
  recursive?: boolean;
  options?: ConvertOptions;
}

// Transport configuration
export interface TransportConfig {
  type: 'stdio' | 'http';
  port?: number;
  host?: string;
}

// Security configuration
export interface SecurityConfig {
  maxFileSize: number;
  allowedExtensions: string[];
  blockedPaths: string[];
  urlTimeout: number;
  allowedProtocols: string[];
}

// Batch processing result
export interface BatchResult {
  success: boolean;
  totalFiles: number;
  processedFiles: number;
  failedFiles: number;
  results: Array<{
    file: string;
    success: boolean;
    text?: string;
    error?: string;
  }>;
}

// Error types
export class ConversionError extends Error {
  constructor(message: string, public cause?: Error) {
    super(message);
    this.name = 'ConversionError';
  }
}

export class SecurityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SecurityError';
  }
}

export class NetworkError extends Error {
  constructor(message: string, public statusCode?: number) {
    super(message);
    this.name = 'NetworkError';
  }
} 