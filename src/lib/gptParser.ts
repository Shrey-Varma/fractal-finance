import { ChatOpenAI } from "@langchain/openai";
import { RunnableSequence } from "@langchain/core/runnables";
import { JsonOutputParser } from "@langchain/core/output_parsers";
import fs from "fs";
import path from "path";
import { validateRule } from "@/lib/validator";

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
export async function parseRuleText(text: string) {
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
  "criteria": optional {
    "category": "...",
    "merchant": "...",
    "amount_greater_than": number,
    "amount_less_than": number,
    "tracking_duration": optional (e.g., 'past week', 'past month', 'last Saturday')
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
Trigger fields: ${JSON.stringify(triggerFields)}

For the 'from_account' and 'to_account' fields, use either "Any", "All", or a specific account name.
- 'from_account' and 'to_account' are required for transfer, not for notify.
- For 'action.frequency.day_of_week', use only: Monday, Tuesday, Wednesday, Thursday, Friday, Saturday, Sunday, Any (if present).
- For 'action.frequency.day_of_month', use a number from 1 to 31 (if present).
- For 'criteria.tracking_duration', use a string describing the duration or day to track (e.g., 'past week', 'past month', 'last Saturday').

Criteria fields: ${JSON.stringify(criteriaFields)}

Actions: ${JSON.stringify(actionTypes)}
Action fields: ${JSON.stringify(actionFields)}

- Only include fields that are necessary
- Respond ONLY with a JSON object, no explanation or prefix
`;

  let attempts = 0;
  const maxAttempts = 3;
  let lastValidationError = "";

  while (attempts < maxAttempts) {
    let prompt = basePrompt;
    if (attempts > 0 && lastValidationError) {
      prompt += `\n\nIMPORTANT: The previous output was missing required information. Please ensure the following information is present: ${lastValidationError}`;
    }

    const chain = RunnableSequence.from([
      async ({ text }: { text: string }) => [
        { role: "system", content: prompt },
        { role: "user", content: text }
      ],
      model,
      parser
    ]);

    const rule = await chain.invoke({ text });
    const valid = validateRule(rule);

    if (valid.success) {
      return rule;
    } else {
      lastValidationError = valid.message || "Missing required fields";
      attempts++;
    }
  }

  throw new Error(
    `Failed to generate a valid rule after ${maxAttempts} attempts. Last error: ${lastValidationError}`
  );
}
