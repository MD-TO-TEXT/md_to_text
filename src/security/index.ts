import path from 'path';
import { SecurityConfig, SecurityError } from '../types/index.js';
import validator from 'validator';

// Default security configuration
export const DEFAULT_SECURITY_CONFIG: SecurityConfig = {
  maxFileSize: 10 * 1024 * 1024, // 10MB
  allowedExtensions: ['.md', '.markdown', '.txt'],
  blockedPaths: [
    '/etc',
    '/proc',
    '/sys',
    '/dev',
    '/root',
    'C:\\Windows',
    'C:\\Program Files',
    'C:\\Users\\Administrator'
  ],
  urlTimeout: 30000, // 30 seconds
  allowedProtocols: ['http:', 'https:']
};

export class SecurityValidator {
  private config: SecurityConfig;

  constructor(config: SecurityConfig = DEFAULT_SECURITY_CONFIG) {
    this.config = config;
  }

  /**
   * Validate file path for security issues
   */
  validateFilePath(filePath: string): void {
    if (!filePath || typeof filePath !== 'string') {
      throw new SecurityError('File path must be a non-empty string');
    }

    // Normalize path to prevent path traversal
    const normalizedPath = path.normalize(filePath);
    
    // Check for path traversal attempts
    if (normalizedPath.includes('..')) {
      throw new SecurityError('Path traversal detected');
    }

    // Check against blocked paths
    for (const blockedPath of this.config.blockedPaths) {
      if (normalizedPath.startsWith(blockedPath)) {
        throw new SecurityError(`Access to path '${blockedPath}' is blocked`);
      }
    }

    // Check file extension
    const ext = path.extname(normalizedPath).toLowerCase();
    if (ext && !this.config.allowedExtensions.includes(ext)) {
      throw new SecurityError(`File extension '${ext}' is not allowed`);
    }

    // Additional checks for dangerous patterns
    const dangerousPatterns = [
      /\0/,           // null bytes
      /[<>:"|?*]/,    // Windows invalid characters
      /^\./,          // hidden files starting with dot (optional - remove if needed)
    ];

    for (const pattern of dangerousPatterns) {
      if (pattern.test(normalizedPath)) {
        throw new SecurityError('File path contains invalid characters');
      }
    }
  }

  /**
   * Validate URL for security and format
   */
  validateUrl(url: string): void {
    if (!url || typeof url !== 'string') {
      throw new SecurityError('URL must be a non-empty string');
    }

    // Basic URL validation
    if (!validator.isURL(url, {
      protocols: this.config.allowedProtocols,
      require_protocol: true,
      require_tld: true,
      allow_underscores: true
    })) {
      throw new SecurityError('Invalid URL format');
    }

    try {
      const urlObj = new URL(url);
      
      // Check protocol
      if (!this.config.allowedProtocols.includes(urlObj.protocol)) {
        throw new SecurityError(`Protocol '${urlObj.protocol}' is not allowed`);
      }

      // Block dangerous hosts
      const blockedHosts = [
        'localhost',
        '127.0.0.1',
        '0.0.0.0',
        '::1'
      ];

      if (blockedHosts.includes(urlObj.hostname.toLowerCase())) {
        throw new SecurityError('Access to local/internal hosts is blocked');
      }

      // Check for private IP ranges (optional, can be removed if needed)
      if (this.isPrivateIP(urlObj.hostname)) {
        throw new SecurityError('Access to private IP ranges is blocked');
      }

    } catch (error) {
      if (error instanceof SecurityError) {
        throw error;
      }
      throw new SecurityError('Invalid URL format');
    }
  }

  /**
   * Validate file size
   */
  validateFileSize(size: number): void {
    if (size > this.config.maxFileSize) {
      throw new SecurityError(
        `File size ${size} bytes exceeds maximum allowed size of ${this.config.maxFileSize} bytes`
      );
    }
  }

  /**
   * Sanitize text output
   */
  sanitizeOutput(text: string): string {
    if (!text || typeof text !== 'string') {
      return '';
    }

    // Remove potential script tags and dangerous content
    return text
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/data:.*?base64/gi, '')
      .trim();
  }

  /**
   * Check if hostname is a private IP
   */
  private isPrivateIP(hostname: string): boolean {
    // IPv4 private ranges
    const privateIPv4Patterns = [
      /^10\./,                    // 10.0.0.0/8
      /^172\.(1[6-9]|2\d|3[01])\./, // 172.16.0.0/12
      /^192\.168\./,              // 192.168.0.0/16
      /^169\.254\./,              // 169.254.0.0/16 (link-local)
    ];

    // IPv6 private ranges
    const privateIPv6Patterns = [
      /^fc00:/,    // fc00::/7
      /^fd00:/,    // fd00::/8
      /^fe80:/,    // fe80::/10 (link-local)
      /^::1$/,     // loopback
    ];

    const allPatterns = [...privateIPv4Patterns, ...privateIPv6Patterns];
    return allPatterns.some(pattern => pattern.test(hostname.toLowerCase()));
  }

  /**
   * Get current configuration
   */
  getConfig(): SecurityConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<SecurityConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }
}

// Export singleton instance
export const securityValidator = new SecurityValidator(); 