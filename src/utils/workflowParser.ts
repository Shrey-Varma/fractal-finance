import { ChatOpenAI } from "@langchain/openai";
import { RunnableSequence } from "@langchain/core/runnables";
import { JsonOutputParser } from "@langchain/core/output_parsers";
import { v4 as uuidv4 } from "uuid";
import fs from "fs";
import path from "path";
import { validateWorkflow } from "@/utils/workflowValidator";

// Load workflow schema details
function loadWorkflowSchemaDetails() {
  try {
    const schemaPath = path.resolve("src/schemas/workflow_schema.json");
    const schema = JSON.parse(fs.readFileSync(schemaPath, "utf-8"));
    
    // Extract enum values from the schema definitions with fallbacks
    const triggerTypes = schema.definitions?.triggerNode?.properties?.config?.properties?.triggerType?.enum || 
      ["scheduled", "new_transaction", "income_received", "balance_threshold"];
    
    const conditionTypes = schema.definitions?.conditionNode?.properties?.config?.properties?.conditionType?.enum || 
      ["spending_threshold", "balance_check", "merchant_filter", "category_filter", "amount_range"];
    
    const actionTypes = schema.definitions?.actionNode?.properties?.config?.properties?.actionType?.enum || 
      ["transfer", "notify", "set_reminder"];
    
    return {
      triggerTypes,
      conditionTypes,
      actionTypes
    };
  } catch (error) {
    console.error("Error loading workflow schema:", error);
    // Return default values if schema loading fails
    return {
      triggerTypes: ["scheduled", "new_transaction", "income_received", "balance_threshold"],
      conditionTypes: ["spending_threshold", "balance_check", "merchant_filter", "category_filter", "amount_range"],
      actionTypes: ["transfer", "notify", "set_reminder"]
    };
  }
}

// LangChain Setup
const parser = new JsonOutputParser();
const model = new ChatOpenAI({
  temperature: 0.0,
  modelName: "gpt-4",
  openAIApiKey: process.env.OPENAI_API_KEY
});

export async function parseWorkflowText(text: string, userReprompt?: string) {
  const { triggerTypes, conditionTypes, actionTypes } = loadWorkflowSchemaDetails();

  const basePrompt = `
You are a financial automation workflow assistant. Convert user input into a JSON workflow with interconnected nodes.

Create a workflow that matches this structure:

{
  "id": "unique-workflow-id",
  "name": "Descriptive workflow name",
  "description": "Brief description",
  "nodes": [
    {
      "id": "node-id-1",
      "type": "trigger",
      "name": "Node name",
      "config": {
        "triggerType": "scheduled|new_transaction|income_received|balance_threshold",
        "account": "account name",
        "tracking_start_date": "the day in natural language e.g., last sunday, tomorrow, July 25, 2025",
        "tracking_end_date": "the day in natural language e.g., next sunday, after 10 days, July 30, 2025",
        "schedule": {
          "frequency": "daily|weekly|monthly",
          "dayOfWeek": "Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday|Any",
          "time": "HH:MM"
        }
      }
    },
    {
      "id": "node-id-2", 
      "type": "condition",
      "name": "Condition name",
      "config": {
        "conditionType": "spending_threshold|balance_check|merchant_filter|category_filter|amount_range",
        "account": "account name",
        "merchant": "merchant name",
        "category": "category name",
        "amount": 50,
        "operator": "greater_than|less_than|equals|contains",
        "tracking_start_date": "the day in natural language e.g., last sunday, tomorrow, July 25, 2025",
        "tracking_end_date": "the day in natural language e.g., next sunday, after 10 days, July 30, 2025",
        "timeWindow": {
          "start": "start date",
          "end": "end date"
        }
      }
    },
    {
      "id": "node-id-3",
      "type": "action", 
      "name": "Action name",
      "config": {
        "actionType": "transfer|notify|set_reminder",
        "fromAccount": "from account",
        "toAccount": "to account", 
        "amount": 10,
        "message": "notification message",
        "tracking_start_date": "the day in natural language e.g., last sunday, tomorrow, July 25, 2025",
        "tracking_end_date": "the day in natural language e.g., next sunday, after 10 days, July 30, 2025"
      }
    }
  ],
  "connections": [
    {
      "from": "node-id-1",
      "to": "node-id-2", 
      "condition": "always"
    },
    {
      "from": "node-id-2",
      "to": "node-id-3",
      "condition": "if_true"
    }
  ]
}

Available node types and configurations:

TRIGGER NODES (${JSON.stringify(triggerTypes)}):
- scheduled: For time-based triggers (every Tuesday, weekly, daily)
  REQUIRED: schedule object with frequency and dayOfWeek/time
  - For weekly frequency: dayOfWeek can be "Any" (defaults to current day) or specific day
- new_transaction: When a new transaction occurs
- income_received: When income is deposited
- balance_threshold: When account balance crosses a threshold
  REQUIRED: threshold object with amount and operator

CONDITION NODES (${JSON.stringify(conditionTypes)}):
- spending_threshold: Check if spending exceeds amount in time window
  REQUIRED: amount, operator
- balance_check: Check current account balance
  REQUIRED: amount, operator
- merchant_filter: Filter by specific merchant
  REQUIRED: merchant
- category_filter: Filter by spending category
  REQUIRED: category
- amount_range: Check if amount is within range
  REQUIRED: amount, operator

ACTION NODES (${JSON.stringify(actionTypes)}):
- transfer: Move money between accounts
  REQUIRED: fromAccount, toAccount
- notify: Send notification message
  REQUIRED: message
- set_reminder: Set a reminder
  REQUIRED: message

TRACKING DATES:
- tracking_start_date: When to start tracking (default: "now")
- tracking_end_date: When to stop tracking (default: "indefinite/trigger")

CONNECTION CONDITIONS:
- always: Always execute next node
- if_true: Execute if condition is true
- if_false: Execute if condition is false

EXAMPLES:

Input: "Every Tuesday if my account balance is lower than 500$ and if I have spent more than 50$ on amazon, send me a message saying 'cut down on spending' and transfer 10$ to my savings account"

Should create:
- Trigger: Scheduled (every Tuesday) - REQUIRES schedule object
- Condition 1: Balance check (< $500) - REQUIRES amount and operator
- Condition 2: Spending threshold (> $50 on Amazon) - REQUIRES amount, operator, and merchant
- Action 1: Notify ("cut down on spending") - REQUIRES message
- Action 2: Transfer ($10 to savings) - REQUIRES fromAccount, toAccount, and amount

Respond ONLY with a valid JSON workflow object.
`;

  let attempts = 0;
  const maxAttempts = 3;
  let lastValidationError = "";

  while (attempts < maxAttempts) {
    let prompt = basePrompt;
    
    if (userReprompt && attempts > 0) {
      prompt += `\n\nUSER CLARIFICATION: ${userReprompt}\n\nPlease incorporate this additional information into your response.`;
    }
    
    if (attempts > 0 && lastValidationError) {
      prompt += `\n\nThe previous output was invalid: ${lastValidationError}\n\nPlease correct the workflow structure.`;
    }

    console.log(`--- Workflow Parsing Attempt ${attempts + 1} of ${maxAttempts} ---`);

    const chainWithoutParser = RunnableSequence.from([
      async ({ text }: { text: string }) => [
        { role: "system", content: prompt },
        { role: "user", content: text },
      ],
      model,
    ]);

    try {
      const llmResult = await chainWithoutParser.invoke({ text });
      const rawOutput = llmResult.content;

      console.log("--- Raw LLM Output ---");
      console.log(rawOutput);
      console.log("----------------------");

      const workflow = await parser.parse(rawOutput as string);
      
      // Ensure workflow has an ID
      if (!workflow.id) {
        workflow.id = uuidv4();
      }
      
      const valid = validateWorkflow(workflow);

      if (valid.success) {
        return workflow;
      }

      lastValidationError = valid.message || "Invalid workflow structure";
    } catch (error: any) {
      lastValidationError = `The previous output was not valid JSON. Error: ${error.message}`;
    }

    attempts++;
  }

  throw new Error(
    `Failed to generate a valid workflow after ${maxAttempts} attempts. Last error: ${lastValidationError}`
  );
} 