#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from "@modelcontextprotocol/sdk/types.js";

const JULES_API_BASE = "https://jules.googleapis.com/v1alpha";

// Get API key from environment variable
const API_KEY = process.env.GOOGLE_JULES_API_KEY;

if (!API_KEY) {
  console.error("Error: GOOGLE_JULES_API_KEY environment variable is required");
  process.exit(1);
}

// Helper function to make API requests
async function julesRequest(
  endpoint: string,
  method: "GET" | "POST" = "GET",
  body?: object
): Promise<unknown> {
  const url = `${JULES_API_BASE}${endpoint}`;
  
  const headers: Record<string, string> = {
    "X-Goog-Api-Key": API_KEY!,
    "Content-Type": "application/json",
  };

  const options: RequestInit = {
    method,
    headers,
  };

  if (body && method === "POST") {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(url, options);
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Jules API error (${response.status}): ${errorText}`);
  }

  const text = await response.text();
  if (!text) {
    return {};
  }
  
  return JSON.parse(text);
}

// Define all tools
const tools: Tool[] = [
  // Sources
  {
    name: "jules_list_sources",
    description: "List all available sources (GitHub repositories) connected to Jules. Returns a list of sources with their names and GitHub repo details.",
    inputSchema: {
      type: "object" as const,
      properties: {
        pageSize: {
          type: "number",
          description: "Maximum number of sources to return (optional)",
        },
        pageToken: {
          type: "string",
          description: "Token for pagination to get the next page of results (optional)",
        },
      },
    },
  },
  {
    name: "jules_get_source",
    description: "Get details of a specific source by its name. Returns source information including GitHub repo owner, name, branches, and privacy status.",
    inputSchema: {
      type: "object" as const,
      properties: {
        name: {
          type: "string",
          description: "The full resource name of the source (e.g., 'sources/github/owner/repo')",
        },
      },
      required: ["name"],
    },
  },
  // Sessions
  {
    name: "jules_list_sessions",
    description: "List all sessions. Sessions are continuous units of work within a specific context. Returns session details including state, outputs, and pull requests.",
    inputSchema: {
      type: "object" as const,
      properties: {
        pageSize: {
          type: "number",
          description: "Maximum number of sessions to return (optional)",
        },
        pageToken: {
          type: "string",
          description: "Token for pagination to get the next page of results (optional)",
        },
      },
    },
  },
  {
    name: "jules_get_session",
    description: "Get details of a specific session including its state, source context, outputs, and any pull requests created.",
    inputSchema: {
      type: "object" as const,
      properties: {
        sessionId: {
          type: "string",
          description: "The ID of the session to retrieve",
        },
      },
      required: ["sessionId"],
    },
  },
  {
    name: "jules_create_session",
    description: "Create a new Jules session to start a coding task. Jules will work on the task autonomously, optionally creating a PR when done.",
    inputSchema: {
      type: "object" as const,
      properties: {
        prompt: {
          type: "string",
          description: "The prompt describing what task Jules should perform (e.g., 'Fix the bug in auth.js', 'Add dark mode support')",
        },
        source: {
          type: "string",
          description: "The source name to work on (e.g., 'sources/github/owner/repo')",
        },
        startingBranch: {
          type: "string",
          description: "The branch to start from (e.g., 'main')",
        },
        title: {
          type: "string",
          description: "Optional title for the session. If not provided, system will generate one.",
        },
        automationMode: {
          type: "string",
          enum: ["AUTOMATION_MODE_UNSPECIFIED", "AUTO_CREATE_PR"],
          description: "Automation mode. Use 'AUTO_CREATE_PR' to automatically create a PR when done.",
        },
        requirePlanApproval: {
          type: "boolean",
          description: "If true, plans will require explicit approval before Jules starts working. Default is auto-approve.",
        },
      },
      required: ["prompt", "source", "startingBranch"],
    },
  },
  {
    name: "jules_approve_plan",
    description: "Approve a plan in a session that requires plan approval. This allows Jules to proceed with executing the plan.",
    inputSchema: {
      type: "object" as const,
      properties: {
        sessionId: {
          type: "string",
          description: "The ID of the session containing the plan to approve",
        },
      },
      required: ["sessionId"],
    },
  },
  {
    name: "jules_send_message",
    description: "Send a message to Jules within an active session. Use this to provide feedback, ask questions, or request changes.",
    inputSchema: {
      type: "object" as const,
      properties: {
        sessionId: {
          type: "string",
          description: "The ID of the session to send the message to",
        },
        prompt: {
          type: "string",
          description: "The message to send to Jules",
        },
      },
      required: ["sessionId", "prompt"],
    },
  },
  // Activities
  {
    name: "jules_list_activities",
    description: "List all activities within a session. Activities include plan generation, progress updates, messages, and completion status.",
    inputSchema: {
      type: "object" as const,
      properties: {
        sessionId: {
          type: "string",
          description: "The ID of the session to list activities for",
        },
        pageSize: {
          type: "number",
          description: "Maximum number of activities to return (optional)",
        },
        pageToken: {
          type: "string",
          description: "Token for pagination to get the next page of results (optional)",
        },
      },
      required: ["sessionId"],
    },
  },
  {
    name: "jules_get_activity",
    description: "Get details of a specific activity within a session, including artifacts like code changes, bash outputs, or media.",
    inputSchema: {
      type: "object" as const,
      properties: {
        sessionId: {
          type: "string",
          description: "The ID of the session containing the activity",
        },
        activityId: {
          type: "string",
          description: "The ID of the activity to retrieve",
        },
      },
      required: ["sessionId", "activityId"],
    },
  },
];

// Tool handlers
async function handleToolCall(
  name: string,
  args: Record<string, unknown>
): Promise<unknown> {
  switch (name) {
    // Sources
    case "jules_list_sources": {
      const params = new URLSearchParams();
      if (args.pageSize) params.set("pageSize", String(args.pageSize));
      if (args.pageToken) params.set("pageToken", String(args.pageToken));
      const query = params.toString() ? `?${params.toString()}` : "";
      return await julesRequest(`/sources${query}`);
    }

    case "jules_get_source": {
      const name = args.name as string;
      return await julesRequest(`/${name}`);
    }

    // Sessions
    case "jules_list_sessions": {
      const params = new URLSearchParams();
      if (args.pageSize) params.set("pageSize", String(args.pageSize));
      if (args.pageToken) params.set("pageToken", String(args.pageToken));
      const query = params.toString() ? `?${params.toString()}` : "";
      return await julesRequest(`/sessions${query}`);
    }

    case "jules_get_session": {
      const sessionId = args.sessionId as string;
      return await julesRequest(`/sessions/${sessionId}`);
    }

    case "jules_create_session": {
      const body: Record<string, unknown> = {
        prompt: args.prompt,
        sourceContext: {
          source: args.source,
          githubRepoContext: {
            startingBranch: args.startingBranch,
          },
        },
      };

      if (args.title) body.title = args.title;
      if (args.automationMode) body.automationMode = args.automationMode;
      if (args.requirePlanApproval !== undefined) {
        body.requirePlanApproval = args.requirePlanApproval;
      }

      return await julesRequest("/sessions", "POST", body);
    }

    case "jules_approve_plan": {
      const sessionId = args.sessionId as string;
      return await julesRequest(`/sessions/${sessionId}:approvePlan`, "POST", {});
    }

    case "jules_send_message": {
      const sessionId = args.sessionId as string;
      return await julesRequest(`/sessions/${sessionId}:sendMessage`, "POST", {
        prompt: args.prompt,
      });
    }

    // Activities
    case "jules_list_activities": {
      const sessionId = args.sessionId as string;
      const params = new URLSearchParams();
      if (args.pageSize) params.set("pageSize", String(args.pageSize));
      if (args.pageToken) params.set("pageToken", String(args.pageToken));
      const query = params.toString() ? `?${params.toString()}` : "";
      return await julesRequest(`/sessions/${sessionId}/activities${query}`);
    }

    case "jules_get_activity": {
      const sessionId = args.sessionId as string;
      const activityId = args.activityId as string;
      return await julesRequest(`/sessions/${sessionId}/activities/${activityId}`);
    }

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

// Create and start the server
const server = new Server(
  {
    name: "google-jules-mcp",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Register handlers
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    const result = await handleToolCall(name, args as Record<string, unknown>);
    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      content: [
        {
          type: "text" as const,
          text: `Error: ${errorMessage}`,
        },
      ],
      isError: true,
    };
  }
});

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Google Jules MCP server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
