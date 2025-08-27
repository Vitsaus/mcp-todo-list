# MCP Todo

This workspace contains a simple todo app with:

- backend: NestJS server with in-memory tasks and an MCP controller that forwards prompts to OpenAI and creates tasks
- frontend: Vite + React UI

To run:

1. Install dependencies for backend and frontend
   cd backend && npm install
   cd ../frontend && npm install

2. Set OPENAI_API_KEY in backend/.env

3. Start backend: cd backend && npm run start:dev
4. Start frontend: cd frontend && npm run dev

The MCP endpoint is POST /mcp/create and expects { prompt } in the body.

# Usage:
In localhost:3000 you can control tasks with chat prompts.

Create task hello world
List tasks 1,2
Set task 1 as done

In Visual Studio Code chat/ai window you can call:

#mcp list tasks
#mcp create task hello world
#mcp set task 1 as done

and so on...