import { ChatOpenAI } from "@langchain/openai";
import { RunnableSequence } from "@langchain/core/runnables";
import { JsonOutputParser } from "@langchain/core/output_parsers";
import fs from "fs";
import path from "path";

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

// Parsing function
export async function parseRuleText(text: string) {
  const {
    triggerTypes,
    triggerFields,
    criteriaFields,
    actionTypes,
    actionFields
  } = loadSchemaDetails();

  const systemPrompt = `
You are a financial automation assistant. Convert user input into a JSON rule that matches this structure:

{
  "trigger": {
    "type": "...",
    "account": "Any | All | <SpecificAccount>",
    "day_of_month": optional
  },
  "criteria": optional {
    "category": "...",
    "merchant": "...",
    "amount_greater_than": number,
    "amount_less_than": number
  },
  "action": {
    "type": "...",
    "from_account": "Any | All | <SpecificAccount>" (required),
    "to_account": "Any | All | <SpecificAccount>" (required for transfer, do not include for notify),
    "dollar_amount": optional,
    "percent_amount": optional,
    "destination": optional,
    "goal_name": optional,
    "message": optional
  }
}

Use ONLY the following values and fields:

Triggers: ${JSON.stringify(triggerTypes)}
Trigger fields: ${JSON.stringify(triggerFields)}

For the 'from_account' and 'to_account' fields, use either "Any", "All", or a specific account name as a string where the first letter is uppercase and the rest are lowercase (e.g., "Chequing").
- 'from_account' is always required.
- 'to_account' is required for transfers, do not include for notifications.

Criteria fields: ${JSON.stringify(criteriaFields)}

Actions: ${JSON.stringify(actionTypes)}
Action fields: ${JSON.stringify(actionFields)}

- Only include fields that are necessary
- Respond ONLY with a JSON object, no explanation or prefix
`;

  const chain = RunnableSequence.from([
    async ({ text }: { text: string }) => {
      return [
        { role: "system", content: systemPrompt },
        { role: "user", content: text }
      ];
    },
    model,
    parser
  ]);

  return await chain.invoke({ text });
}
