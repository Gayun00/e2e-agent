import type { AnthropicLLMService } from './llm';
import type { ScenarioDocument } from '../types/scenario';
import type {
  PageObjectSkeletonCode,
  TestFileSkeletonCode,
  SkeletonGenerationResult,
} from '../types/skeleton';

/**
 * Skeleton Generator
 * 시나리오 문서를 기반으로 POM과 테스트 파일의 skeleton 코드 생성
 */
export class SkeletonGenerator {
  constructor(private llm: AnthropicLLMService) {}

  /**
   * 시나리오에서 모든 skeleton 생성
   */
  async generateSkeletons(scenario: ScenarioDocument): Promise<SkeletonGenerationResult> {
    // 1. 각 페이지별 POM skeleton 생성
    const pageObjects: PageObjectSkeletonCode[] = [];
    
    for (const page of scenario.pages) {
      console.log(`📝 ${page.name} skeleton 생성 중...`);
      const code = await this.generatePageObjectSkeleton(scenario, page.name);
      pageObjects.push({
        pageName: page.name,
        code,
      });
    }

    // 2. 테스트 파일 skeleton 생성
    console.log('📝 테스트 파일 skeleton 생성 중...');
    const testFile = await this.generateTestFileSkeleton(scenario, pageObjects);

    return {
      pageObjects,
      testFile,
    };
  }

  /**
   * 단일 페이지의 POM skeleton 생성
   */
  private async generatePageObjectSkeleton(
    scenario: ScenarioDocument,
    pageName: string
  ): Promise<string> {
    const page = scenario.pages.find((p) => p.name === pageName);
    if (!page) {
      throw new Error(`Page ${pageName} not found in scenario`);
    }

    // 이 페이지와 관련된 테스트 플로우 추출
    const relevantFlows = this.extractRelevantFlows(scenario.flows, pageName);

    const prompt = `
당신은 Playwright Page Object Model 전문가입니다.
다음 시나리오를 분석하여 ${pageName} Page Object 클래스를 생성해주세요.

# 페이지 정보
- 이름: ${page.name}
- 경로: ${page.path}
${page.description ? `- 설명: ${page.description}` : ''}

# 관련 테스트 플로우
${relevantFlows.map((f, i) => `
## ${i + 1}. ${f.name}
${f.steps.map((s: any) => `${s.order}) ${s.raw}`).join('\n')}
`).join('\n')}

# 요구사항

## 1. 클래스 구조
- BasePage를 상속하는 클래스 생성
- 모든 요소는 getter 메서드로 정의 (Locator 반환)
- constructor에서 super(page)만 호출

## 2. 필수 메서드
- \`async goto()\`: 이 페이지로 이동 (this.page.goto('${page.path}'))
- \`async isOnPage(): Promise<boolean>\`: 현재 페이지 경로 확인

## 3. 요소 정의
- 테스트 플로우에서 필요한 모든 요소를 getter로 정의
- getter는 Locator를 반환
- 요소 이름은 camelCase (예: phoneNumberInput, loginButton, mainPageText)
- **선택자는 PLACEHOLDER 사용**: this.page.locator('PLACEHOLDER_요소이름')
- 예시:
  - 휴대폰 번호 인풋 → get phoneNumberInput()
  - 비밀번호 인풋 → get passwordInput()
  - 로그인 버튼 → get loginButton()
  - '메인페이지' 텍스트 → get mainPageText()

## 4. 동작 메서드
- 테스트 플로우에서 필요한 동작을 메서드로 생성
- 메서드 이름은 동작을 명확히 표현 (예: fillPhoneNumber, clickLoginButton, isMainPageDisplayed)
- 메서드 내부는 간단한 구현만 작성 (fill, click, isVisible 등)
- 주석으로 "// TODO: MCP로 검증" 추가

## 5. 출력 형식
- TypeScript 코드만 출력
- 마크다운 코드 블록 사용하지 말 것
- import 문 포함
- 주석은 최소화

예시:
import { Page, Locator } from '@playwright/test';
import { BasePage } from './BasePage';

export class LoginPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }
  
  // 요소 getter
  get phoneNumberInput(): Locator {
    return this.page.locator('PLACEHOLDER_phoneNumberInput');
  }
  
  get passwordInput(): Locator {
    return this.page.locator('PLACEHOLDER_passwordInput');
  }
  
  get loginButton(): Locator {
    return this.page.locator('PLACEHOLDER_loginButton');
  }
  
  // 필수 메서드
  async goto() {
    await this.page.goto('/login');
  }
  
  async isOnPage(): Promise<boolean> {
    return this.page.url().includes('/login');
  }
  
  // 동작 메서드
  async fillPhoneNumber(phoneNumber: string) {
    // TODO: MCP로 검증
    await this.phoneNumberInput.fill(phoneNumber);
  }
  
  async fillPassword(password: string) {
    // TODO: MCP로 검증
    await this.passwordInput.fill(password);
  }
  
  async clickLoginButton() {
    // TODO: MCP로 검증
    await this.loginButton.click();
  }
}
`;

    const response = await this.llm.chat([{ role: 'user', content: prompt }]);

    // 코드 추출 (마크다운 블록이 있으면 제거)
    let code = response.content.trim();
    const codeMatch = code.match(/```(?:typescript|ts)?\n([\s\S]+?)\n```/);
    if (codeMatch) {
      code = codeMatch[1];
    }

    return code;
  }

  /**
   * 테스트 파일 skeleton 생성
   */
  private async generateTestFileSkeleton(
    scenario: ScenarioDocument,
    pageObjects: PageObjectSkeletonCode[]
  ): Promise<TestFileSkeletonCode> {
    const pageNames = pageObjects.map((po) => po.pageName);

    const prompt = `
당신은 Playwright 테스트 전문가입니다.
다음 시나리오를 기반으로 Playwright 테스트 파일을 생성해주세요.

# 시나리오

## 페이지 목록
${scenario.pages.map((p) => `- ${p.name}: ${p.path}`).join('\n')}

## 테스트 플로우
${scenario.flows.map((f, i) => `
### ${i + 1}. ${f.name}
${f.purpose ? `목적: ${f.purpose}` : ''}
${f.steps.map((s: any) => `${s.order}) ${s.raw}`).join('\n')}
`).join('\n')}

# 사용 가능한 Page Objects
${pageNames.join(', ')}

# 요구사항

## 1. 구조
- test.describe로 전체 시나리오 그룹화
- 각 테스트 플로우를 test()로 작성
- 주요 단계는 test.step()으로 구분

## 2. test.describe
- 시나리오 제목 사용 (예: "로그인 테스트")

## 3. test.step
- 각 주요 단계를 step으로 구분 (예: "1. 로그인 페이지에서 로그인")
- step 내부에서 Page Object 메서드 호출

## 4. Page Object 사용
- 각 페이지의 인스턴스 생성
- goto(), fill*, click*, is* 메서드 호출
- 검증은 expect() 사용

## 5. 출력 형식
- TypeScript 코드만 출력
- 마크다운 코드 블록 사용하지 말 것
- import 문 포함

예시:
import { test, expect } from '@playwright/test';
import { LoginPage } from './pages/LoginPage';
import { MainPage } from './pages/MainPage';

test.describe('로그인 테스트', () => {
  test('로그인 플로우', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const mainPage = new MainPage(page);
    
    await test.step('로그인 페이지에서 로그인', async () => {
      await loginPage.goto();
      await loginPage.fillPhoneNumber('01012345678');
      await loginPage.fillPassword('password123');
      await loginPage.clickLoginButton();
    });
    
    await test.step('메인페이지로 이동 확인', async () => {
      expect(await mainPage.isOnPage()).toBeTruthy();
      expect(await mainPage.isMainPageDisplayed()).toBeTruthy();
    });
  });
});
`;

    const response = await this.llm.chat([{ role: 'user', content: prompt }]);

    // 코드 추출
    let code = response.content.trim();
    const codeMatch = code.match(/```(?:typescript|ts)?\n([\s\S]+?)\n```/);
    if (codeMatch) {
      code = codeMatch[1];
    }

    return {
      testName: 'test',
      code,
    };
  }

  /**
   * 특정 페이지와 관련된 테스트 플로우 추출
   */
  private extractRelevantFlows(flows: any[], pageName: string): any[] {
    return flows.filter((flow) => {
      // 플로우의 단계에서 페이지 이름이 언급되는지 확인
      return flow.steps.some((step: any) => step.raw.includes(pageName));
    });
  }
}
