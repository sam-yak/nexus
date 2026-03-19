import { NextRequest } from "next/server";
import { ResearchAgent } from "@/lib/research-agent";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(req: NextRequest) {
  const { query, conversationHistory, existingGraph } = await req.json();

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const emit = (event: { type: string; data: unknown }) => {
        const chunk = `data: ${JSON.stringify(event)}\n\n`;
        controller.enqueue(encoder.encode(chunk));
      };

      try {
        const agent = new ResearchAgent(emit, conversationHistory || []);
        await agent.research(query, existingGraph);
      } catch (error) {
        emit({
          type: "error",
          data: {
            message: error instanceof Error ? error.message : "Unknown error",
          },
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
