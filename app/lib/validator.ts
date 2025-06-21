import Ajv from "ajv";
import ruleSchema from "@/schemas/rule_schema.json";

const ajv = new Ajv({ allErrors: true });
const validate = ajv.compile(ruleSchema);

export function validateRule(rule: any): { success: boolean; message?: string } {
  const valid = validate(rule);
  if (!valid) {
    const error = validate.errors?.[0];
    return { success: false, message: error?.message || "Invalid rule" };
  }
  return { success: true };
}
