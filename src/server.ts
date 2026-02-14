import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import express, { Request, Response } from "express";
import cors from "cors";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { z } from "zod";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ============================================
// Types
// ============================================

interface CapturedElement {
  tagName: string;
  id: string;
  className: string;
  selector: string;
  outerHTML: string;
  innerText: string;
  computedStyles: Record<string, string>;
  boundingRect: {
    top: number;
    left: number;
    width: number;
    height: number;
  };
  url: string;
  title?: string;
  timestamp: number;
  // Enriched data
  accessibility?: Record<string, string>;
  dataAttributes?: Record<string, string>;
  headingContext?: { tag: string; text: string };
  reactComponents?: string[];
}

interface CapturedTask {
  element: CapturedElement;
  instruction: string;
  timestamp: number;
  status: "pending" | "done";
}

// ============================================
// Storage (in-memory)
// ============================================

const storage = {
  elements: [] as CapturedElement[],
  tasks: [] as CapturedTask[],
  consoleErrors: [] as { message: string; timestamp: number }[],
};

// ============================================
// HTTP Server (receives data from browser)
// ============================================

const PORT = process.env.BROWSER_BRIDGE_PORT || 3456;
const app = express();

app.use(cors());
app.use(express.json({ limit: "1mb" }));

// Serve install page at root
app.get("/", (_req: Request, res: Response) => {
  try {
    const possiblePaths = [
      join(__dirname, "..", "bookmarklet", "install.html"),
      join(__dirname, "..", "..", "bookmarklet", "install.html"),
    ];

    for (const p of possiblePaths) {
      try {
        const html = readFileSync(p, "utf-8");
        res.type("text/html").send(html);
        return;
      } catch {
        continue;
      }
    }

    res.status(404).send("install.html not found");
  } catch (e) {
    res.status(500).send("Error loading install.html");
  }
});

// Health check
app.get("/health", (_req: Request, res: Response) => {
  res.json({
    status: "ok",
    captures: storage.elements.length,
    tasks: storage.tasks.length,
    pendingTasks: storage.tasks.filter(t => t.status === "pending").length
  });
});

// Stats endpoint (for extension popup)
app.get("/stats", (_req: Request, res: Response) => {
  res.json({
    captures: storage.elements.length,
    tasks: storage.tasks.length,
    pendingTasks: storage.tasks.filter(t => t.status === "pending").length
  });
});

// Debug: view all tasks (temporary endpoint for testing)
app.get("/tasks", (_req: Request, res: Response) => {
  res.json(storage.tasks);
});

// Serve the inject.js file (for loader bookmarklet)
app.get("/inject.js", (_req: Request, res: Response) => {
  try {
    // In dev, serve from bookmarklet folder; in dist, go up one level
    const possiblePaths = [
      join(__dirname, "..", "bookmarklet", "inject.js"),
      join(__dirname, "..", "..", "bookmarklet", "inject.js"),
    ];

    for (const p of possiblePaths) {
      try {
        const code = readFileSync(p, "utf-8");
        res.type("application/javascript").send(code);
        return;
      } catch {
        continue;
      }
    }

    res.status(404).send("inject.js not found");
  } catch (e) {
    res.status(500).send("Error loading inject.js");
  }
});

// Capture an element (Stage 1)
app.post("/capture/element", (req: Request, res: Response) => {
  const element: CapturedElement = {
    ...req.body,
    timestamp: Date.now(),
  };
  storage.elements.push(element);

  // Keep last 50 elements
  if (storage.elements.length > 50) {
    storage.elements.shift();
  }

  console.error(`[browser-bridge] Captured: ${element.tagName}${element.id ? '#' + element.id : ''}${element.className ? '.' + element.className.split(' ')[0] : ''}`);
  res.json({ ok: true, index: storage.elements.length - 1 });
});

// Webhook notification to OpenClaw
async function notifyOpenClaw(task: CapturedTask) {
  const webhookUrl = process.env.LOOPIN_WEBHOOK_URL || "http://127.0.0.1:18789/api/wake";
  try {
    const el = task.element;
    const summary = `LoopIn capture: <${el.tagName}> "${el.innerText?.slice(0, 50)}" on ${el.url} — Instruction: "${task.instruction}"`;
    await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: summary, mode: "now" }),
    });
    console.error(`[browser-bridge] Notified OpenClaw`);
  } catch (e) {
    console.error(`[browser-bridge] Webhook failed (non-critical):`, (e as Error).message);
  }
}

// Capture a task with instruction (Stage 2)
app.post("/capture/task", (req: Request, res: Response) => {
  const task: CapturedTask = {
    element: req.body.element,
    instruction: req.body.instruction,
    timestamp: Date.now(),
    status: "pending",
  };
  storage.tasks.push(task);

  console.error(`[browser-bridge] Task: "${task.instruction}" on ${task.element.tagName}`);
  res.json({ ok: true, index: storage.tasks.length - 1 });

  // Notify OpenClaw asynchronously (don't block the response)
  if (task.instruction) {
    notifyOpenClaw(task).catch(() => {});
  }
});

// Capture console errors (Stage 3)
app.post("/capture/console", (req: Request, res: Response) => {
  const errors = req.body.errors || [];
  storage.consoleErrors.push(...errors);

  // Keep last 100 errors
  while (storage.consoleErrors.length > 100) {
    storage.consoleErrors.shift();
  }

  res.json({ ok: true });
});

// Start HTTP server
app.listen(PORT, () => {
  console.error(`[browser-bridge] HTTP server listening on port ${PORT}`);
});

// ============================================
// MCP Server (Claude Code connects here)
// ============================================

const server = new McpServer({
  name: "browser-bridge",
  version: "1.0.0",
});

// Tool: Get the most recently captured element
server.tool(
  "get_captured_element",
  "Get the most recently captured DOM element from the browser",
  {},
  async () => {
    const latest = storage.elements[storage.elements.length - 1];

    if (!latest) {
      return {
        content: [{
          type: "text",
          text: "No elements captured yet. Use the bookmarklet to capture an element.",
        }],
      };
    }

    return {
      content: [{
        type: "text",
        text: JSON.stringify(latest, null, 2),
      }],
    };
  }
);

// Tool: List all captured elements
server.tool(
  "list_captures",
  "List all captured elements from the browser",
  {},
  async () => {
    if (storage.elements.length === 0) {
      return {
        content: [{
          type: "text",
          text: "No elements captured yet.",
        }],
      };
    }

    const summary = storage.elements.map((el, i) => ({
      index: i,
      selector: el.selector,
      tagName: el.tagName,
      url: el.url,
      timestamp: new Date(el.timestamp).toISOString(),
    }));

    return {
      content: [{
        type: "text",
        text: JSON.stringify(summary, null, 2),
      }],
    };
  }
);

// Tool: Get a specific captured element by index
server.tool(
  "get_capture",
  "Get a specific captured element by index",
  {
    index: z.number().describe("The index of the capture to retrieve"),
  },
  async ({ index }) => {
    const element = storage.elements[index];

    if (!element) {
      return {
        content: [{
          type: "text",
          text: `No capture at index ${index}. Total captures: ${storage.elements.length}`,
        }],
      };
    }

    return {
      content: [{
        type: "text",
        text: JSON.stringify(element, null, 2),
      }],
    };
  }
);

// Tool: Clear all captures
server.tool(
  "clear_captures",
  "Clear all captured elements and tasks",
  {},
  async () => {
    const count = storage.elements.length + storage.tasks.length;
    storage.elements = [];
    storage.tasks = [];
    storage.consoleErrors = [];

    return {
      content: [{
        type: "text",
        text: `Cleared ${count} captures.`,
      }],
    };
  }
);

// Tool: Get pending tasks (Stage 2)
server.tool(
  "get_pending_tasks",
  "Get tasks with instructions from the browser that need action",
  {},
  async () => {
    const pending = storage.tasks.filter((t) => t.status === "pending");

    if (pending.length === 0) {
      return {
        content: [{
          type: "text",
          text: "No pending tasks. Capture an element and add an instruction using the bookmarklet.",
        }],
      };
    }

    const tasksWithIndex = pending.map((task, i) => ({
      index: storage.tasks.indexOf(task),
      instruction: task.instruction,
      element: {
        selector: task.element.selector,
        tagName: task.element.tagName,
        outerHTML: task.element.outerHTML,
        computedStyles: task.element.computedStyles,
        url: task.element.url,
      },
      timestamp: new Date(task.timestamp).toISOString(),
    }));

    return {
      content: [{
        type: "text",
        text: JSON.stringify(tasksWithIndex, null, 2),
      }],
    };
  }
);

// Tool: Mark a task as done
server.tool(
  "mark_task_done",
  "Mark a task as completed",
  {
    index: z.number().describe("The index of the task to mark as done"),
  },
  async ({ index }) => {
    const task = storage.tasks[index];

    if (!task) {
      return {
        content: [{
          type: "text",
          text: `No task at index ${index}.`,
        }],
      };
    }

    task.status = "done";

    return {
      content: [{
        type: "text",
        text: `Marked task ${index} as done: "${task.instruction}"`,
      }],
    };
  }
);

// Tool: Get console errors (Stage 3)
server.tool(
  "get_console_errors",
  "Get recent console errors captured from the browser",
  {},
  async () => {
    if (storage.consoleErrors.length === 0) {
      return {
        content: [{
          type: "text",
          text: "No console errors captured.",
        }],
      };
    }

    return {
      content: [{
        type: "text",
        text: JSON.stringify(storage.consoleErrors, null, 2),
      }],
    };
  }
);

// Start MCP server on stdio
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("[browser-bridge] MCP server connected via stdio");
}

main().catch((error) => {
  console.error("[browser-bridge] Fatal error:", error);
  process.exit(1);
});
