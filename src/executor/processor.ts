
import { getJourneyById } from '#src/db/mongodb-interface.js';
import { JobNode } from '#src/models/journey-schema.js';
import { ActionNode, ConditionalNode, DelayNode, JourneyNode } from '#src/models/node-types.js';
import { Job } from 'bullmq';
import { addJob } from './job.js';

/**
 * Helper to fetch journey and node by type
 */
async function getJourneyAndNode<T extends JourneyNode>(
  journeyId: string, nodeId: string, typeGuard: (node: JourneyNode) => node is T
): Promise<{ journey: any; node: T }> {
  const journey = await getJourneyById(journeyId);
  if (!journey) 
    throw new Error(`Journey with ID ${journeyId} not found`);

  const node = journey.nodes.find((n: JourneyNode) => n.id === nodeId);
  if (!node || !typeGuard(node)) 
    throw new Error(`Node with ID ${nodeId} not found or wrong type`);
  
  return { journey, node };
}

function isActionNode(node: JourneyNode): node is ActionNode {
  return node.type === 'MESSAGE';
}
function isDelayNode(node: JourneyNode): node is DelayNode {
  return node.type === 'DELAY';
}
function isConditionalNode(node: JourneyNode): node is ConditionalNode {
  return node.type === 'CONDITIONAL';
}

/**
 * Helper to create and submit the next run node
 */
async function submitNextRunNode(
  journeyId: string, nextNodeId: string, patientContext: JobNode['patientContext']
): Promise<string> {
  const nextRunNode: JobNode = {
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
  const { journey, node: actionNode } = 
    await getJourneyAndNode<ActionNode>(
      runsNode.journeyId,
      runsNode.currentNodeId,
      isActionNode
    );

  const patientId = runsNode.patientContext.id;
  console.log(`Sending message to patient ${patientId}: ${actionNode.message}`);

  if (!actionNode.next_node_id) {
    return `Journey ${journey.id} completed for patient ${patientId}`;
  }

  await submitNextRunNode(journey.id, actionNode.next_node_id, runsNode.patientContext);
  return `Processed action job with data: ${JSON.stringify(job.data)}`;
}

/**
 * Delay processor function for BullMQ worker.
 * @param {Job} job - The BullMQ job
 * @returns {Promise<string>} Result of processing
 */
export async function delayProcessor(job: Job): Promise<string> {
  const runsNode = job.data as JobNode;
  const { journey, node: delayNode } = 
    await getJourneyAndNode<DelayNode>(
      runsNode.journeyId,
      runsNode.currentNodeId,
      isDelayNode
    );

  const patientId = runsNode.patientContext.id;

  if (!delayNode.next_node_id) {
    return `Journey ${journey.id} completed for patient ${patientId}`;
  }

  await submitNextRunNode(journey.id, delayNode.next_node_id, runsNode.patientContext);
  return `Processed delay job with data: ${JSON.stringify(job.data)}`;
}

/**
 * Conditional processor function for BullMQ worker.
 * @param {Job} job - The BullMQ job
 * @returns {Promise<string>} Result of processing
 */
export async function conditionalProcessor(job: Job): Promise<string> {
  const runsNode = job.data as JobNode;
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
    return `Journey ${journey.id} completed for patient ${patientId}`;
  }
  
  await submitNextRunNode(journey.id, nextNodeId, runsNode.patientContext);
  return `Processed conditional job with data: ${JSON.stringify(job.data)}`;
}