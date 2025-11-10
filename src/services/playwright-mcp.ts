import { MCPClient } from './mcp-client';
import type {
  MCPServerConfig,
  MCPSession,
  MCPTool,
} from '../types/mcp';

interface ScreenshotOptions {
  element?: string;
  ref?: string;
}

/**
 * Playwright MCP 서비스 (browser_* tool 세트)
 */
export class PlaywrightMCPService {
  private mcpClient: MCPClient;
  private session: MCPSession | null = null;
  private baseUrl: string;
  private static readonly DEFAULT_SERVER_ARGS = ['-y', '@playwright/mcp-server'];

  constructor(baseUrl: string) {
    this.mcpClient = new MCPClient();
    this.baseUrl = baseUrl;
  }

  async startSession(): Promise<MCPSession> {
    const config = this.buildServerConfig();
    this.session = await this.mcpClient.connect(config);

    console.log(`\n📦 사용 가능한 Playwright MCP 도구:`);
    this.session.availableTools.forEach((tool) => {
      console.log(`   - ${tool.name}: ${tool.description}`);
    });
    console.log('');

    return this.session;
  }

  async navigate(path: string): Promise<void> {
    const url = path.startsWith('http') ? path : `${this.baseUrl}${path}`;
    console.log(`🌐 페이지 이동: ${url}`);
    await this.invoke('browser_navigate', { url });
  }

  async click(elementDescription: string, ref: string): Promise<void> {
    await this.invoke('browser_click', { element: elementDescription, ref });
  }

  async type(elementDescription: string, ref: string, text: string): Promise<void> {
    await this.invoke('browser_type', { element: elementDescription, ref, text });
  }

  async snapshot(): Promise<string> {
    const content = await this.invoke('browser_snapshot');
    return this.extractText(content) ?? '';
  }

  async takeScreenshot(options: ScreenshotOptions = {}): Promise<string | undefined> {
    const payload: Record<string, unknown> = {};
    if (options.element) {
      payload.element = options.element;
    }
    if (options.ref) {
      payload.ref = options.ref;
    }

    const content = await this.invoke('browser_take_screenshot', payload);
    return content?.[0]?.data;
  }

  async evaluatePage<T = unknown>(fn: string): Promise<T | null> {
    const content = await this.invoke('browser_evaluate', { function: fn });
    return this.parseJsonContent<T>(content);
  }

  async evaluateElement<T = unknown>(
    elementDescription: string,
    ref: string,
    fn: string
  ): Promise<T | null> {
    const content = await this.invoke('browser_evaluate', {
      element: elementDescription,
      ref,
      function: fn,
    });
    return this.parseJsonContent<T>(content);
  }

  async close(): Promise<void> {
    await this.mcpClient.disconnect();
    this.session = null;
  }

  getSession(): MCPSession | null {
    return this.session;
  }

  getAvailableTools(): MCPTool[] {
    return this.session?.availableTools || [];
  }

  hasToolAvailable(toolName: string): boolean {
    return this.session?.availableTools.some((tool) => tool.name === toolName) || false;
  }

  private buildServerConfig(): MCPServerConfig {
    const command = process.env.MCP_SERVER_COMMAND?.trim() || 'npx';
    const args =
      this.parseServerArgs(process.env.MCP_SERVER_ARGS) ||
      PlaywrightMCPService.DEFAULT_SERVER_ARGS;

    return {
      command,
      args,
      env: process.env as Record<string, string>,
    };
  }

  private parseServerArgs(value?: string): string[] | null {
    if (!value) {
      return null;
    }

    const trimmed = value.trim();
    if (!trimmed) {
      return null;
    }

    if (trimmed.startsWith('[')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
          return parsed.map((arg) => String(arg));
        }
      } catch (error) {
        console.warn('⚠️  MCP_SERVER_ARGS JSON 파싱 실패, 기본 인자를 사용합니다.', error);
        return null;
      }
    }

    return trimmed.split(/\s+/);
  }

  private async invoke(toolName: string, params: Record<string, unknown> = {}) {
    const result = await this.mcpClient.callTool(toolName, params);
    if (result.isError) {
      throw new Error(result.error || `MCP tool 호출 실패: ${toolName}`);
    }
    return result.content;
  }

  private extractText(content?: any[]): string | undefined {
    if (!content || content.length === 0) {
      return undefined;
    }

    const chunk = content.find((item) => item.type === 'text');
    return chunk?.text;
  }

  private parseJsonContent<T>(content?: any[]): T | null {
    const text = this.extractText(content);
    if (!text) {
      return null;
    }

    // 기본적으로 "### Result" 구간을 추출
    const match = text.match(/### Result\s+([\s\S]*?)(?:\n### |$)/);
    const jsonString = (match ? match[1] : text).trim();

    if (!jsonString) {
      return null;
    }

    try {
      return JSON.parse(jsonString) as T;
    } catch (error) {
      console.warn('⚠️  MCP JSON 파싱 실패:', error);
      return null;
    }
  }
}
