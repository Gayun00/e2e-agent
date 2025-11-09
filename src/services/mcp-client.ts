import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import type {
  MCPServerConfig,
  MCPSession,
  MCPTool,
  MCPToolResult,
} from '../types/mcp';

/**
 * MCP 클라이언트
 * Playwright MCP 서버와 통신
 */
export class MCPClient {
  private client: Client | null = null;
  private transport: StdioClientTransport | null = null;
  private session: MCPSession | null = null;

  /**
   * MCP 서버에 연결
   */
  async connect(config: MCPServerConfig): Promise<MCPSession> {
    console.log('🔌 MCP 서버 연결 중...');
    console.log(`   명령어: ${config.command} ${config.args.join(' ')}`);

    try {
      // Transport 생성
      this.transport = new StdioClientTransport({
        command: config.command,
        args: config.args,
        env: config.env,
      });

      // Client 생성 및 연결
      this.client = new Client(
        {
          name: 'playwright-e2e-agent',
          version: '0.1.0',
        },
        {
          capabilities: {},
        }
      );

      await this.client.connect(this.transport);

      // 사용 가능한 도구 목록 가져오기
      const toolsResponse = await this.client.listTools();
      const tools: MCPTool[] = toolsResponse.tools.map((tool: any) => ({
        name: tool.name,
        description: tool.description || '',
        inputSchema: tool.inputSchema,
      }));

      this.session = {
        sessionId: Date.now().toString(),
        isConnected: true,
        availableTools: tools,
      };

      console.log(`✓ MCP 서버 연결 완료`);
      console.log(`   사용 가능한 도구: ${tools.length}개`);
      tools.forEach((tool) => {
        console.log(`      - ${tool.name}`);
      });

      return this.session;
    } catch (error) {
      console.error('❌ MCP 서버 연결 실패:', error);
      throw error;
    }
  }

  /**
   * MCP 도구 호출
   */
  async callTool(toolName: string, params: any): Promise<MCPToolResult> {
    if (!this.client || !this.session?.isConnected) {
      throw new Error('MCP 서버에 연결되지 않았습니다');
    }

    try {
      const response = await this.client.callTool({
        name: toolName,
        arguments: params,
      });

      return {
        content: response.content,
        isError: Boolean(response.isError),
      };
    } catch (error) {
      return {
        content: null,
        isError: true,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * 연결 종료
   */
  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.close();
      this.client = null;
    }

    if (this.transport) {
      await this.transport.close();
      this.transport = null;
    }

    if (this.session) {
      this.session.isConnected = false;
      this.session = null;
    }

    console.log('✓ MCP 서버 연결 종료');
  }

  /**
   * 현재 세션 정보
   */
  getSession(): MCPSession | null {
    return this.session;
  }
}
