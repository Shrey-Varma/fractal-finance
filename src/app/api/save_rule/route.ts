import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { validateRule } from "@/utils/validator";
import { saveRuleToDB } from "@/utils/dbClient";

export async function POST(req: NextRequest) {
  const { user_id, rule } = await req.json();

  if (!user_id || !rule) {
    return NextResponse.json({ error: "Missing user_id or rule" }, { status: 400 });
  }

  const valid = validateRule(rule);
  if (!valid.success) {
    return NextResponse.json({ error: valid.message }, { status: 422 });
  }

  try {
    const rule_id = uuidv4();
    await saveRuleToDB(user_id, rule_id, rule);
    return NextResponse.json({ success: true, rule_id });
  } catch (err: any) {
    return NextResponse.json({ error: `DB error: ${err.message}` }, { status: 500 });
  }
}
