import { ChatCompletionRequestMessage, Configuration, OpenAIApi } from "openai";
import fs from "fs";
import path from "path";

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY
});
const openai = new OpenAIApi(configuration);

function loadSchemaEnums() {
  const schema = JSON.parse(
    fs.readFileSync(path.resolve("schemas/rule_schema.json"), "utf-8")
  );

  const triggers = schema.properties.trigger.enum;
  const actions = schema.properties.action.enum;
  const conditions = schema.properties.condition.properties.type.enum;

  return { triggers, actions, conditions };
}

export async function parseRuleText(text: string) {
  const { triggers, actions, conditions } = loadSchemaEnums();

  const systemPrompt = `
You are a financial automation assistant. Convert user input into a JSON rule.

Use ONLY these values:
- Triggers: ${JSON.stringify(triggers)}
- Actions: ${JSON.stringify(actions)}
- Conditions: ${JSON.stringify(conditions)}

Respond ONLY with a JSON object following the schema. No explanations.
`;

  const messages: ChatCompletionRequestMessage[] = [
    { role: "system", content: systemPrompt },
    { role: "user", content: text }
  ];

  const res = await openai.createChatCompletion({
    model: "gpt-4",
    temperature: 0.2,
    messages
  });

  return JSON.parse(res.data.choices[0].message?.content || "{}");
}
