import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerTools } from '../tools/index.js';

/**
 * Start MCP server with stdio transport
 */
export async function startStdioServer(): Promise<void> {
  try {
    // Create server instance
    const server = new McpServer({
      name: "md-to-text",
      version: "1.0.0",
    });

    // Register all tools
    registerTools(server);

    // Create stdio transport
    const transport = new StdioServerTransport();
    
    // Connect server to transport
    await server.connect(transport);
    
    // Log to stderr to avoid corrupting stdio communication
    console.error("Markdown to Text MCP Server running on stdio");

  } catch (error) {
    console.error("Failed to start stdio server:", error);
    process.exit(1);
  }
}

/**
 * Handle graceful shutdown for stdio mode
 */
export function setupStdioShutdownHandlers(): void {
  process.on("SIGINT", async () => {
    console.error("Received SIGINT, shutting down gracefully...");
    process.exit(0);
  });

  process.on("SIGTERM", async () => {
    console.error("Received SIGTERM, shutting down gracefully...");
    process.exit(0);
  });

  process.on("uncaughtException", (error) => {
    console.error("Uncaught exception:", error);
    process.exit(1);
  });

  process.on("unhandledRejection", (reason, promise) => {
    console.error("Unhandled rejection at:", promise, "reason:", reason);
    process.exit(1);
  });
} 