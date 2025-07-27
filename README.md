# Markdown to Text MCP Server

A powerful Model Context Protocol (MCP) server that converts Markdown documents to plain text. Supports both stdio and HTTP transport protocols for use as local tools or remote services.

## Features

- 📝 **Complete Markdown Support**: Handles all common elements including headers, lists, links, images, code blocks, tables, etc.
- 🎛️ **Flexible Conversion Options**: Multiple output formats and style configurations
- 🔧 **Dual Protocol Support**: stdio mode (Claude Desktop) and HTTP mode (remote clients)
- 📁 **Batch Processing**: Directory scanning and bulk file conversion
- 🌐 **URL Support**: Direct processing of remote Markdown files
- 🔒 **Security Hardened**: Comprehensive input validation and security protection
- ⚡ **High Performance**: Optimized conversion engine with concurrency control

## Quick Start

### Installation

```bash
git clone <repository-url>
cd md_to_text_mcp
npm install
npm run build
```

### Basic Usage

```bash
# Stdio mode (default)
npm start

# HTTP mode
npm run dev:http
```

## Tools

### convert_text - Text Conversion
Convert Markdown text directly to plain text.

### convert_file - File Conversion  
Read and convert local Markdown files.

### convert_url - URL Conversion
Fetch and convert remote Markdown content from URLs.

### batch_convert - Batch Conversion
Batch process Markdown files in directories.

## Conversion Options

- `preserveLinks`: Preserve link URLs
- `listStyle`: List style (bullets/numbers/none)
- `codeHandling`: Code handling (preserve/remove/inline)
- `tableFormat`: Table format (simple/grid/none)
- `headingStyle`: Heading style (hash/underline/none)

## Claude Desktop Integration

Add to Claude for Desktop configuration file:

```json
{
  "mcpServers": {
    "md-to-text": {
      "command": "node",
      "args": ["./build/index.js"],
      "cwd": "/path/to/md_to_text_mcp"
    }
  }
}
```

## Command Line Options

```bash
md-to-text-mcp [OPTIONS]

OPTIONS:
  --mode <mode>         Server mode: 'stdio' or 'http' (default: stdio)
  --port <port>         HTTP server port (default: 3000)
  --host <host>         HTTP server host (default: localhost)
  --cors                Enable CORS for HTTP mode
  --no-cors             Disable CORS for HTTP mode
  --help, -h            Show help message

EXAMPLES:
  md-to-text-mcp                              # stdio mode
  md-to-text-mcp --mode http --port 3000      # HTTP mode
  md-to-text-mcp --mode http --host 0.0.0.0   # Allow external access
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `MCP_MODE` | Server mode (stdio/http) | stdio |
| `MCP_PORT` | HTTP server port | 3000 |
| `MCP_HOST` | HTTP server host | localhost |
| `MAX_FILE_SIZE` | Max file size (bytes) | 10485760 (10MB) |
| `URL_TIMEOUT` | URL request timeout (ms) | 30000 (30s) |
| `ALLOWED_EXTENSIONS` | Allowed file extensions | .md,.markdown,.txt |

## Docker Support

```bash
# Build image
docker build -t md-to-text-mcp .

# Run HTTP mode
docker run -p 3000:3000 md-to-text-mcp

# Health check
curl http://localhost:3000/health
```

## API Examples

### Text Conversion
```json
{
  "name": "convert_text",
  "arguments": {
    "markdown": "# Hello World\n\nThis is **bold** text.",
    "options": {
      "preserveLinks": true,
      "listStyle": "bullets"
    }
  }
}
```

### File Conversion
```json
{
  "name": "convert_file",
  "arguments": {
    "path": "/path/to/document.md",
    "options": {
      "headingStyle": "underline"
    }
  }
}
```

### URL Conversion
```json
{
  "name": "convert_url",
  "arguments": {
    "url": "https://raw.githubusercontent.com/user/repo/main/README.md",
    "options": {
      "codeHandling": "remove"
    }
  }
}
```

### Batch Conversion
```json
{
  "name": "batch_convert",
  "arguments": {
    "directory": "/path/to/docs",
    "recursive": true,
    "options": {
      "tableFormat": "simple"
    }
  }
}
```

## Security

The server includes multiple layers of security:

- **Path Traversal Protection**: Prevents access to system directories
- **File Size Limits**: Default 10MB maximum
- **URL Validation**: Only allows HTTP/HTTPS protocols
- **Private IP Filtering**: Blocks access to internal networks
- **Content Sanitization**: Removes potentially malicious content
- **Request Timeouts**: Prevents long-running operations

## Development

### Project Structure
```
src/
├── engine/          # Conversion engine
├── security/        # Security validation
├── tools/           # MCP tool implementations
├── transports/      # Transport protocols
├── types/           # TypeScript type definitions
└── index.ts         # Main entry point
```

### Development Commands
```bash
npm run build        # Build project
npm run watch        # Watch mode build
npm run dev:stdio    # Development - stdio
npm run dev:http     # Development - HTTP
```

## Related Resources

### Markdown Documentation
- [Complete Markdown Guide](https://www.mdtotext.com/en/docs/guide/markdown) - Comprehensive Markdown syntax tutorial for efficient md to text conversion

### Online Tools
- [MD to Text Converter](https://www.mdtotext.com/en) - Free online Markdown to text conversion tool with real-time processing

## License

MIT License 