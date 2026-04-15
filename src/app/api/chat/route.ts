import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextRequest, NextResponse } from "next/server";
import { rateLimit, getIP } from "@/lib/rate-limit";

const MAX_MESSAGE_LENGTH = 2000;
const MAX_HISTORY_LENGTH = 20;

const SYSTEM_PROMPT = `You are Amanah Assistant, an expert AI on halal compliance for Malaysian food manufacturers and SMEs.

Your knowledge covers:
- JAKIM halal certification process and requirements
- Halal status of food additives and E-numbers
- Islamic dietary laws (fiqh al-at'ima)
- Malaysian halal regulations and standards (MS 1500, MS 2200)
- Supply chain halal integrity
- Common haram and doubtful (syubhah) ingredients

Rules:
- Answer ONLY halal/Islamic compliance questions. Politely decline anything else.
- Always cite JAKIM or relevant Islamic authority when giving rulings.
- If uncertain, say "doubtful (syubhah)" and recommend seeking a qualified scholar.
- Keep responses concise — 2-4 short paragraphs max.
- Respond in the same language as the user (Bahasa Malaysia or English).
- Do not give medical, legal, or financial advice.`;

export async function POST(req: NextRequest) {
  // Rate limit: 30 messages per minute per IP
  const rl = rateLimit(getIP(req), { limit: 30, windowMs: 60_000 });
  if (!rl.allowed) {
    return NextResponse.json(
      { text: "You're sending messages too quickly. Please wait a moment." },
      { status: 429 }
    );
  }

  try {
    const body = await req.json().catch(() => null);
    const messages = body?.messages;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: "No messages provided" }, { status: 400 });
    }

    // Sanitize input
    const safeMessages = (messages as { role: string; text: string }[])
      .slice(-MAX_HISTORY_LENGTH)
      .filter((m) => m.role === "user" || m.role === "model")
      .map((m) => ({ role: m.role as "user" | "model", text: String(m.text).slice(0, MAX_MESSAGE_LENGTH) }));

    if (safeMessages.length === 0) {
      return NextResponse.json({ error: "Invalid messages" }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "AI service not configured" }, { status: 500 });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash-lite",
      systemInstruction: SYSTEM_PROMPT,
    });

    // Build chat history (all but the last message)
    const history = safeMessages.slice(0, -1).map((m) => ({
      role: m.role,
      parts: [{ text: m.text }],
    }));

    const chat = model.startChat({ history });
    const lastMessage = safeMessages[safeMessages.length - 1];
    const result = await chat.sendMessage(lastMessage.text);
    const text = result.response.text();

    return NextResponse.json({ text });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    const isQuota = msg.includes("429") || msg.includes("quota") || msg.includes("limit");
    if (isQuota) {
      return NextResponse.json({
        text: "I'm currently at capacity. Please try again in a moment, or visit our blog for halal compliance guides.",
      });
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
