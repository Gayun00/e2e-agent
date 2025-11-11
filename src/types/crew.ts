import type { ScenarioDocument } from './scenario';
import type { MCPSession, MCPTool, SelectorMatch } from './mcp';

export interface CrewAgentProfile {
  name: string;
  role: string;
  goal: string;
  backstory?: string;
}

export interface CrewPlanPhase {
  id: string;
  title: string;
  focus: string;
  entryCriteria: string;
  exitCriteria: string;
}

export interface CrewTaskDefinition {
  id: string;
  description: string;
  successCriteria: string;
  targetPage?: string;
  relatedFlows?: string[];
}

export interface CrewPlan {
  goal: string;
  phases: CrewPlanPhase[];
  roles: CrewAgentProfile[];
  tasks: CrewTaskDefinition[];
  reviewCheckpoints: string[];
  rawResponse: string;
}

export interface CrewPlanResult {
  plan: CrewPlan;
  scenario: ScenarioDocument;
  rawPlanText: string;
}

export interface CrewToolInvocationResult {
  ok: boolean;
  output?: string;
  data?: unknown;
  error?: string;
}

export interface CrewToolInvocationLog {
  id: string;
  toolName: string;
  params: Record<string, unknown>;
  status: 'success' | 'error';
  message?: string;
  timestamp: string;
}

export interface CrewApprovalRecord {
  methodName: string;
  status: 'approved' | 'rejected' | 'needs_changes';
  note?: string;
  reviewer?: string;
  reviewedAt: string;
}

export interface CrewSessionState {
  sessionId: string;
  scenarioPath?: string;
  scenario?: ScenarioDocument;
  plan?: CrewPlan | null;
  mcpSession?: MCPSession | null;
  selectorsByPage: Record<string, SelectorMatch[]>;
  approvals: CrewApprovalRecord[];
  toolInvocations: CrewToolInvocationLog[];
}

export interface CrewToolContext {
  scenario?: ScenarioDocument;
  sessionState: CrewSessionState;
}

export type CrewToolHandler = (
  params: Record<string, unknown>,
  context: CrewToolContext
) => Promise<CrewToolInvocationResult>;

export interface CrewToolBinding {
  name: string;
  description: string;
  handler: CrewToolHandler;
  requiresSession?: boolean;
  inputExample?: Record<string, unknown>;
}

export interface CrewToolCatalogEntry {
  binding: CrewToolBinding;
  underlyingTool?: MCPTool;
}
