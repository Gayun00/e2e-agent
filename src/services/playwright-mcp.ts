import { MCPClient } from './mcp-client';
import type {
  MCPServerConfig,
  MCPSession,
  MCPTool,
  SelectorVerificationResult,
} from '../types/mcp';

/**
 * Playwright MCP 서비스
 * MCP를 통해 Playwright 브라우저를 제어
 */
export class PlaywrightMCPService {
  private mcpClient: MCPClient;
  private session: MCPSession | null = null;
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.mcpClient = new MCPClient();
    this.baseUrl = baseUrl;
  }

  /**
   * MCP 세션 시작
   */
  async startSession(): Promise<MCPSession> {
    const config: MCPServerConfig = {
      command: 'npx',
      args: ['@playwright/mcp@latest'],
      env: process.env as Record<string, string>,
    };

    this.session = await this.mcpClient.connect(config);
    
    // 사용 가능한 도구 출력
    console.log(`\n📦 사용 가능한 Playwright MCP 도구:`);
    this.session.availableTools.forEach((tool) => {
      console.log(`   - ${tool.name}: ${tool.description}`);
    });
    console.log('');
    
    return this.session;
  }

  /**
   * 페이지 이동
   */
  async navigate(path: string): Promise<void> {
    const url = path.startsWith('http') ? path : `${this.baseUrl}${path}`;
    console.log(`🌐 페이지 이동: ${url}`);

    const result = await this.mcpClient.callTool('playwright_navigate', {
      url,
    });

    if (result.isError) {
      throw new Error(`페이지 이동 실패: ${result.error}`);
    }

    console.log(`✓ 페이지 로드 완료`);
  }

  /**
   * 요소 클릭
   */
  async click(selector: string): Promise<void> {
    console.log(`🖱️  클릭: ${selector}`);

    const result = await this.mcpClient.callTool('playwright_click', {
      selector,
    });

    if (result.isError) {
      throw new Error(`클릭 실패: ${result.error}`);
    }

    console.log(`✓ 클릭 완료`);
  }

  /**
   * 입력 필드에 값 입력
   */
  async fill(selector: string, value: string): Promise<void> {
    console.log(`⌨️  입력: ${selector} = "${value}"`);

    const result = await this.mcpClient.callTool('playwright_fill', {
      selector,
      value,
    });

    if (result.isError) {
      throw new Error(`입력 실패: ${result.error}`);
    }

    console.log(`✓ 입력 완료`);
  }

  /**
   * 요소의 텍스트 가져오기
   */
  async getText(selector: string): Promise<string> {
    const result = await this.mcpClient.callTool('playwright_get_text', {
      selector,
    });

    if (result.isError) {
      throw new Error(`텍스트 가져오기 실패: ${result.error}`);
    }

    return result.content?.[0]?.text || '';
  }

  /**
   * 요소의 속성 가져오기
   */
  async getAttribute(selector: string, attribute: string): Promise<string> {
    const result = await this.mcpClient.callTool('playwright_get_attribute', {
      selector,
      attribute,
    });

    if (result.isError) {
      throw new Error(`속성 가져오기 실패: ${result.error}`);
    }

    return result.content?.[0]?.text || '';
  }

  /**
   * 스크린샷 캡처
   */
  async screenshot(selector?: string): Promise<string> {
    console.log(`📸 스크린샷 캡처${selector ? `: ${selector}` : ''}`);

    const params: any = {};
    if (selector) {
      params.selector = selector;
    }

    const result = await this.mcpClient.callTool('playwright_screenshot', params);

    if (result.isError) {
      throw new Error(`스크린샷 캡처 실패: ${result.error}`);
    }

    console.log(`✓ 스크린샷 캡처 완료`);
    return result.content?.[0]?.data || '';
  }

  /**
   * JavaScript 실행
   */
  async evaluate(script: string): Promise<any> {
    const result = await this.mcpClient.callTool('playwright_evaluate', {
      script,
    });

    if (result.isError) {
      throw new Error(`스크립트 실행 실패: ${result.error}`);
    }

    return result.content?.[0]?.text || null;
  }

  /**
   * 선택자 검증
   * 요소가 존재하는지 확인
   */
  async verifySelector(selector: string): Promise<boolean> {
    try {
      const result = await this.mcpClient.callTool('playwright_query_selector', {
        selector,
      });

      if (result.isError) {
        return false;
      }

      // 요소가 존재하면 true
      return result.content?.[0]?.text !== null;
    } catch (error) {
      return false;
    }
  }

  /**
   * 여러 선택자 후보 검증
   * 각 선택자가 요소를 찾을 수 있는지 확인
   */
  async findElements(
    selectorCandidates: string[]
  ): Promise<SelectorVerificationResult[]> {
    console.log(`🔍 선택자 검증 중... (${selectorCandidates.length}개)`);

    const results: SelectorVerificationResult[] = [];

    for (const selector of selectorCandidates) {
      try {
        const found = await this.verifySelector(selector);
        
        if (found) {
          // 요소 개수 확인
          const countResult = await this.mcpClient.callTool(
            'playwright_query_selector_all',
            { selector }
          );
          
          const count = countResult.isError
            ? 1
            : countResult.content?.length || 1;

          results.push({
            selector,
            found: true,
            count,
          });

          console.log(`   ✓ ${selector} (${count}개 발견)`);
        } else {
          results.push({
            selector,
            found: false,
            count: 0,
          });

          console.log(`   ✗ ${selector} (발견 안됨)`);
        }
      } catch (error) {
        results.push({
          selector,
          found: false,
          count: 0,
          error: error instanceof Error ? error.message : String(error),
        });

        console.log(`   ✗ ${selector} (에러: ${error})`);
      }
    }

    return results;
  }

  /**
   * 세션 종료
   */
  async close(): Promise<void> {
    await this.mcpClient.disconnect();
    this.session = null;
  }

  /**
   * 현재 세션 정보
   */
  getSession(): MCPSession | null {
    return this.session;
  }

  /**
   * 사용 가능한 도구 목록 조회
   */
  getAvailableTools(): MCPTool[] {
    return this.session?.availableTools || [];
  }

  /**
   * 특정 도구가 사용 가능한지 확인
   */
  hasToolAvailable(toolName: string): boolean {
    return this.session?.availableTools.some(tool => tool.name === toolName) || false;
  }

  /**
   * 페이지 snapshot 캡처 (accessibility tree)
   */
  async snapshot(): Promise<string> {
    console.log(`📸 페이지 구조 분석 중...`);

    const result = await this.mcpClient.callTool('playwright_snapshot', {});

    if (result.isError) {
      throw new Error(`Snapshot 캡처 실패: ${result.error}`);
    }

    // MCP 응답에서 snapshot 텍스트 추출
    const snapshotText = result.content?.[0]?.text || '';
    console.log(`✓ Snapshot 캡처 완료\n`);
    
    return snapshotText;
  }
}
