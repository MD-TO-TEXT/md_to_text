import express from 'express';
import cors from 'cors';
import { randomUUID } from 'crypto';
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";
import { registerTools } from '../tools/index.js';

interface HttpServerConfig {
  port: number;
  host?: string;
  enableCors?: boolean;
}

/**
 * Start MCP server with HTTP transport
 */
export async function startHttpServer(config: HttpServerConfig): Promise<void> {
  try {
    const app = express();
    
    // Middleware
    app.use(express.json({ limit: '10mb' }));
    
    // CORS configuration for browser-based clients
    if (config.enableCors !== false) {
      app.use(cors({
        origin: '*', // Configure appropriately for production
        exposedHeaders: ['Mcp-Session-Id'],
        allowedHeaders: ['Content-Type', 'mcp-session-id'],
      }));
    }

    // Map to store transports by session ID
    const transports: { [sessionId: string]: StreamableHTTPServerTransport } = {};

    // Health check endpoint
    app.get('/health', (req, res) => {
      res.json({ 
        status: 'ok', 
        service: 'md-to-text-mcp',
        version: '1.0.0',
        timestamp: new Date().toISOString()
      });
    });

    // Handle POST requests for client-to-server communication
    app.post('/mcp', async (req, res) => {
      try {
        // Check for existing session ID
        const sessionId = req.headers['mcp-session-id'] as string | undefined;
        let transport: StreamableHTTPServerTransport;

        if (sessionId && transports[sessionId]) {
          // Reuse existing transport
          transport = transports[sessionId];
        } else if (!sessionId && isInitializeRequest(req.body)) {
          // New initialization request
          transport = new StreamableHTTPServerTransport({
            sessionIdGenerator: () => randomUUID(),
            onsessioninitialized: (sessionId) => {
              // Store the transport by session ID
              transports[sessionId] = transport;
              console.error(`New session initialized: ${sessionId}`);
            },
            // DNS rebinding protection (enable in production)
            enableDnsRebindingProtection: false,
            // allowedHosts: ['127.0.0.1', 'localhost'],
          });

          // Clean up transport when closed
          transport.onclose = () => {
            if (transport.sessionId) {
              delete transports[transport.sessionId];
              console.error(`Session closed: ${transport.sessionId}`);
            }
          };

          // Create and configure MCP server
          const server = new McpServer({
            name: "md-to-text",
            version: "1.0.0"
          });

          // Register all tools
          registerTools(server);

          // Connect to the MCP server
          await server.connect(transport);
          
        } else {
          // Invalid request
          res.status(400).json({
            jsonrpc: '2.0',
            error: {
              code: -32000,
              message: 'Bad Request: No valid session ID provided',
            },
            id: null,
          });
          return;
        }

        // Handle the request
        await transport.handleRequest(req, res, req.body);

      } catch (error) {
        console.error('Error handling MCP request:', error);
        if (!res.headersSent) {
          res.status(500).json({
            jsonrpc: '2.0',
            error: {
              code: -32603,
              message: 'Internal server error',
            },
            id: null,
          });
        }
      }
    });

    // Reusable handler for GET and DELETE requests
    const handleSessionRequest = async (req: express.Request, res: express.Response) => {
      const sessionId = req.headers['mcp-session-id'] as string | undefined;
      if (!sessionId || !transports[sessionId]) {
        res.status(400).send('Invalid or missing session ID');
        return;
      }
      
      const transport = transports[sessionId];
      await transport.handleRequest(req, res);
    };

    // Handle GET requests for server-to-client notifications via SSE
    app.get('/mcp', handleSessionRequest);

    // Handle DELETE requests for session termination
    app.delete('/mcp', handleSessionRequest);

    // Start server with proper host handling
    const host = config.host || 'localhost';
    const server = app.listen(config.port, host, () => {
      console.error(`Markdown to Text MCP Server running on http://${host}:${config.port}`);
      console.error('Endpoints:');
      console.error('  - POST /mcp - MCP protocol communication');
      console.error('  - GET /mcp - Server-sent events (with session ID)');
      console.error('  - DELETE /mcp - Session termination');
      console.error('  - GET /health - Health check');
    });

    // Graceful shutdown
    process.on('SIGINT', () => {
      console.error('Received SIGINT, shutting down gracefully...');
      server.close(() => {
        process.exit(0);
      });
    });

    process.on('SIGTERM', () => {
      console.error('Received SIGTERM, shutting down gracefully...');
      server.close(() => {
        process.exit(0);
      });
    });

  } catch (error) {
    console.error("Failed to start HTTP server:", error);
    process.exit(1);
  }
}

/**
 * Handle graceful shutdown for HTTP mode
 */
export function setupHttpShutdownHandlers(): void {
  process.on("uncaughtException", (error) => {
    console.error("Uncaught exception:", error);
    process.exit(1);
  });

  process.on("unhandledRejection", (reason, promise) => {
    console.error("Unhandled rejection at:", promise, "reason:", reason);
    process.exit(1);
  });
} 