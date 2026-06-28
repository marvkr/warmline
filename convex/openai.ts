// OpenAI client helpers (plain functions, called from actions). Uses fetch —
// no SDK, no "use node". Needs OPENAI_API_KEY on the Convex deployment.

const EMBED_MODEL = "text-embedding-3-small"; // 1536 dims
const CHAT_MODEL = "gpt-4o-mini";

function apiKey(): string {
  const k = process.env.OPENAI_API_KEY;
  if (!k) throw new Error("OPENAI_API_KEY not set on the Convex deploy");
  return k;
}

export async function embed(text: string): Promise<number[]> {
  const res = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey()}`,
    },
    body: JSON.stringify({ model: EMBED_MODEL, input: text.slice(0, 8000) }),
  });
  if (!res.ok) throw new Error(`OpenAI embed ${res.status}: ${await res.text()}`);
  const data = (await res.json()) as { data: { embedding: number[] }[] };
  return data.data[0].embedding;
}

// Derive the ICP (who they sell to) from a scraped product site.
export async function deriveIcp(siteMarkdown: string): Promise<string> {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey()}`,
    },
    body: JSON.stringify({
      model: CHAT_MODEL,
      messages: [
        {
          role: "system",
          content:
            "From this company's website, write 1–2 sentences describing their ICP — the specific people they sell to (role, seniority, company type, domain). Be concrete. No preamble.",
        },
        { role: "user", content: siteMarkdown.slice(0, 6000) },
      ],
      temperature: 0.3,
    }),
  });
  if (!res.ok) throw new Error(`OpenAI ICP ${res.status}`);
  const data = (await res.json()) as {
    choices: { message: { content: string } }[];
  };
  return data.choices[0]?.message?.content?.trim() ?? "";
}

export type Judgement = {
  why: { text: string; confidence: "high" | "medium" | "low" }[];
  how: { channel: string; angle: string; opener: string };
};

// LLM-as-judge: 3 why bullets (fit vs ICP) + how (channel/angle/drafted opener),
// grounded in the provided facts. Draft only — never auto-sent.
export async function judge(input: {
  icpText: string;
  person: { name: string; headline?: string; company?: string };
  bridge?: string; // the connector + evidence, if any
  voice?: string; // the user's tone hint
}): Promise<Judgement> {
  const sys =
    "You are a growth-engineering assistant. Given an ICP and a person, output strict JSON " +
    '{"why":[{"text","confidence"}],"how":{"channel","angle","opener"}}. ' +
    "why = exactly 3 short bullets on why they fit the ICP, each confidence high|medium|low, grounded ONLY in the facts given. " +
    "how = the outreach: channel, a one-line angle, and a 1-2 sentence drafted opener that references something real. " +
    "Never invent facts. The opener is a draft, not sent.";
  const user = JSON.stringify(input);
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey()}`,
    },
    body: JSON.stringify({
      model: CHAT_MODEL,
      messages: [
        { role: "system", content: sys },
        { role: "user", content: user },
      ],
      response_format: { type: "json_object" },
      temperature: 0.4,
    }),
  });
  if (!res.ok) throw new Error(`OpenAI chat ${res.status}: ${await res.text()}`);
  const data = (await res.json()) as {
    choices: { message: { content: string } }[];
  };
  const parsed = JSON.parse(data.choices[0].message.content) as Judgement;
  // defensive shape
  return {
    why: Array.isArray(parsed.why) ? parsed.why.slice(0, 3) : [],
    how: parsed.how ?? { channel: "", angle: "", opener: "" },
  };
}
