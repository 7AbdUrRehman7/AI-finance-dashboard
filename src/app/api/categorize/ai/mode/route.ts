export const runtime = "nodejs";

export async function GET() {
  const mock = process.env.AI_MOCK === "1" || process.env.AI_DEMO === "1";
  const hasKey = !!process.env.OPENAI_API_KEY;
  const mode = mock ? "mock" : hasKey ? "openai" : "no-key";
  return Response.json({ mode });
}

