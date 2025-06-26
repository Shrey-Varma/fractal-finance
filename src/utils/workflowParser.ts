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
  modelName: "gpt-4o",
  openAIApiKey: process.env.OPENAI_API_KEY
});

export async function parseWorkflowText(text: string, userReprompt?: string, currentWorkflow?: any, availableAccounts?: string[]) {
  const { triggerTypes, conditionTypes, actionTypes } = loadWorkflowSchemaDetails();
  
  // Get current date information for relative date processing
  const now = new Date();
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  
  // Helper function to format date as YYYY-MM-DD
  const formatDate = (date: Date): string => {
    return date.toISOString().split('T')[0];
  };
  
  // Calculate common relative dates
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const nextSaturday = new Date(now);
  nextSaturday.setDate(now.getDate() + (6 - now.getDay() + 7) % 7 || 7); // Next Saturday
  const nextSunday = new Date(nextSaturday.getTime() + 24 * 60 * 60 * 1000); // Day after Saturday
  
  // This week's Monday and Sunday
  const thisWeekMonday = new Date(now);
  thisWeekMonday.setDate(now.getDate() - now.getDay() + 1);
  const thisWeekSunday = new Date(thisWeekMonday);
  thisWeekSunday.setDate(thisWeekMonday.getDate() + 6);
  
  // Next week's Monday and Sunday
  const nextWeekMonday = new Date(thisWeekMonday);
  nextWeekMonday.setDate(thisWeekMonday.getDate() + 7);
  const nextWeekSunday = new Date(nextWeekMonday);
  nextWeekSunday.setDate(nextWeekMonday.getDate() + 6);
  
  // This month's first and last day
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const thisMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0); // Last day of current month
  
  const currentDateInfo = {
    date: formatDate(now),
    dayOfWeek: days[now.getDay()],
    fullDate: `${months[now.getMonth()]} ${now.getDate()}, ${now.getFullYear()}`,
    time: now.toTimeString().slice(0, 5), // HH:MM format
    tomorrow: formatDate(tomorrow),
    thisWeekend: {
      saturday: formatDate(nextSaturday),
      sunday: formatDate(nextSunday)
    },
    thisWeek: {
      monday: formatDate(thisWeekMonday),
      sunday: formatDate(thisWeekSunday)
    },
    nextWeek: {
      monday: formatDate(nextWeekMonday),
      sunday: formatDate(nextWeekSunday)
    },
    thisMonth: {
      start: formatDate(thisMonthStart),
      end: formatDate(thisMonthEnd)
    }
  };

  let basePrompt = `
You are a financial automation workflow assistant. Convert user input into a JSON workflow with interconnected nodes.

CURRENT DATE & TIME CONTEXT:
- Today is: ${currentDateInfo.fullDate} (${currentDateInfo.dayOfWeek})
- Current date: ${currentDateInfo.date}
- Current time: ${currentDateInfo.time}

RELATIVE DATE PROCESSING:
When users mention relative dates, calculate the actual dates based on today's information:
- "this weekend" = ${currentDateInfo.thisWeekend.saturday} to ${currentDateInfo.thisWeekend.sunday}
- "next week" = ${currentDateInfo.nextWeek.monday} to ${currentDateInfo.nextWeek.sunday}
- "this week" = ${currentDateInfo.thisWeek.monday} to ${currentDateInfo.thisWeek.sunday}
- "this month" = ${currentDateInfo.thisMonth.start} to ${currentDateInfo.thisMonth.end}
- "tomorrow" = ${currentDateInfo.tomorrow}
- "today" = ${currentDateInfo.date}
- "next saturday" = ${currentDateInfo.thisWeekend.saturday}
- "next sunday" = ${currentDateInfo.thisWeekend.sunday}
- Always calculate specific dates (YYYY-MM-DD format) from relative terms
- For time ranges, use the calculated start and end dates in timeWindow objects

DEFAULT DATE BEHAVIOR:
- If no specific tracking dates are mentioned, use "now" for tracking_start_date and "indefinite" for tracking_end_date
- For timeWindow start/end, use specific calculated dates if relative terms are used

${availableAccounts && availableAccounts.length > 0 ? 
  `AVAILABLE USER ACCOUNTS: ${availableAccounts.join(', ')}
  
  ACCOUNT SELECTION RULES:
  - When specifying account names, you MUST use one of these exact account names: ${availableAccounts.join(', ')}
  - Choose the closest matching account name for the user's request
  - Common patterns to look for:
    * "checking", "chequing", "main account" → usually the primary checking account
    * "savings", "savings account" → usually a savings account
    * "credit card", "visa", "mastercard" → credit card accounts
    * "TFSA", "RRSP", "retirement" → investment/retirement accounts
    * "vacation fund", "emergency fund", "travel fund" → specific savings goals
    * "paycheck", "income", "salary" → usually the account where income is deposited
  - If you cannot determine which account the user means, leave the account field blank ("")
  - For transfers, if only one account is mentioned, assume it's the destination (toAccount) and leave fromAccount blank
  - If no accounts are mentioned, leave both fromAccount and toAccount blank
  - NEVER make up account names that aren't in the available list` : 
  'AVAILABLE USER ACCOUNTS: None found - leave all account fields blank ("")'
}

${currentWorkflow ? 
  `CURRENT WORKFLOW CONTEXT:
  ${JSON.stringify(currentWorkflow, null, 2)}
  
  You are modifying an existing workflow. Update it based on the user's new request while keeping relevant existing parts.` : 
  ''
}

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
        "tracking_start_date": "YYYY-MM-DD format OR 'now' (default: 'now')",
        "tracking_end_date": "YYYY-MM-DD format OR 'indefinite' (default: 'indefinite')",
        "schedule": {
          "frequency": "daily|weekly|monthly|once",
          "dayOfWeek": "Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday|Any",
          "time": "HH:MM",
          "date": "YYYY-MM-DD (required for once frequency)"
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
        "tracking_start_date": "YYYY-MM-DD format OR 'now' (default: 'now')",
        "tracking_end_date": "YYYY-MM-DD format OR 'indefinite' (default: 'indefinite')",
        "timeWindow": {
          "start": "YYYY-MM-DD format for specific date ranges",
          "end": "YYYY-MM-DD format for specific date ranges"
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
        "tracking_start_date": "YYYY-MM-DD format OR 'now' (default: 'now')",
        "tracking_end_date": "YYYY-MM-DD format OR 'indefinite' (default: 'indefinite')"
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
- account: Leave blank ("") if no specific account is mentioned in the user's request

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
- account: Leave blank ("") if no specific account is mentioned in the user's request

ACTION NODES (${JSON.stringify(actionTypes)}):
- transfer: Move money between accounts
  REQUIRED: fromAccount, toAccount (leave blank if unclear)
  AMOUNT TYPE: Choose between:
    - amount: Fixed dollar amount (e.g., $50, $100, $25.50)
    - percentage: Percentage of balance/amount (e.g., 10%, 25%, 5%)
  IMPORTANT: Use 'amount' for fixed dollar amounts, 'percentage' for percentage-based transfers
  EXAMPLES:
    - "transfer $50" → use amount: 50
    - "transfer 10%" → use percentage: 10
    - "transfer $100 to savings" → use amount: 100
    - "transfer 25% of balance" → use percentage: 25
    - "move $75" → use amount: 75
    - "save 15%" → use percentage: 15
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
- Trigger: Scheduled (every Tuesday) - REQUIRES schedule object, tracking_start_date: "now", tracking_end_date: "indefinite"
- Condition 1: Balance check (< $500) - REQUIRES amount and operator, account: "" (leave blank if no specific account mentioned), tracking_start_date: "now", tracking_end_date: "indefinite"
- Condition 2: Spending threshold (> $50 on Amazon) - REQUIRES amount, operator, and merchant, account: "" (leave blank if no specific account mentioned), tracking_start_date: "now", tracking_end_date: "indefinite"
- Action 1: Notify ("cut down on spending") - REQUIRES message, tracking_start_date: "now", tracking_end_date: "indefinite"
- Action 2: Transfer ($10 to savings) - REQUIRES fromAccount: "" (leave blank), toAccount: "savings account name", and amount: 10 (NOT percentage), tracking_start_date: "now", tracking_end_date: "indefinite"

Input: "Check my spending on amazon this weekend and if it's over $100, transfer 10% of my balance to savings"

Should create:
- Trigger: New transaction - account: "" (leave blank), tracking_start_date: "${currentDateInfo.thisWeekend.saturday}", tracking_end_date: "${currentDateInfo.thisWeekend.sunday}"
- Condition: Spending threshold (> $100 on Amazon) with account: "" (leave blank), timeWindow: {"start": "${currentDateInfo.thisWeekend.saturday}", "end": "${currentDateInfo.thisWeekend.sunday}"}
- Action: Transfer (10% to savings) - REQUIRES fromAccount: "" (leave blank), toAccount: "savings account name", and percentage: 10 (NOT amount), tracking_start_date: "${currentDateInfo.thisWeekend.saturday}", tracking_end_date: "${currentDateInfo.thisWeekend.sunday}"

Input: "On December 25th, if my balance is over $1000, transfer $100 to savings"

Should create:
- Trigger: Scheduled (once on December 25th) - REQUIRES schedule object with frequency: "once" and date: "2024-12-25", account: "" (leave blank), tracking_start_date: "2024-12-25", tracking_end_date: "2024-12-25"
- Condition: Balance check (> $1000) - REQUIRES amount and operator, account: "" (leave blank), tracking_start_date: "2024-12-25", tracking_end_date: "2024-12-25"
- Action: Transfer ($100 to savings) - REQUIRES fromAccount: "" (leave blank), toAccount: "savings account name", and amount: 100 (NOT percentage), tracking_start_date: "2024-12-25", tracking_end_date: "2024-12-25"

Input: "When I receive income, automatically save 20% of it"

Should create:
- Trigger: Income received - account: "" (leave blank), tracking_start_date: "now", tracking_end_date: "indefinite"
- Action: Transfer (20% to savings) - REQUIRES fromAccount: "" (leave blank), toAccount: "savings account name", and percentage: 20 (NOT amount), tracking_start_date: "now", tracking_end_date: "indefinite"

Input: "Every Friday, transfer $50 to my vacation fund"

Should create:
- Trigger: Scheduled (every Friday) - REQUIRES schedule object with frequency: "weekly" and dayOfWeek: "Friday", account: "" (leave blank), tracking_start_date: "now", tracking_end_date: "indefinite"
- Action: Transfer ($50 to vacation fund) - REQUIRES fromAccount: "" (leave blank), toAccount: "vacation fund account name", and amount: 50 (NOT percentage), tracking_start_date: "now", tracking_end_date: "indefinite"

Input: "Transfer $100 from my checking to my credit card"

Should create:
- Trigger: New transaction - account: "" (leave blank), tracking_start_date: "now", tracking_end_date: "indefinite"
- Action: Transfer ($100) - REQUIRES fromAccount: "checking account name", toAccount: "credit card account name", and amount: 100 (NOT percentage), tracking_start_date: "now", tracking_end_date: "indefinite"

Input: "If I spend more than $200 on restaurants this month, notify me"

Should create:
- Trigger: New transaction - account: "" (leave blank), tracking_start_date: "${currentDateInfo.thisMonth.start}", tracking_end_date: "${currentDateInfo.thisMonth.end}"
- Condition: Spending threshold (> $200) with category: "restaurants", account: "" (leave blank), tracking_start_date: "${currentDateInfo.thisMonth.start}", tracking_end_date: "${currentDateInfo.thisMonth.end}"
- Action: Notify - REQUIRES message: "You've spent more than $200 on restaurants this month", tracking_start_date: "${currentDateInfo.thisMonth.start}", tracking_end_date: "${currentDateInfo.thisMonth.end}"

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