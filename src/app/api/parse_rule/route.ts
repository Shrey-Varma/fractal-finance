import { NextRequest, NextResponse } from "next/server";
import { parseRuleText } from "@/utils/gptParser";
import { validateRule } from "@/utils/validator";

export async function POST(req: NextRequest) {
  const { text, userReprompt } = await req.json();

  if (!text) {
    return NextResponse.json({ error: "Missing input text" }, { status: 400 });
  }

  console.log("--- API Route: Processing request ---");
  console.log("Input text:", text);
  if (userReprompt) {
    console.log("User reprompt:", userReprompt);
  }

  try {
    console.log("--- API Route: Calling parseRuleText ---");
    const rule = await parseRuleText(text, userReprompt);
    console.log("--- API Route: parseRuleText completed ---");
    console.log("Parsed rule:", JSON.stringify(rule, null, 2));

    // Apply default tracking dates if not provided
    if (rule.criteria) {
      if (!rule.criteria.tracking_start_date) {
        rule.criteria.tracking_start_date = "now";
      }
      if (!rule.criteria.tracking_end_date) {
        rule.criteria.tracking_end_date = "until trigger";
      }
    }

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
