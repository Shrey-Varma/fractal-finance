import Ajv from "ajv";
import workflowSchema from "@/schemas/workflow_schema.json";

const ajv = new Ajv({ allErrors: true });
const validate = ajv.compile(workflowSchema);

export function validateWorkflow(workflow: any): { success: boolean; message?: string; missingFields?: any[] } {
  const valid = validate(workflow);
  if (!valid) {
    const error = validate.errors?.[0];
    
    // Extract missing field information
    const missingFields = validate.errors?.map(err => {
      const path = err.instancePath || err.schemaPath;
      const nodeMatch = path.match(/\/nodes\/(\d+)\/config/);
      if (nodeMatch) {
        const nodeIndex = parseInt(nodeMatch[1]);
        const node = workflow.nodes[nodeIndex];
        return {
          nodeIndex,
          nodeType: node?.type,
          nodeName: node?.name,
          missingField: err.params?.missingProperty || err.message,
          nodeId: node?.id
        };
      }
      return null;
    }).filter(Boolean) || [];
    
    return { 
      success: false, 
      message: error?.message || "Invalid workflow",
      missingFields
    };
  }
  return { success: true };
} 