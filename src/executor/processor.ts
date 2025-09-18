
import { getJourneyById } from '#src/db/mongodb-interface.js';
import { JobNode } from '#src/models/journey-schema.js';
import { ActionNode, ConditionalNode, DelayNode, JourneyNode } from '#src/models/node-types.js';
import { Job } from 'bullmq';
import { addJob } from './job.js';
import { beginTraceStep, finishTraceStep, completeRunTrace } from '#src/db/mongodb-interface.js';

/**
 * Helper to fetch journey and node by type
 * @param {string} journeyId The ID of the journey
 * @param {string} nodeId The ID of the node
 * @param {(node: JourneyNode) => node is T} typeGuard Type guard function to validate node type
 * @returns {Promise<{ journey: any; node: T }>} The journey and node
 * @throws Will throw an error if the journey or node is not found or if the node type does not match
 * @template T The specific JourneyNode type
 */
async function getJourneyAndNode<T extends JourneyNode>(
  journeyId: string, nodeId: string, typeGuard: (node: JourneyNode) => node is T
): Promise<{ journey: any; node: T }> {
  const journey = await getJourneyById(journeyId);
  if (!journey) 
  {throw new Error(`Journey with ID ${journeyId} not found`);}

  const node = journey.nodes.find((n: JourneyNode) => n.id === nodeId);
  if (!node || !typeGuard(node)) 
  {throw new Error(`Node with ID ${nodeId} not found or wrong type`);}
  
  return { journey, node };
}

/**
 * Is the node an ActionNode?
 * @param {JourneyNode} node The node to check
 * @returns {node is ActionNode} True if the node is an ActionNode
 */
function isActionNode(node: JourneyNode): node is ActionNode {
  return node.type === 'MESSAGE';
}

/**
 * Is the node an DelayNode?
 * @param {JourneyNode} node The node to check
 * @returns {node is DelayNode} True if the node is an DelayNode
 */
function isDelayNode(node: JourneyNode): node is DelayNode {
  return node.type === 'DELAY';
}

/**
 * Is the node an ConditionalNode?
 * @param {JourneyNode} node The node to check
 * @returns {node is ConditionalNode} True if the node is an ConditionalNode
 */
function isConditionalNode(node: JourneyNode): node is ConditionalNode {
  return node.type === 'CONDITIONAL';
}

/**
 * Helper to create and submit the next run node
 * @param {string} journeyId The ID of the journey
 * @param {string} nextNodeId The ID of the next node
 * @param {any} patientContext The patient context
 * @param {string} runId The ID of the current run
 * @returns {Promise<string>} The job ID of the submitted job
 */
async function submitNextRunNode(
  journeyId: string, nextNodeId: string, patientContext: JobNode['patientContext'], runId: string
): Promise<string> {
  const nextRunNode: JobNode = {
    runId,
    journeyId,
    currentNodeId: nextNodeId,
    patientContext
  };
  return addJob(nextRunNode);
}

/**
 * Action processor function for BullMQ worker.
 * @param {Job} job - The BullMQ job
 * @returns {Promise<string>} Result of processing
 */
export async function actionProcessor(job: Job): Promise<string> {
  const runsNode = job.data as JobNode;
  await beginTraceStep(runsNode.runId, { nodeId: runsNode.currentNodeId, type: 'MESSAGE', startedAt: new Date().toISOString() });
  const { journey, node: actionNode } = 
    await getJourneyAndNode<ActionNode>(
      runsNode.journeyId,
      runsNode.currentNodeId,
      isActionNode
    );

  const patientId = runsNode.patientContext.id;
  console.log(`Sending message to patient ${patientId}: ${actionNode.message}`);

  if (!actionNode.next_node_id) {
    await finishTraceStep(runsNode.runId, runsNode.currentNodeId, { message: actionNode.message });
    await completeRunTrace(runsNode.runId, 'completed');
    return `Journey ${journey.id} completed for patient ${patientId}`;
  }

  await finishTraceStep(runsNode.runId, runsNode.currentNodeId, { message: actionNode.message });
  await submitNextRunNode(journey.id, actionNode.next_node_id, runsNode.patientContext, runsNode.runId);
  return `Processed action job with data: ${JSON.stringify(job.data)}`;
}

/**
 * Delay processor function for BullMQ worker.
 * @param {Job} job - The BullMQ job
 * @returns {Promise<string>} Result of processing
 */
export async function delayProcessor(job: Job): Promise<string> {
  const runsNode = job.data as JobNode;
  await beginTraceStep(runsNode.runId, { nodeId: runsNode.currentNodeId, type: 'DELAY', startedAt: new Date().toISOString() });
  const { journey, node: delayNode } = 
    await getJourneyAndNode<DelayNode>(
      runsNode.journeyId,
      runsNode.currentNodeId,
      isDelayNode
    );

  const patientId = runsNode.patientContext.id;

  if (!delayNode.next_node_id) {
    await finishTraceStep(runsNode.runId, runsNode.currentNodeId, { duration_seconds: delayNode.duration_seconds });
    await completeRunTrace(runsNode.runId, 'completed');
    return `Journey ${journey.id} completed for patient ${patientId}`;
  }

  await finishTraceStep(runsNode.runId, runsNode.currentNodeId, { duration_seconds: delayNode.duration_seconds });
  await submitNextRunNode(journey.id, delayNode.next_node_id, runsNode.patientContext, runsNode.runId);
  return `Processed delay job with data: ${JSON.stringify(job.data)}`;
}

/**
 * Conditional processor function for BullMQ worker.
 * @param {Job} job - The BullMQ job
 * @returns {Promise<string>} Result of processing
 */
export async function conditionalProcessor(job: Job): Promise<string> {
  const runsNode = job.data as JobNode;
  await beginTraceStep(runsNode.runId, { nodeId: runsNode.currentNodeId, type: 'CONDITIONAL', startedAt: new Date().toISOString() });
  const { journey, node: conditionalNode } = 
    await getJourneyAndNode<ConditionalNode>(
      runsNode.journeyId,
      runsNode.currentNodeId,
      isConditionalNode
    );

  const condition = conditionalNode.condition;
  const patientId = runsNode.patientContext.id;
  const patientValue = (runsNode.patientContext as any)[condition.field.replace('patient.', '')];
  
  let result: boolean;
  switch (condition.operator) {
  case '>':
    result = patientValue > condition.value;
    break;
  case '<':
    result = patientValue < condition.value;
    break;
  case '=':
  case '==':
    result = patientValue === condition.value;
    break;
  case '!=':
    result = patientValue !== condition.value;
    break;
  default:
    throw new Error(`Unsupported operator: ${condition.operator}`);
  }

  const nextNodeId = result
    ? conditionalNode.on_true_next_node_id
    : conditionalNode.on_false_next_node_id;
  if (!nextNodeId) {
    await finishTraceStep(runsNode.runId, runsNode.currentNodeId, { field: condition.field, operator: condition.operator, value: condition.value, evaluated: patientValue, outcome: result, next_node_id: null });
    await completeRunTrace(runsNode.runId, 'completed');
    return `Journey ${journey.id} completed for patient ${patientId}`;
  }
  
  await finishTraceStep(runsNode.runId, runsNode.currentNodeId, { field: condition.field, operator: condition.operator, value: condition.value, evaluated: patientValue, outcome: result, next_node_id: nextNodeId });
  await submitNextRunNode(journey.id, nextNodeId, runsNode.patientContext, runsNode.runId);
  return `Processed conditional job with data: ${JSON.stringify(job.data)}`;
}