import { NextRequest, NextResponse } from "next/server";
import { parseWorkflowText } from "@/utils/workflowParser";
import { validateWorkflow } from "@/utils/workflowValidator";

export async function POST(req: NextRequest) {
  const { text, userReprompt } = await req.json();

  if (!text) {
    return NextResponse.json({ error: "Missing input text" }, { status: 400 });
  }

  console.log("--- Workflow API Route: Processing request ---");
  console.log("Input text:", text);
  if (userReprompt) {
    console.log("User reprompt:", userReprompt);
  }

  try {
    console.log("--- Workflow API Route: Calling parseWorkflowText ---");
    const workflow = await parseWorkflowText(text, userReprompt);
    console.log("--- Workflow API Route: parseWorkflowText completed ---");
    console.log("Parsed workflow:", JSON.stringify(workflow, null, 2));

    // Apply default tracking dates to each node if not provided
    workflow.nodes.forEach((node: any) => {
      if (node.config) {
        if (!node.config.tracking_start_date) {
          node.config.tracking_start_date = "now";
        }
        if (!node.config.tracking_end_date) {
          node.config.tracking_end_date = "indefinite";
        }
        
        // Handle default day of week for weekly schedules
        if (node.config.schedule && node.config.schedule.frequency === "weekly") {
          if (!node.config.schedule.dayOfWeek || node.config.schedule.dayOfWeek === "Any") {
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
            node.config.schedule.dayOfWeek = today;
            console.log(`--- Set default day of week to: ${today} ---`);
          }
        }
      }
    });

    const valid = validateWorkflow(workflow);

    if (!valid.success) {
      return NextResponse.json({ 
        error: valid.message, 
        missingFields: valid.missingFields,
        partialWorkflow: workflow 
      }, { status: 422 });
    }

    return NextResponse.json({ success: true, workflow });

  } catch (err: any) {
    return NextResponse.json({ error: `Workflow parsing error: ${err.message}` }, { status: 500 });
  }
} 