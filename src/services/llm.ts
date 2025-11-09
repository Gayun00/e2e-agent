import Anthropic from '@anthropic-ai/sdk';

export interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatResponse {
  content: string;
  usage?: {
    inputTokens: number;
    outputTokens: number;
    cacheReadTokens?: number;
    cacheCreationTokens?: number;
  };
}

/**
 * Anthropic LLM 서비스
 */
export class AnthropicLLMService {
  private client: Anthropic;
  private model: string = 'claude-3-5-sonnet-20241022';

  constructor(apiKey: string) {
    this.client = new Anthropic({ apiKey });
  }

  /**
   * 기본 채팅 메서드
   */
  async chat(messages: Message[]): Promise<ChatResponse> {
    try {
      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: 4096,
        messages: messages.map(msg => ({
          role: msg.role,
          content: msg.content,
        })),
      });

      const content = response.content[0];
      if (content.type !== 'text') {
        throw new Error('Unexpected response type');
      }

      return {
        content: content.text,
        usage: {
          inputTokens: response.usage.input_tokens,
          outputTokens: response.usage.output_tokens,
          cacheReadTokens: (response.usage as any).cache_read_input_tokens,
          cacheCreationTokens: (response.usage as any).cache_creation_input_tokens,
        },
      };
    } catch (error) {
      if (error instanceof Anthropic.APIError) {
        throw new Error(`Anthropic API Error: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * 시나리오 분석 - 필요한 페이지 목록 추출
   */
  async analyzeScenario(userInput: string): Promise<{ pages: string[] }> {
    const prompt = `사용자가 다음과 같은 테스트를 요청했습니다:
"${userInput}"

이 테스트를 구현하기 위해 필요한 페이지 객체 이름들을 추출해주세요.
페이지 이름은 PascalCase로 작성하고, "Page" 접미사를 붙여주세요.

예시:
- "로그인 테스트" → ["LoginPage"]
- "상품 검색 후 장바구니 담기" → ["SearchPage", "ProductPage", "CartPage"]

JSON 형식으로만 응답해주세요:
{ "pages": ["PageName1", "PageName2"] }`;

    const response = await this.chat([
      { role: 'user', content: prompt }
    ]);

    try {
      const parsed = JSON.parse(response.content);
      return parsed;
    } catch (error) {
      throw new Error('Failed to parse scenario analysis response');
    }
  }
}
