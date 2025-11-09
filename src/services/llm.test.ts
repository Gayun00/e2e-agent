import { describe, test, expect, beforeAll } from 'vitest';
import { AnthropicLLMService } from './llm';
import { loadAuthCredentials } from '../config/loader';

describe('AnthropicLLMService', () => {
  let llm: AnthropicLLMService;
  let apiKey: string;

  beforeAll(() => {
    // Load API key from environment
    apiKey = process.env.ANTHROPIC_API_KEY || '';
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY not found in environment');
    }
    llm = new AnthropicLLMService(apiKey);
  });

  test('LLM 호출 - 기본 chat', async () => {
    const response = await llm.chat([
      { role: 'user', content: '안녕하세요. 간단히 "안녕"이라고만 답해주세요.' }
    ]);

    expect(response.content).toBeDefined();
    expect(response.content.length).toBeGreaterThan(0);
    expect(response.usage).toBeDefined();
    expect(response.usage?.inputTokens).toBeGreaterThan(0);
    expect(response.usage?.outputTokens).toBeGreaterThan(0);

    console.log('✅ LLM 응답:', response.content);
    console.log('📊 토큰 사용량:', response.usage);
  }, 30000); // 30초 타임아웃

  test('시나리오 분석', async () => {
    const analysis = await llm.analyzeScenario('로그인 테스트');

    expect(analysis.pages).toBeDefined();
    expect(Array.isArray(analysis.pages)).toBe(true);
    expect(analysis.pages.length).toBeGreaterThan(0);
    expect(analysis.pages).toContain('LoginPage');

    console.log('✅ 분석 결과:', analysis);
  }, 30000);

  test('시나리오 분석 - 복잡한 케이스', async () => {
    const analysis = await llm.analyzeScenario('상품 검색 후 장바구니에 담고 결제하기');

    expect(analysis.pages).toBeDefined();
    expect(analysis.pages.length).toBeGreaterThanOrEqual(3);

    console.log('✅ 복잡한 시나리오 분석:', analysis);
  }, 30000);
});
