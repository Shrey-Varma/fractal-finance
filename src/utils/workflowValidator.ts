import Ajv from "ajv";
import workflowSchema from "@/schemas/workflow_schema.json";

const ajv = new Ajv({ allErrors: true });
const validate = ajv.compile(workflowSchema);

export function validateWorkflow(workflow: any): { success: boolean; message?: string; missingFields?: any[] } {
  const valid = validate(workflow);
  let missingFields: any[] = [];

  if (!valid) {
    const error = validate.errors?.[0];
    // Extract missing field information
    missingFields = validate.errors?.map(err => {
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

  // --- RUNTIME CHECK FOR 'ONCE' FREQUENCY ---
  if (Array.isArray(workflow.nodes)) {
    workflow.nodes.forEach((node: any, nodeIndex: number) => {
      if (
        node.type === 'trigger' &&
        node.config &&
        node.config.triggerType === 'scheduled' &&
        node.config.schedule &&
        node.config.schedule.frequency === 'once' &&
        !node.config.schedule.date
      ) {
        missingFields.push({
          nodeIndex,
          nodeType: node.type,
          nodeName: node.name,
          missingField: 'date',
          nodeId: node.id
        });
      }

      // --- RUNTIME CHECK FOR TRANSFER ACTIONS ---
      if (
        node.type === 'action' &&
        node.config &&
        node.config.actionType === 'transfer'
      ) {
        const hasAmount = node.config.amount !== undefined;
        const hasPercentage = node.config.percentage !== undefined;
        
        if (!hasAmount && !hasPercentage) {
          missingFields.push({
            nodeIndex,
            nodeType: node.type,
            nodeName: node.name,
            missingField: 'amount_or_percentage',
            nodeId: node.id
          });
        } else if (hasAmount && hasPercentage) {
          missingFields.push({
            nodeIndex,
            nodeType: node.type,
            nodeName: node.name,
            missingField: 'amount_or_percentage_conflict',
            nodeId: node.id
          });
        }
      }
    });
  }
  if (missingFields.length > 0) {
    const hasTransferIssues = missingFields.some(field => 
      field.missingField === 'amount_or_percentage' || 
      field.missingField === 'amount_or_percentage_conflict'
    );
    
    return {
      success: false,
      message: hasTransferIssues 
        ? "Transfer actions must have either a fixed amount OR a percentage, but not both."
        : "Missing required fields for 'once' frequency.",
      missingFields
    };
  }

  return { success: true };
} 