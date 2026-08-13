"use server";

import Anthropic from "@anthropic-ai/sdk";
import { PDFParse } from "pdf-parse";
import { requireOwner } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

const MAX_SIZE = 20 * 1024 * 1024;

export interface ParsedInvoice {
  supplier: string | null;
  workAddress: string | null;
  amount: number | null;
  matchedProjectId: string | null;
  matchedProjectName: string | null;
  projects: { id: string; name: string }[];
}

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

export async function parseInvoicePdf(formData: FormData): Promise<ParsedInvoice> {
  await requireOwner();

  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("Factuur-uitlezen is nog niet ingesteld — er ontbreekt een ANTHROPIC_API_KEY in de omgevingsvariabelen.");
  }

  const file = formData.get("file");
  if (!(file instanceof File)) throw new Error("Geen bestand ontvangen.");
  if (file.type !== "application/pdf") throw new Error("Alleen PDF-bestanden worden ondersteund.");
  if (file.size > MAX_SIZE) throw new Error("Bestand is te groot (max 20MB).");

  const buffer = Buffer.from(await file.arrayBuffer());
  const parser = new PDFParse({ data: buffer });
  const { text } = await parser.getText();
  await parser.destroy();

  if (!text.trim()) {
    throw new Error("Kon geen tekst uit deze PDF halen — mogelijk een ingescande factuur zonder tekstlaag.");
  }

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const message = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 300,
    messages: [
      {
        role: "user",
        content: `Dit is de tekst van een factuur. Haal er drie dingen uit en antwoord ALLEEN met geldige JSON, verder niets:
{"supplier": "naam van de leverancier/afzender van de factuur, of null als onduidelijk", "work_address": "het werk- of projectadres dat op de factuur genoemd staat (bijvoorbeeld bij 'werkadres', 'leveradres' of 'project'), niet het factuuradres van de klant zelf — of null als er geen apart werkadres genoemd wordt", "amount": het totaalbedrag inclusief btw als getal met een punt als decimaalteken (bijvoorbeeld 450.50), of null als onduidelijk}

Factuurtekst:
"""
${text.slice(0, 6000)}
"""`,
      },
    ],
  });

  const block = message.content.find((b) => b.type === "text");
  const raw = block && block.type === "text" ? block.text : "{}";

  let parsed: { supplier?: string | null; work_address?: string | null; amount?: number | null } = {};
  try {
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    parsed = JSON.parse(jsonMatch ? jsonMatch[0] : raw);
  } catch {
    parsed = {};
  }

  const supabase = createClient();
  const { data: projectRows } = await supabase.from("projects").select("id,name,address").order("name");
  const projects = ((projectRows ?? []) as { id: string; name: string; address: string | null }[]).map((p) => ({
    id: p.id,
    name: p.name,
  }));

  let matchedProjectId: string | null = null;
  let matchedProjectName: string | null = null;
  const workAddress = parsed.work_address ?? null;
  if (workAddress) {
    const target = normalize(workAddress);
    for (const p of (projectRows ?? []) as { id: string; name: string; address: string | null }[]) {
      const addr = p.address ? normalize(p.address) : "";
      if (addr && target.length > 3 && (target.includes(addr) || addr.includes(target))) {
        matchedProjectId = p.id;
        matchedProjectName = p.name;
        break;
      }
    }
  }

  return {
    supplier: parsed.supplier ?? null,
    workAddress,
    amount: typeof parsed.amount === "number" ? parsed.amount : null,
    matchedProjectId,
    matchedProjectName,
    projects,
  };
}
