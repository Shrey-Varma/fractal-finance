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

    // If day_of_week is 'Any', replace it with the current day
    if (
      rule.action &&
      rule.action.frequency &&
      typeof rule.action.frequency === "object" &&
      rule.action.frequency.day_of_week === "Any"
    ) {
      const days = [
        "Sunday",
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday"
      ];
      const today = days[new Date().getDay()];
      rule.action.frequency.day_of_week = today;
    }

    const valid = validateRule(rule);

    if (!valid.success) {
      return NextResponse.json({ error: valid.message }, { status: 422 });
    }

    return NextResponse.json({ success: true, rule });

  } catch (err: any) {
    return NextResponse.json({ error: `Parsing error: ${err.message}` }, { status: 500 });
  }
}
