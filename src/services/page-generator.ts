import { AnthropicLLMService } from './llm';
import * as fs from 'fs';
import * as path from 'path';

export interface PageInfo {
  name: string;
  path: string;
}

/**
 * 페이지 객체 생성 서비스
 */
export class PageGeneratorService {
  constructor(private llm: AnthropicLLMService) {}

  /**
   * 페이지 이름으로부터 경로 추론
   */
  async inferPagePath(pageName: string): Promise<string> {
    const prompt = `페이지 이름 "${pageName}"에 해당하는 웹 페이지의 URL 경로를 추론해주세요.

예시:
- LoginPage → /login
- SignupPage → /signup
- ProductDetailPage → /products/:id
- CartPage → /cart
- HomePage → /

JSON 형식으로만 응답해주세요:
{ "path": "/경로" }`;

    const response = await this.llm.chat([
      { role: 'user', content: prompt }
    ]);

    try {
      const parsed = JSON.parse(response.content);
      return parsed.path;
    } catch (error) {
      throw new Error('Failed to parse page path inference response');
    }
  }

  /**
   * 기본 페이지 객체 코드 생성
   */
  async generatePageObjectCode(pageName: string, pagePath: string, baseUrl: string): Promise<string> {
    const prompt = `Playwright의 Page Object Model 패턴으로 "${pageName}" 클래스를 생성해주세요.

페이지 정보:
- 클래스 이름: ${pageName}
- URL 경로: ${pagePath}
- Base URL: ${baseUrl}

요구사항:
1. TypeScript로 작성
2. Playwright의 Page, Locator 타입 사용
3. constructor에서 page 받기
4. goto() 메서드로 페이지 이동
5. 기본적인 선택자 몇 개 포함 (예: 버튼, 입력 필드 등)
6. 간단한 동작 메서드 1-2개 포함

코드만 출력하고 설명은 생략해주세요.`;

    const response = await this.llm.chat([
      { role: 'user', content: prompt }
    ]);

    // 코드 블록 제거 (```typescript ... ```)
    let code = response.content.trim();
    if (code.startsWith('```')) {
      code = code.replace(/^```(?:typescript|ts)?\n/, '').replace(/\n```$/, '');
    }

    return code;
  }

  /**
   * 페이지 객체 파일 저장
   */
  async savePageObject(pageName: string, code: string, pagesDirectory: string): Promise<string> {
    // 디렉토리 생성
    if (!fs.existsSync(pagesDirectory)) {
      fs.mkdirSync(pagesDirectory, { recursive: true });
    }

    // 파일 경로
    const fileName = `${pageName}.ts`;
    const filePath = path.join(pagesDirectory, fileName);

    // 파일 저장
    fs.writeFileSync(filePath, code, 'utf-8');

    return filePath;
  }
}
