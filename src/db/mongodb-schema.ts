import mongoose from 'mongoose';


/**
 * Schema for individual nodes in a journey
 */
export const journeyNodeSchema = new mongoose.Schema({
  id: { type: String, required: true },
  type: { type: String, required: true, enum: ['MESSAGE', 'DELAY', 'CONDITIONAL'] },
  // MESSAGE
  message: { type: String },
  // DELAY
  duration_seconds: { type: Number },
  // CONDITIONAL
  condition: {
    field: { type: String },
    operator: { type: String },
    value: { type: mongoose.Schema.Types.Mixed }
  },
  on_true_next_node_id: { type: String },
  on_false_next_node_id: { type: String },
  // Common
  next_node_id: { type: String }
}, { _id: false });

/**
 * Schema for Journey
 */
export const journeySchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  start_node_id: { type: String, required: true },
  nodes: { type: [journeyNodeSchema], required: true }
});

/**
 * Mongoose model for Journey
 */
export const JourneyModel = 
      mongoose.models.Journey || mongoose.model('Journey', journeySchema);

/**
 * Schema for individual steps in a run trace
 */
const traceStepSchema = new mongoose.Schema({
  nodeId: { type: String, required: true },
  type: { type: String, required: true, enum: ['MESSAGE', 'DELAY', 'CONDITIONAL'] },
  startedAt: { type: Date, required: true },
  finishedAt: { type: Date },
  result: { type: mongoose.Schema.Types.Mixed }
}, { _id: false });

/**
 * Schema for run traces
 */
const runTraceSchema = new mongoose.Schema({
  runId: { type: String, required: true, unique: true },
  journeyId: { type: String, required: true },
  status: { type: String, required: true, enum: ['in_progress', 'completed', 'failed'] },
  startedAt: { type: Date, required: true },
  finishedAt: { type: Date },
  currentNodeId: { type: String },
  patientContext: {
    id: { type: String, required: true },
    age: { type: Number, required: true },
    language: { type: String, required: true, enum: ['en', 'es'] },
    condition: { type: String, required: true, enum: ['hip_replacement', 'knee_replacement'] }
  },
  steps: { type: [traceStepSchema], default: [] }
});

// Indexes for RunTrace operations
// Useful for future queries: list runs by journey
runTraceSchema.index({ journeyId: 1 }, { name: 'runtrace_journeyId_idx' });
// Accelerate updates that match by runId and steps.nodeId (multikey compound)
runTraceSchema.index({ runId: 1, 'steps.nodeId': 1 }, { name: 'runtrace_runId_stepsNodeId_idx' });

export const RunTraceModel = mongoose.models.RunTrace || mongoose.model('RunTrace', runTraceSchema);
