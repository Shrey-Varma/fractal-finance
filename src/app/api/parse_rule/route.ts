import { NextRequest, NextResponse } from "next/server";
import { parseRuleText } from "@/utils/gptParser";
import { validateRule } from "@/utils/validator";

export async function POST(req: NextRequest) {
  const { text } = await req.json();

  if (!text) {
    return NextResponse.json({ error: "Missing input text" }, { status: 400 });
  }

  try {
    const rule = await parseRuleText(text);
    const valid = validateRule(rule);

    if (!valid.success) {
      return NextResponse.json({ error: valid.message }, { status: 422 });
    }

    return NextResponse.json({ success: true, rule });

  } catch (err: any) {
    return NextResponse.json({ error: `Parsing error: ${err.message}` }, { status: 500 });
  }
}
