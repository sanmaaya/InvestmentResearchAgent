import { NextResponse } from "next/server";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { ChatOpenAI } from "@langchain/openai";

export async function POST(req: Request) {
  try {
    const { messages, companyContext, provider, apiKey } = await req.json();

    if (!companyContext || !messages) {
      return NextResponse.json({ error: "Missing messages or companyContext" }, { status: 400 });
    }

    const targetProvider = provider || "gemini";
    const key = apiKey || (targetProvider === "gemini" ? process.env.GEMINI_API_KEY : process.env.OPENAI_API_KEY);
    const activeKey = key || "DEMO_KEY";

    let model;
    if (targetProvider === "gemini") {
      model = new ChatGoogleGenerativeAI({
        apiKey: activeKey,
        model: "gemini-1.5-flash",
        temperature: 0.7,
      });
    } else {
      model = new ChatOpenAI({
        apiKey: activeKey,
        modelName: "gpt-4o-mini",
        temperature: 0.7,
      });
    }

    const systemPrompt = `You are a Senior Investment Research Assistant. You are chatting about the target company: ${companyContext.companyName} (${companyContext.ticker}).
Here is the computed agent data context:
- Profile: ${JSON.stringify(companyContext.profile)}
- Financials: ${JSON.stringify(companyContext.financials)}
- Recommendation: ${JSON.stringify(companyContext.recommendation)}
- SWOT & Risks: ${JSON.stringify(companyContext.risks)}
- Moat Metrics: ${JSON.stringify(companyContext.moat)}
- Investment Scores: ${JSON.stringify(companyContext.scores)}
- Valuation: ${JSON.stringify(companyContext.valuationAnalysis)}

Please reply to the user's questions clearly, professionally, and concisely using the provided context. If they ask for comparisons or scenarios, provide expert-level financial analysis.`;

    const formattedMessages = [
      { role: "system", content: systemPrompt },
      ...messages.map((m: any) => ({
        role: m.role === "user" ? "user" : "assistant",
        content: m.content
      }))
    ];

    const response = await model.invoke(formattedMessages);
    return NextResponse.json({ content: response.content });
  } catch (error) {
    console.error("Chat API route error:", error);
    return NextResponse.json({ error: (error as Error).message || "An error occurred during chat reasoning." }, { status: 500 });
  }
}
