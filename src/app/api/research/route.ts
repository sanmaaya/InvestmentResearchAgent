import { NextResponse } from "next/server";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { ChatOpenAI } from "@langchain/openai";
import { createAgent } from "@/lib/agent/graph";

export async function POST(req: Request) {
  try {
    const { companyName, provider, apiKey, tavilyKey, serpApiKey } = await req.json();

    if (!companyName) {
      return NextResponse.json({ error: "Company name is required" }, { status: 400 });
    }

    const targetProvider = provider || "gemini";
    let model;

    if (targetProvider === "gemini") {
      const key = apiKey || process.env.GEMINI_API_KEY;
      if (!key) {
        return NextResponse.json(
          { error: "Gemini API key is missing. Please provide it in the UI configuration or set GEMINI_API_KEY in the workspace environment." },
          { status: 400 }
        );
      }
      model = new ChatGoogleGenerativeAI({
        apiKey: key,
        model: "gemini-1.5-flash",
        temperature: 0.1,
      });
    } else {
      const key = apiKey || process.env.OPENAI_API_KEY;
      if (!key) {
        return NextResponse.json(
          { error: "OpenAI API key is missing. Please provide it in the UI configuration or set OPENAI_API_KEY in the workspace environment." },
          { status: 400 }
        );
      }
      model = new ChatOpenAI({
        apiKey: key,
        modelName: "gpt-4o-mini",
        temperature: 0.1,
      });
    }

    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        const sendUpdate = (type: string, data: any) => {
          const payload = JSON.stringify({ type, data });
          controller.enqueue(encoder.encode(payload + "\n"));
        };

        try {
          sendUpdate("log", "Initializing Investment Research Agent graph...");
          
          const agent = createAgent(model, { tavilyKey, serpApiKey });
          
          // Run the graph and stream node updates
          const streamEvents = await agent.stream(
            { companyName, logs: [] },
            { streamMode: "updates" }
          );

          for await (const update of streamEvents) {
            const nodeNames = Object.keys(update);
            for (const nodeName of nodeNames) {
              const nodeOutput = (update as any)[nodeName];
              
              // Stream any logs outputted by the node
              if (nodeOutput.logs && Array.isArray(nodeOutput.logs)) {
                nodeOutput.logs.forEach((log: string) => {
                  sendUpdate("log", log);
                });
              }

              // Stream active node change
              if (nodeOutput.currentNode) {
                sendUpdate("node", nodeOutput.currentNode);
              }

              // Stream partial state data to fill UI in real-time
              if (nodeOutput.ticker) {
                sendUpdate("ticker", nodeOutput.ticker);
              }
              if (nodeOutput.profile) {
                sendUpdate("profile", nodeOutput.profile);
              }
              if (nodeOutput.financials) {
                sendUpdate("financials", nodeOutput.financials);
              }
              if (nodeOutput.chartData) {
                sendUpdate("chartData", nodeOutput.chartData);
              }
              if (nodeOutput.analysis) {
                sendUpdate("analysis", nodeOutput.analysis);
              }
              if (nodeOutput.risks) {
                sendUpdate("risks", nodeOutput.risks);
              }
              if (nodeOutput.recommendation) {
                sendUpdate("recommendation", nodeOutput.recommendation);
              }
            }
          }

          sendUpdate("done", "Research completed successfully.");
          controller.close();
        } catch (error) {
          console.error("Agent execution stream error:", error);
          sendUpdate("error", (error as Error).message || "An unexpected error occurred during execution.");
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "application/x-ndjson",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    });
  } catch (error) {
    console.error("API Route POST Error:", error);
    return NextResponse.json(
      { error: (error as Error).message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
