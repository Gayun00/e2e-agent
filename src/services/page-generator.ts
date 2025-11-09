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
   * 실제 페이지를 분석하여 Page Object 코드 생성
   */
  async generatePageObjectFromUrl(
    pageName: string,
    url: string,
    options?: {
      loginRequired?: boolean;
      loginUrl?: string;
      credentials?: { username: string; password: string };
    }
  ): Promise<string> {
    const loginInstructions = options?.loginRequired
      ? `2. 로그인이 필요하면 ${options.loginUrl}로 이동하여 로그인 수행`
      : '';

    const prompt = `당신은 Playwright 테스트 전문가입니다. 주어진 웹 페이지를 분석하여 Page Object Model 패턴의 TypeScript 클래스를 생성해주세요.

작업 순서:
1. playwright_navigate tool을 사용하여 ${url}로 이동
${loginInstructions}
3. playwright_screenshot tool로 페이지 캡처
4. 페이지의 주요 요소들을 파악 (버튼, 입력 필드, 링크 등)
5. 각 요소의 정확한 선택자 추출

생성할 클래스 정보:
- 클래스 이름: ${pageName}
- URL: ${url}

요구사항:
1. TypeScript로 작성
2. Playwright의 Page, Locator 타입 사용
3. constructor에서 page를 받고 private 필드로 저장
4. goto() 메서드로 페이지 이동
5. 실제 페이지에서 발견한 요소들의 선택자를 Locator로 정의
6. 각 요소에 대한 동작 메서드 작성 (click, fill, getText 등)
7. 선택자는 가능한 한 안정적인 것 사용 (data-testid > id > class)

코드만 출력하고 설명은 생략해주세요.`;

    const response = await this.llm.chat([{ role: 'user', content: prompt }]);

    let code = response.content.trim();
    if (code.startsWith('```')) {
      code = code.replace(/^```(?:typescript|ts)?\n/, '').replace(/\n```$/, '');
    }

    return code;
  }

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

    const response = await this.llm.chat([{ role: 'user', content: prompt }]);

    console.log('Raw LLM response:', response.content);

    try {
      let content = response.content.trim();
      
      // 코드 블록 마커 제거
      if (content.startsWith('```')) {
        content = content.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
      }
      
      // JSON 부분만 추출
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        content = jsonMatch[0];
      }
      
      const parsed = JSON.parse(content);
      return parsed.path;
    } catch (error) {
      console.error('Failed to parse LLM response:', response.content);
      throw new Error('Failed to parse page path inference response');
    }
  }

  /**
   * 실제 페이지 소스 코드를 읽어서 페이지 객체 생성
   */
  async generatePageObject(pageName: string, pagePath: string): Promise<string> {
    // 페이지 소스 파일 경로 추론 (예: /login -> src/pages/login.tsx)
    const possiblePaths = [
      `src/pages${pagePath}.tsx`,
      `src/pages${pagePath}.jsx`,
      `src/app${pagePath}/page.tsx`,
      `pages${pagePath}.tsx`,
      `pages${pagePath}.jsx`,
    ];

    let pageSourceCode = '';
    let foundPath = '';

    // 실제 페이지 소스 파일 찾기
    for (const filePath of possiblePaths) {
      try {
        if (fs.existsSync(filePath)) {
          pageSourceCode = fs.readFileSync(filePath, 'utf-8');
          foundPath = filePath;
          break;
        }
      } catch (error) {
        // 파일이 없으면 다음 경로 시도
        continue;
      }
    }

    const prompt = `당신은 Playwright 테스트 전문가입니다. 주어진 페이지 소스 코드를 분석하여 Page Object Model 패턴의 TypeScript 클래스를 생성해주세요.

클래스 정보:
- 클래스 이름: ${pageName}
- URL 경로: ${pagePath}
${foundPath ? `- 페이지 소스: ${foundPath}` : ''}

${pageSourceCode ? `페이지 소스 코드:
\`\`\`tsx
${pageSourceCode}
\`\`\`
` : ''}

요구사항:
1. TypeScript로 작성
2. Playwright의 Page, Locator 타입 사용
3. constructor에서 page를 받고 readonly 필드로 저장
4. **페이지 소스에서 실제로 존재하는 상호작용 요소만 선택자로 추가**:
   - 버튼 (button, type="submit" 등)
   - 입력 필드 (input, textarea)
   - 링크 (a 태그)
   - 선택 박스 (select)
   - 체크박스/라디오 (input[type="checkbox"], input[type="radio"])
5. **선택자 우선순위**:
   - data-testid 속성이 있으면 최우선 사용: page.getByTestId('xxx')
   - id 속성이 있으면 사용: page.locator('#xxx')
   - placeholder가 있으면 사용: page.getByPlaceholder('xxx')
   - role과 name으로 찾을 수 있으면 사용: page.getByRole('button', { name: 'xxx' })
6. **필수 메서드**:
   - goto(): 페이지로 이동
   - isOnPage(): 현재 경로가 ${pagePath}인지 확인하는 메서드 (expect(page).toHaveURL() 사용)
7. 페이지 소스에 없는 요소는 추가하지 말 것
8. 동작 메서드는 생성하지 말 것 (선택자만 정의)

예시 구조:
\`\`\`typescript
import { Page, Locator, expect } from '@playwright/test';

export class ${pageName} {
  readonly page: Page;
  
  // 실제 페이지에 존재하는 요소들만
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly loginButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.emailInput = page.getByTestId('email-input');
    this.passwordInput = page.getByTestId('password-input');
    this.loginButton = page.getByTestId('login-button');
  }

  async goto() {
    await this.page.goto('${pagePath}');
  }

  async isOnPage() {
    await expect(this.page).toHaveURL('${pagePath}');
  }
}
\`\`\`

위 구조를 참고하여 ${pageName}에 적합한 코드를 생성해주세요.
코드만 출력하고 설명은 생략해주세요.`;

    const response = await this.llm.chat([{ role: 'user', content: prompt }]);

    let code = response.content.trim();
    // 코드 블록 마커 제거
    if (code.startsWith('```')) {
      code = code.replace(/^```(?:typescript|ts)?\n/, '').replace(/\n```$/, '');
    }

    return code;
  }

  /**
   * 페이지 객체 파일 저장
   */
  async savePageObject(
    pageName: string,
    code: string,
    pagesDirectory: string
  ): Promise<string> {
    // 절대 경로로 변환
    const absolutePagesDir = path.resolve(pagesDirectory);
    
    if (!fs.existsSync(absolutePagesDir)) {
      fs.mkdirSync(absolutePagesDir, { recursive: true });
    }

    const fileName = `${pageName}.ts`;
    const filePath = path.join(absolutePagesDir, fileName);

    fs.writeFileSync(filePath, code, 'utf-8');

    return filePath;
  }

  /**
   * 테스트 파일 생성
   */
  async generateTestFile(
    testDescription: string,
    pageInfos: PageInfo[]
  ): Promise<string> {
    const pageImports = pageInfos
      .map((p) => `import { ${p.name} } from './pages/${p.name}';`)
      .join('\n');

    const prompt = `당신은 Playwright 테스트 전문가입니다. 주어진 시나리오에 대한 E2E 테스트 코드를 생성해주세요.

테스트 시나리오: ${testDescription}

사용 가능한 페이지 객체:
${pageInfos.map((p) => `- ${p.name} (경로: ${p.path})`).join('\n')}

요구사항:
1. Playwright test 프레임워크 사용
2. 제공된 페이지 객체들을 import하여 사용
3. test.describe로 테스트 그룹화
4. test() 함수로 개별 테스트 작성
5. 페이지 객체의 메서드를 활용한 테스트 시나리오 구현
6. expect를 사용한 assertion 포함

예시 구조:
\`\`\`typescript
import { test, expect } from '@playwright/test';
${pageImports}

test.describe('테스트 그룹명', () => {
  test('테스트 케이스명', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    // 테스트 로직...
    expect(await page.title()).toContain('Expected Title');
  });
});
\`\`\`

위 구조를 참고하여 "${testDescription}" 시나리오에 맞는 테스트 코드를 생성해주세요.
코드만 출력하고 설명은 생략해주세요.`;

    const response = await this.llm.chat([{ role: 'user', content: prompt }]);

    let code = response.content.trim();
    // 코드 블록 마커 제거
    if (code.startsWith('```')) {
      code = code.replace(/^```(?:typescript|ts)?\n/, '').replace(/\n```$/, '');
    }

    return code;
  }

  /**
   * 테스트 파일 저장
   */
  async saveTestFile(
    testName: string,
    code: string,
    testsDirectory: string
  ): Promise<string> {
    // 절대 경로로 변환
    const absoluteTestsDir = path.resolve(testsDirectory);
    
    if (!fs.existsSync(absoluteTestsDir)) {
      fs.mkdirSync(absoluteTestsDir, { recursive: true });
    }

    const fileName = `${testName}.spec.ts`;
    const filePath = path.join(absoluteTestsDir, fileName);

    fs.writeFileSync(filePath, code, 'utf-8');

    return filePath;
  }
}
