import type { SelectorMatch } from '../types/mcp';
import type { AnthropicLLMService } from './llm';

export interface MethodSynthesisInput {
  pageName: string;
  code: string;
  selectors: SelectorMatch[];
  scenarioContext?: string;
}

/**
 * MCP로 채운 선택자를 기반으로 POM 메서드 구현을 생성하는 서비스
 */
export class MethodSynthesizer {
  constructor(private readonly llm: AnthropicLLMService) {}

  async synthesize(input: MethodSynthesisInput): Promise<string> {
    const selectorSummary = this.buildSelectorSummary(input.selectors);
    const scenarioSnippet = input.scenarioContext?.trim()
      ? `\n테스트 상황:\n${input.scenarioContext.trim()}\n`
      : '';

    const prompt = `당신은 Playwright Page Object Model 전문가입니다.
아래 ${input.pageName} 클래스의 TODO 메서드를 실제 Playwright 코드로 완성해주세요.

요구사항:
1. '// TODO: MCP로 검증' 주석이 있는 메서드만 수정하고 나머지는 그대로 유지하세요.
2. 제공된 선택자 요약을 반드시 사용하고, 새로운 selector를 임의로 만들지 마세요.
3. 동작 메서드는 Playwright API(page.getByTestId 등)를 직접 호출하거나 이미 정의된 getter를 사용하세요.
4. async/await 패턴을 유지하고 예외 처리는 불필요합니다.
5. import 문, 클래스 선언, getter, goto/isOnPage 등은 변경하지 마세요.
6. TypeScript 코드만 출력하고 마크다운 코드 블록은 사용하지 마세요.${scenarioSnippet}
요소 요약:
${selectorSummary}

현재 코드:
\`\`\`typescript
${input.code}
\`\`\`

위 지침에 맞춰 TODO 메서드를 채운 전체 클래스를 다시 작성하세요.`;

    const response = await this.llm.chat([{ role: 'user', content: prompt }]);
    return this.stripCodeFence(response.content.trim()) || input.code;
  }

  private buildSelectorSummary(selectors: SelectorMatch[]): string {
    if (!selectors || selectors.length === 0) {
      return '- (선택자 정보 없음)';
    }

    return selectors
      .map((match) => {
        const selector = match.selector || 'PLACEHOLDER';
        const reason = match.reason ? ` (${match.reason})` : '';
        return `- ${match.elementName}: ${selector}${reason}`;
      })
      .join('\n');
  }

  private stripCodeFence(content: string): string {
    if (content.startsWith('```')) {
      return content.replace(/^```[a-zA-Z]*\n/, '').replace(/\n```$/, '');
    }
    return content;
  }
}
