# Google Jules MCP Server

An MCP (Model Context Protocol) server that provides access to the [Google Jules API](https://developers.google.com/jules/api) - Google's AI-powered coding agent for automating software development tasks.

## Features

This MCP server exposes all Jules API capabilities:

### Sources
- **jules_list_sources** - List all connected GitHub repositories
- **jules_get_source** - Get details of a specific source

### Sessions
- **jules_list_sessions** - List all coding sessions
- **jules_get_session** - Get session details including state and outputs
- **jules_create_session** - Create a new coding task for Jules
- **jules_approve_plan** - Approve a plan in a session requiring approval
- **jules_send_message** - Send a message to Jules within a session

### Activities
- **jules_list_activities** - List all activities within a session
- **jules_get_activity** - Get details of a specific activity

## Installation

### Using npx (recommended)

```bash
npx google-jules-mcp
```

### Global installation

```bash
npm install -g google-jules-mcp
google-jules-mcp
```

## Configuration

### Environment Variable

Set your Google Jules API key:

```bash
export GOOGLE_JULES_API_KEY=your_api_key_here
```

### MCP Client Configuration

Add to your MCP client configuration (e.g., Claude Desktop):

```json
{
  "mcpServers": {
    "google-jules": {
      "command": "npx",
      "args": ["google-jules-mcp"],
      "env": {
        "GOOGLE_JULES_API_KEY": "your_api_key_here"
      }
    }
  }
}
```

## Usage Examples

### List available repositories

```
Use jules_list_sources to see all connected GitHub repositories.
```

### Create a coding session

```
Use jules_create_session with:
- prompt: "Fix the authentication bug in login.js"
- source: "sources/github/myorg/myrepo"
- startingBranch: "main"
- automationMode: "AUTO_CREATE_PR"
```

### Monitor session progress

```
Use jules_list_activities with the sessionId to see what Jules is doing.
```

### Interact with Jules

```
Use jules_send_message to ask Jules questions or provide feedback during a session.
```

## API Key

To get your Jules API key:
1. Go to [Jules Settings](https://jules.google.com/settings#api)
2. Create a new API key
3. Keep it secure - don't share or commit it to public repositories

## Prerequisites

- Node.js 18.0.0 or higher
- A Google Jules API key
- GitHub repositories connected to Jules (via the Jules web app)

## License

MIT

## Links

- [Jules API Documentation](https://developers.google.com/jules/api)
- [Jules Web App](https://jules.google.com)
- [MCP Protocol](https://modelcontextprotocol.io)
