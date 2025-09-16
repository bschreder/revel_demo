// An action to be performed, like sending an SMS or making a call
export interface ActionNode {
  id: string;
  type: 'MESSAGE';
  message: string;
  next_node_id: string | null;
}

// A simple time delay in the journey
export interface DelayNode {
  id: string;
  type: 'DELAY';
  duration_seconds: number;
  next_node_id: string | null;
}

// A conditional branch based on patient data
export interface ConditionalNode {
  id: string;
  type: 'CONDITIONAL';
  condition: {
    // e.g., 'patient.age', 'patient.condition'
    field: string;
    // e.g., '>', '=', '!='
    operator: string;
    // value to compare against
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    value: any;
  };
  // Which node to go to if the condition is true or false
  on_true_next_node_id: string | null;
  on_false_next_node_id: string | null;
}

export type JourneyNode = ActionNode | DelayNode | ConditionalNode;

export interface Journey {
  id: string;
  name: string;
  start_node_id: string;
  nodes: JourneyNode[];
}

// Patient data to evaluate conditionals against
export interface PatientContext {
  id: string;
  age: number;
  language: 'en' | 'es';
  condition: 'hip_replacement' | 'knee_replacement';
}
