#!/usr/bin/env node

import { startStdioServer, setupStdioShutdownHandlers } from './transports/stdio.js';
import { startHttpServer, setupHttpShutdownHandlers } from './transports/http.js';

interface CLIArgs {
  mode: 'stdio' | 'http';
  port?: number;
  host?: string;
  cors?: boolean;
  help?: boolean;
}

/**
 * Parse command line arguments
 */
function parseArgs(): CLIArgs {
  const args = process.argv.slice(2);
  const result: CLIArgs = {
    mode: 'stdio' // default mode
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    switch (arg) {
      case '--mode':
        const mode = args[++i];
        if (mode === 'stdio' || mode === 'http') {
          result.mode = mode;
        } else {
          console.error(`Invalid mode: ${mode}. Must be 'stdio' or 'http'`);
          process.exit(1);
        }
        break;
        
      case '--port':
        const port = parseInt(args[++i]);
        if (isNaN(port) || port < 1 || port > 65535) {
          console.error(`Invalid port: ${args[i]}. Must be a number between 1 and 65535`);
          process.exit(1);
        }
        result.port = port;
        break;
        
      case '--host':
        result.host = args[++i];
        break;
        
      case '--cors':
        result.cors = true;
        break;
        
      case '--no-cors':
        result.cors = false;
        break;
        
      case '--help':
      case '-h':
        result.help = true;
        break;
        
      default:
        if (arg.startsWith('--')) {
          console.error(`Unknown option: ${arg}`);
          process.exit(1);
        }
        break;
    }
  }

  return result;
}

/**
 * Display help information
 */
function displayHelp(): void {
  console.log(`
Markdown to Text MCP Server v1.0.0

USAGE:
  md-to-text-mcp [OPTIONS]

OPTIONS:
  --mode <mode>         Server mode: 'stdio' or 'http' (default: stdio)
  --port <port>         HTTP server port (default: 3000, only for http mode)
  --host <host>         HTTP server host (default: localhost, only for http mode)
  --cors                Enable CORS for HTTP mode (default: enabled)
  --no-cors             Disable CORS for HTTP mode
  --help, -h            Show this help message

MODES:
  stdio                 Run as stdio-based MCP server (for Claude Desktop)
  http                  Run as HTTP-based MCP server (for remote clients)

EXAMPLES:
  # Run in stdio mode (default)
  md-to-text-mcp

  # Run in stdio mode explicitly
  md-to-text-mcp --mode stdio

  # Run HTTP server on port 3000
  md-to-text-mcp --mode http --port 3000

  # Run HTTP server with custom host and port
  md-to-text-mcp --mode http --host 0.0.0.0 --port 8080

ENVIRONMENT VARIABLES:
  MCP_MODE              Server mode (stdio|http)
  MCP_PORT              HTTP server port
  MCP_HOST              HTTP server host
  MAX_FILE_SIZE         Maximum file size in bytes (default: 10485760)
  URL_TIMEOUT           URL request timeout in ms (default: 30000)
  ALLOWED_EXTENSIONS    Comma-separated file extensions (default: .md,.markdown,.txt)

For more information, visit: https://github.com/your-org/md-to-text-mcp
`);
}

/**
 * Apply environment variable overrides
 */
function applyEnvOverrides(args: CLIArgs): CLIArgs {
  const result = { ...args };

  if (process.env.MCP_MODE) {
    const mode = process.env.MCP_MODE as 'stdio' | 'http';
    if (mode === 'stdio' || mode === 'http') {
      result.mode = mode;
    }
  }

  if (process.env.MCP_PORT) {
    const port = parseInt(process.env.MCP_PORT);
    if (!isNaN(port)) {
      result.port = port;
    }
  }

  if (process.env.MCP_HOST) {
    result.host = process.env.MCP_HOST;
  }

  return result;
}

/**
 * Main entry point
 */
async function main(): Promise<void> {
  try {
    const args = parseArgs();

    if (args.help) {
      displayHelp();
      process.exit(0);
    }

    // Apply environment variable overrides
    const config = applyEnvOverrides(args);

    console.error(`Starting Markdown to Text MCP Server in ${config.mode} mode...`);

    if (config.mode === 'stdio') {
      setupStdioShutdownHandlers();
      await startStdioServer();
    } else {
      setupHttpShutdownHandlers();
      await startHttpServer({
        port: config.port || 3000,
        host: config.host || 'localhost',
        enableCors: config.cors !== false
      });
    }

  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Handle uncaught errors at the top level
process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Start the server
main();