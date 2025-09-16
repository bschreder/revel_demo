import mongoose from 'mongoose';


// Flat node schema for all node types
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

export const journeySchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  start_node_id: { type: String, required: true },
  nodes: { type: [journeyNodeSchema], required: true }
});

export const JourneyModel = mongoose.model('Journey', journeySchema);
