import { ChatOpenAI } from "@langchain/openai";
import { RunnableSequence } from "@langchain/core/runnables";
import { JsonOutputParser } from "@langchain/core/output_parsers";
import fs from "fs";
import path from "path";
import { validateRule } from "./validator";

// Load schema field enums and parameters
function loadSchemaDetails() {
  const schemaPath = path.resolve("src/schemas/rules_schema.json");
  const schema = JSON.parse(fs.readFileSync(schemaPath, "utf-8"));

  const triggerTypes = schema.properties.trigger.properties.type.enum;
  const actionTypes = schema.properties.action.properties.type.enum;

  const triggerFields = Object.keys(schema.properties.trigger.properties).filter(k => k !== "type");
  const criteriaFields = Object.keys(schema.properties.criteria?.properties || {});
  const actionFields = Object.keys(schema.properties.action.properties).filter(k => k !== "type");

  return {
    triggerTypes,
    triggerFields,
    criteriaFields,
    actionTypes,
    actionFields
  };
}

// LangChain Setup
const parser = new JsonOutputParser();

const model = new ChatOpenAI({
  temperature: 0.0,
  modelName: "gpt-4",
  openAIApiKey: process.env.OPENAI_API_KEY
});

// Parsing function with re-prompting
export async function parseRuleText(text: string, userReprompt?: string) {
  const {
    triggerTypes,
    triggerFields,
    criteriaFields,
    actionTypes,
    actionFields
  } = loadSchemaDetails();

  const basePrompt = `
You are a financial automation assistant. Convert user input into a JSON rule that matches this structure:

{
  "trigger": {
    "type": "...",
    "account": "Any | All | <SpecificAccount>"
  },
  "criteria": {
    "category": optional,
    "merchant": optional,
    "amount_greater_than": optional,
    "amount_less_than": optional,
    "tracking_start_date": "e.g., now, last sunday, tomorrow",
    "tracking_end_date": "e.g., until trigger, next sunday, after 10 days"
  },
  "action": {
    "type": "...",
    "from_account": "Any | All | <SpecificAccount>" (required for transfer),
    "to_account": "Any | All | <SpecificAccount>" (required for transfer),
    "dollar_amount": optional,
    "percent_amount": optional,
    "message": optional,
    "frequency": optional {
      "day_of_week": optional (must be one of: Monday, Tuesday, Wednesday, Thursday, Friday, Saturday, Sunday, Any)
    }
  }
}

Use ONLY the following values and fields:

Triggers: ${JSON.stringify(triggerTypes)}
- Use "new_transaction" for transaction-based triggers
- Use "income_received" for income-based triggers  
- Use "balance_threshold" for balance-based triggers
- Use "scheduled" for time-based triggers that have NO money amounts mentioned, e.g. "every monday", "weekly", "daily", etc.

Trigger fields: ${JSON.stringify(triggerFields)}

Criteria fields: ${JSON.stringify(criteriaFields)}
- 'tracking_start_date' and 'tracking_end_date' are optional fields that define the tracking period. When the user specifies a time range like "this weekend" or "last month", populate these fields with appropriate values (e.g., "saturday" and "sunday" for "this weekend").
- If 'trigger.type' is 'balance_threshold', 'criteria' MUST include either 'amount_greater_than' or 'amount_less_than'.

For the 'from_account' and 'to_account' fields, use either "Any", "All", or a specific account name.
- 'from_account' and 'to_account' are required for transfer, not for notify.
- For 'action.frequency.day_of_week', use only: Monday, Tuesday, Wednesday, Thursday, Friday, Saturday, Sunday, Any (if present).

Actions: ${JSON.stringify(actionTypes)}
Action fields: ${JSON.stringify(actionFields)}

- You MUST ONLY include fields that are necessary and provided to you. 
- Respond ONLY with a JSON object, no explanation or prefix
`;

  let attempts = 0;
  const maxAttempts = 3;
  let lastValidationError = "";

  while (attempts < maxAttempts) {
    let prompt = basePrompt;
    
    // Add user reprompt if provided
    if (userReprompt && attempts > 0) {
      prompt += `\n\nUSER CLARIFICATION: ${userReprompt}\n\nPlease incorporate this additional information into your response.`;
    }

    console.log(`--- Attempt ${attempts + 1} of ${maxAttempts} ---`);

    // We separate the parser from the chain to log the raw output
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

      // Now, we manually parse the output
      const rule = await parser.parse(rawOutput as string);
      const valid = validateRule(rule);

      if (valid.success) {
        return rule;
      }

      const missingPropertyMatch = (valid.message || "").match(
        /must have required property '(.+)'/
      );
      if (missingPropertyMatch && missingPropertyMatch[1]) {
        lastValidationError = `The previous output was invalid. It is missing the required field: "${missingPropertyMatch[1]}". Please add it.`;
      } else {
        lastValidationError = `The previous output was invalid. Error: ${
          valid.message || "Unknown error"
        }. Please generate a valid JSON object that follows the schema.`;
      }
    } catch (error: any) {
      lastValidationError = `The previous output was not valid JSON. Please provide a valid JSON object. Error: ${error.message}`;
    }

    attempts++;
  }

  throw new Error(
    `Failed to generate a valid rule after ${maxAttempts} attempts. Last error: ${lastValidationError}`
  );
} 