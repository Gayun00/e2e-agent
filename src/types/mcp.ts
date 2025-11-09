/**
 * MCP (Model Context Protocol) 관련 타입 정의
 */

/**
 * MCP 서버 설정
 */
export interface MCPServerConfig {
  command: string;
  args: string[];
  env?: Record<string, string>;
}

/**
 * MCP 도구 정의
 */
export interface MCPTool {
  name: string;
  description: string;
  inputSchema: any;
}

/**
 * MCP 도구 실행 결과
 */
export interface MCPToolResult {
  content: any;
  isError: boolean;
  error?: string;
}

/**
 * MCP 세션
 */
export interface MCPSession {
  sessionId: string;
  isConnected: boolean;
  availableTools: MCPTool[];
}

/**
 * 선택자 검증 결과
 */
export interface SelectorVerificationResult {
  selector: string;
  found: boolean;
  count: number;
  error?: string;
  screenshot?: string;
}

/**
 * 선택자 후보
 */
export interface SelectorCandidate {
  selector: string;
  strategy: SelectorStrategy;
  priority: number;
}

export enum SelectorStrategy {
  TEST_ID = 'testId',
  ROLE = 'role',
  PLACEHOLDER = 'placeholder',
  LABEL = 'label',
  TEXT = 'text',
  CSS = 'css',
}
