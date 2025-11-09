# 디자인 문서

## 개요

Playwright E2E 테스트 자동 생성 AI Agent는 사용자가 제공한 **정형화된 테스트 시나리오 문서**를 기반으로 Page Object Model 패턴을 따르는 테스트 코드를 생성합니다. Agent는 Anthropic Claude API를 사용하여 코드 생성을 수행하고, Playwright MCP를 통해 실시간으로 브라우저에서 검증하면서 선택자와 메서드를 완성합니다.

### 핵심 워크플로우

1. **테스트 시나리오 문서 입력**: 사용자가 페이지, 경로, 테스트 플로우가 정의된 문서 제공
2. **POM 껍데기 생성**: 문서 기반으로 페이지 객체와 선택자, 메서드 껍데기 생성 (메모리)
3. **테스트 파일 생성**: 껍데기 POM을 사용하여 테스트 코드 작성 (메모리)
4. **MCP 실시간 검증**: Playwright MCP로 브라우저를 띄워 테스트 실행하면서 선택자와 메서드 채워넣기
5. **실패 시 사용자 검토**: 특정 단계 실패 시 사용자에게 확인 요청
6. **최종 파일 저장**: 완성된 POM과 테스트 파일을 디스크에 저장

## 아키텍처

### 시스템 구성도

```
┌─────────────────────────────────────────────────────────────┐
│                         CLI Interface                        │
│                    (Commander.js + Inquirer)                 │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                      Agent Orchestrator                      │
│              (워크플로우 관리 및 단계별 실행)                │
└───────────────────────────┬─────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        ▼                   ▼                   ▼
┌───────────────┐  ┌────────────────┐  ┌──────────────────┐
│  Domain Doc   │  │  Page Object   │  │  Test Scenario   │
│   Manager     │  │    Generator   │  │    Composer      │
└───────┬───────┘  └────────┬───────┘  └────────┬─────────┘
        │                   │                    │
        └───────────────────┼────────────────────┘
                            ▼
                ┌───────────────────────┐
                │   LLM Service Layer   │
                │  (Anthropic + Cache)  │
                └───────────┬───────────┘
                            │
                ┌───────────┼───────────┬──────────────┐
                ▼           ▼           ▼              ▼
        ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────────┐
        │ Langfuse │ │   MCP    │ │Playwright│ │    File    │
        │ Tracking │ │  Client  │ │MCP Server│ │   System   │
        └──────────┘ └────┬─────┘ └────┬─────┘ └────────────┘
                          │            │
                          └────────────┘
                       (브라우저 자동화)
```

### MCP 통합 아키텍처

Agent는 **MCP (Model Context Protocol) Client**를 통해 **Microsoft Playwright MCP Server**와 통신하여 브라우저 자동화를 수행합니다. 이를 통해:

1. 브라우저 제어 로직을 직접 구현하지 않음
2. Playwright MCP의 검증된 도구 활용
3. 선택자 검증 및 요소 상호작용 자동화
4. 스크린샷 및 디버깅 기능 활용

### 주요 레이어

1. **CLI Layer**: 사용자 인터페이스 및 입력 처리
2. **Orchestration Layer**: 워크플로우 관리 및 단계별 실행 조율
3. **Service Layer**: 핵심 비즈니스 로직 (문서 관리, 페이지 객체 생성, 테스트 구성)
4. **LLM Layer**: AI 모델 호출 및 응답 처리
5. **Infrastructure Layer**: 외부 서비스 연동 (Langfuse, Playwright, 파일 시스템)

## 컴포넌트 및 인터페이스

### 1. CLI Interface

**책임**: 사용자와의 상호작용, 명령어 파싱, 설정 로드

```typescript
interface CLIOptions {
  scenario?: string;           // 테스트 시나리오 파일 경로
  domainDoc?: string;          // 도메인 지식 문서 경로
  config?: string;             // 설정 파일 경로
  pagesDir?: string;           // 페이지 객체 디렉토리
  testsDir?: string;           // 테스트 파일 디렉토리
  baseUrl?: string;            // 테스트 대상 URL
  interactive?: boolean;       // 대화형 모드 활성화
}

interface AgentConfig {
  pagesDirectory: string;      // 기본값: 'tests/pages'
  testsDirectory: string;      // 기본값: 'tests'
  mocksDirectory: string;      // 기본값: 'tests/mocks'
  baseUrl: string;
  anthropicApiKey: string;
  auth?: {
    enabled: boolean;
    emailEnvVar: string;       // 예: 'TEST_USER_EMAIL'
    passwordEnvVar: string;    // 예: 'TEST_USER_PASSWORD'
    loginPath: string;         // 예: '/login'
  };
  langfuseConfig?: {
    publicKey: string;
    secretKey: string;
    baseUrl?: string;
  };
}
```

**주요 기능**:
- 명령어 파싱 및 옵션 처리
- 설정 파일 로드 (`.e2e-agent.config.json`)
- 대화형 프롬프트 제공
- 진행 상황 표시

### 2. Agent Orchestrator

**책임**: 테스트 생성 워크플로우 관리, 단계별 실행 조율

```typescript
interface TestGenerationWorkflow {
  // 1단계: 테스트 시나리오 문서 로드
  loadScenarioDocument(filePath: string): Promise<ScenarioDocument>;
  
  // 2단계: 시나리오 문서 파싱
  parseScenarioDocument(document: ScenarioDocument): Promise<ParsedScenario>;
  
  // 3단계: POM 껍데기 생성 (메모리)
  generatePageObjectSkeletons(scenario: ParsedScenario): Promise<PageObjectSkeleton[]>;
  
  // 4단계: 테스트 파일 껍데기 생성 (메모리)
  generateTestFileSkeleton(
    scenario: ParsedScenario,
    pageObjects: PageObjectSkeleton[]
  ): Promise<TestFileSkeleton>;
  
  // 5단계: MCP 브라우저 세션 시작
  startMCPSession(): Promise<MCPSession>;
  
  // 6단계: 실시간 검증 및 채워넣기
  fillAndVerifyWithMCP(
    pageObjects: PageObjectSkeleton[],
    testFile: TestFileSkeleton,
    mcpSession: MCPSession
  ): Promise<VerificationResult>;
  
  // 7단계: 실패 처리 및 사용자 검토
  handleFailures(
    result: VerificationResult
  ): Promise<UserReviewResult>;
  
  // 8단계: 최종 파일 저장
  saveCompletedFiles(
    pageObjects: PageObject[],
    testFiles: TestFile[]
  ): Promise<void>;
}

interface WorkflowState {
  currentStep: WorkflowStep;
  scenarioDocument?: ScenarioDocument;
  parsedScenario?: ParsedScenario;
  pageObjectSkeletons: PageObjectSkeleton[];
  testFileSkeleton?: TestFileSkeleton;
  mcpSession?: MCPSession;
  verificationResult?: VerificationResult;
  completedPageObjects: PageObject[];
  completedTestFiles: TestFile[];
  errors: WorkflowError[];
}

enum WorkflowStep {
  LOAD_SCENARIO_DOCUMENT = 'load_scenario_document',
  PARSE_SCENARIO = 'parse_scenario',
  GENERATE_POM_SKELETONS = 'generate_pom_skeletons',
  GENERATE_TEST_SKELETON = 'generate_test_skeleton',
  START_MCP_SESSION = 'start_mcp_session',
  FILL_AND_VERIFY = 'fill_and_verify',
  HANDLE_FAILURES = 'handle_failures',
  SAVE_FILES = 'save_files',
  COMPLETE = 'complete'
}
```

### 테스트 시나리오 문서 형식

사용자가 제공하는 정형화된 문서 구조:

```markdown
# 테스트 시나리오: 로그인 플로우

## 페이지 정의

### LoginPage
- 경로: `/login`
- 설명: 사용자 로그인 페이지

### DashboardPage
- 경로: `/dashboard`
- 설명: 로그인 후 대시보드

## 테스트 플로우

### 성공적인 로그인
1. LoginPage로 이동
2. 이메일 입력 (test@example.com)
3. 비밀번호 입력 (password123)
4. 로그인 버튼 클릭
5. DashboardPage로 리다이렉트 확인
6. 환영 메시지 확인

### 실패한 로그인
1. LoginPage로 이동
2. 잘못된 이메일 입력
3. 로그인 버튼 클릭
4. 에러 메시지 확인
```

### 3. Domain Document Manager

**책임**: 도메인 지식 문서 읽기, 파싱, 업데이트

```typescript
interface DomainKnowledge {
  pages: PageInfo[];
  flows: TestFlow[];
  domainSpecificInfo: Record<string, any>;
}

interface PageInfo {
  name: string;
  path?: string;
  description?: string;
  accessMethod?: string;
}

interface TestFlow {
  name: string;
  steps: string[];
  prerequisites?: string[];
}

class DomainDocumentManager {
  async load(filePath: string): Promise<DomainKnowledge | null>;
  async parse(content: string): Promise<DomainKnowledge>;
  async update(knowledge: DomainKnowledge, filePath: string): Promise<void>;
  async suggest(newInfo: Partial<DomainKnowledge>): Promise<boolean>;
}
```

### 4. Page Object Generator

**책임**: 페이지 객체 클래스 생성, 경로 추론, 테스트 플로우 기반 요소 식별

```typescript
interface PageObject {
  name: string;
  path: string;
  className: string;
  elements: ElementDefinition[];
  mockingConfig?: MockingConfig;
  screenshots?: ScreenshotResult[];
  filePath: string;
}

interface ElementDefinition {
  name: string;
  purpose: string;  // 테스트 플로우에서의 역할 설명
  selector: ElementSelector;
  type: 'button' | 'input' | 'text' | 'link' | 'select' | 'checkbox' | 'radio';
  verified: boolean;  // MCP로 검증 완료 여부
}

interface ElementSelector {
  strategy: SelectorStrategy;
  value: string;
  placeholder?: boolean;  // Phase 1에서는 임시 선택자
  options?: Record<string, any>;
}

enum SelectorStrategy {
  TEST_ID = 'testId',      // 최우선
  ID = 'id',
  PLACEHOLDER = 'placeholder',
  ROLE = 'role',
  LABEL = 'label',
  TEXT = 'text',
  CSS = 'css',
  XPATH = 'xpath'
}

class PageObjectGenerator {
  async identifyPages(scenario: ScenarioAnalysis): Promise<string[]>;
  async inferPath(pageName: string, domainKnowledge?: DomainKnowledge): Promise<string>;
  async confirmPath(pageName: string, inferredPath: string): Promise<string>;
  
  // Phase 1: 테스트 플로우 기반 요소 식별
  async identifyRequiredElements(
    scenario: ScenarioAnalysis,
    pageName: string
  ): Promise<RequiredElement[]>;
  
  // Phase 1: 임시 선택자로 페이지 객체 생성
  async generateClassWithPlaceholders(
    pageObject: PageObject,
    requiredElements: RequiredElement[]
  ): Promise<string>;
  
  // Phase 2: MCP로 실제 선택자 찾기 및 업데이트
  async updateSelectorsWithMCP(
    pageObject: PageObject,
    mcpService: PlaywrightMCPService
  ): Promise<PageObject>;
  
  async writeToFile(pageObject: PageObject, code: string): Promise<void>;
}
```

**페이지 객체 생성 전략 (메모리 기반 워크플로우)**:

#### 1단계: 시나리오 문서 파싱
- 사용자가 제공한 정형화된 문서에서 정보 추출
- 페이지 목록, 경로, 테스트 플로우 파싱
- 각 플로우에서 필요한 요소 식별

#### 2단계: LLM 기반 POM Skeleton 코드 생성

**시나리오 문서 예시:**
```markdown
# 로그인 테스트

## 1. 로그인 페이지에서 로그인을 한다
1) 휴대폰 번호 인풋에 값을 입력하고
2) 비밀번호 인풋에 입력하고
3) 로그인 버튼을 누른다

## 2. 로그인 완료 후 메인페이지로 이동했는지 확인한다
1) 이동한 경로가 '/'인지 확인한다
2) 페이지에 '메인페이지' 텍스트가 있는지 확인한다
```

**LLM 분석 결과:**
- **필요한 페이지**: LoginPage, MainPage
- **LoginPage 요소**: phoneNumberInput, passwordInput, loginButton
- **MainPage 요소**: mainPageText
- **필수 메서드**: 
  - 모든 POM: `goto()`, `isOnPage()`
  - LoginPage: `fillPhoneNumber()`, `fillPassword()`, `clickLoginButton()`
  - MainPage: `isMainPageDisplayed()`

**생성되는 POM Skeleton (TypeScript 코드):**

```typescript
// LoginPage.ts
import { Page, Locator } from '@playwright/test';
import { BasePage } from './BasePage';

export class LoginPage extends BasePage {
  readonly phoneNumberInput: Locator;
  readonly passwordInput: Locator;
  readonly loginButton: Locator;
  
  constructor(page: Page) {
    super(page);
    // PLACEHOLDER: MCP로 실제 선택자 찾기
    this.phoneNumberInput = this.page.locator('PLACEHOLDER_phoneNumberInput');
    this.passwordInput = this.page.locator('PLACEHOLDER_passwordInput');
    this.loginButton = this.page.locator('PLACEHOLDER_loginButton');
  }
  
  async goto() {
    await this.page.goto('/login');
  }
  
  async isOnPage(): Promise<boolean> {
    return this.page.url().includes('/login');
  }
  
  async fillPhoneNumber(phoneNumber: string) {
    // TODO: MCP로 구현
    await this.phoneNumberInput.fill(phoneNumber);
  }
  
  async fillPassword(password: string) {
    // TODO: MCP로 구현
    await this.passwordInput.fill(password);
  }
  
  async clickLoginButton() {
    // TODO: MCP로 구현
    await this.loginButton.click();
  }
}

// MainPage.ts
export class MainPage extends BasePage {
  readonly mainPageText: Locator;
  
  constructor(page: Page) {
    super(page);
    this.mainPageText = this.page.locator('PLACEHOLDER_mainPageText');
  }
  
  async goto() {
    await this.page.goto('/');
  }
  
  async isOnPage(): Promise<boolean> {
    return this.page.url() === '/';
  }
  
  async isMainPageDisplayed(): Promise<boolean> {
    // TODO: MCP로 구현
    return await this.mainPageText.isVisible();
  }
}
```

#### 3단계: 테스트 파일 Skeleton 생성

**생성되는 테스트 코드:**
```typescript
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
```

**핵심 규칙:**
1. **test.describe**: 테스트 시나리오 전체 (예: "로그인 테스트")
2. **test.step**: 각 주요 단계 (예: "1. 로그인 페이지에서 로그인")
3. **필수 POM 메서드**: 
   - `goto()`: 해당 페이지로 이동
   - `isOnPage()`: 현재 페이지 경로 확인
4. **요소 선택자**: PLACEHOLDER로 시작, Phase 3에서 MCP로 실제 선택자 찾기
5. **메서드 구현**: TODO 주석, Phase 3에서 MCP로 실제 동작 검증

#### 4단계: MCP 실시간 검증 및 채워넣기

**프로세스**:
1. **MCP 브라우저 세션 시작**
2. **테스트 실행 시뮬레이션**
   - 테스트 플로우를 순서대로 실행
   - 각 단계에서 필요한 선택자를 실시간으로 찾기
   
3. **선택자 찾기 및 검증**
   ```typescript
   // 예: "LoginPage로 이동" 단계
   await mcpSession.navigate('/login');
   
   // 예: "이메일 입력" 단계
   const emailSelector = await findAndVerifySelector({
     purpose: '이메일 입력',
     type: 'input',
     candidates: [
       'getByTestId("email")',
       'getByPlaceholder("이메일")',
       'getByRole("textbox", { name: "이메일" })'
     ]
   });
   
   // 찾은 선택자로 실제 동작 수행
   await mcpSession.fill(emailSelector, 'test@example.com');
   
   // 성공하면 skeleton에 채워넣기
   loginPageSkeleton.elements[0].selector = emailSelector;
   ```

4. **메서드 구현 생성**
   - 검증된 선택자를 사용하여 메서드 구현 생성
   ```typescript
   loginPageSkeleton.methods[0].implementation = `
     async login(email: string, password: string) {
       await this.emailInput.fill(email);
       await this.passwordInput.fill(password);
       await this.loginButton.click();
     }
   `;
   ```

5. **실패 처리**
   - 선택자를 찾지 못하거나 동작 실패 시
   - 사용자에게 검토 요청
   ```typescript
   if (!emailSelector) {
     const userInput = await promptUser({
       message: '이메일 입력 필드를 찾을 수 없습니다.',
       options: [
         '1. 다른 선택자 시도',
         '2. 수동으로 선택자 입력',
         '3. 이 단계 건너뛰기'
       ]
     });
   }
   ```

#### 5단계: 최종 파일 생성 및 저장

모든 선택자와 메서드가 채워진 후:
```typescript
// 완성된 PageObject 생성
class LoginPage extends BasePage {
  emailInput = this.page.getByPlaceholder('이메일을 입력하세요');
  passwordInput = this.page.getByPlaceholder('비밀번호');
  loginButton = this.page.getByRole('button', { name: '로그인' });
  
  async goto() {
    await this.page.goto('/login');
  }
  
  async login(email: string, password: string) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.loginButton.click();
  }
}

// 파일로 저장
await fs.writeFile('tests/pages/LoginPage.ts', generatedCode);
```

**핵심 장점**:
- ✅ 파일 읽기/쓰기 최소화 (최종 완성본만 저장)
- ✅ 실시간 검증으로 정확도 높음
- ✅ 테스트 플로우 순서대로 진행하여 자연스러움
- ✅ 실패 시점에 즉시 사용자 개입 가능
- ✅ 메모리에서 작업하므로 빠름

**선택자 우선순위**:
1. `data-testid` 속성 (최우선)
2. `role`과 `name` 조합 (접근성 우선)
3. `placeholder` 속성 (입력 필드)
4. `id` 속성
5. `label` 연결
6. `text` 내용
7. CSS 선택자 (최후의 수단)

**필수 메서드**:
- `goto()`: 페이지로 이동
- `isOnPage()`: 현재 경로 확인
- 공통 동작 메서드: BasePage에서 상속 (fillInput, clickElement 등)
- 페이지별 동작 메서드: 테스트 플로우 기반 생성 (login, submit 등)

**장점**:
- ✅ 깊은 컴포넌트 구조에서도 필요한 요소만 집중
- ✅ LLM이 모든 요소를 탐색할 필요 없음
- ✅ Phase 1에서 빠르게 구조 생성, Phase 2에서 정확도 향상
- ✅ 사용자가 테스트 플로우를 명확히 정의하면 더 정확한 결과

### 5. MCP Client Service

**책임**: MCP 서버와 통신, Playwright 도구 호출

```typescript
interface MCPClient {
  connect(serverConfig: MCPServerConfig): Promise<void>;
  disconnect(): Promise<void>;
  callTool(toolName: string, params: any): Promise<MCPToolResult>;
  listTools(): Promise<MCPTool[]>;
}

interface MCPServerConfig {
  command: string;
  args: string[];
  env?: Record<string, string>;
}

interface MCPTool {
  name: string;
  description: string;
  inputSchema: any;
}

interface MCPToolResult {
  content: any;
  isError: boolean;
}

// Playwright MCP 도구 래퍼
class PlaywrightMCPService {
  private mcpClient: MCPClient;
  
  async navigate(url: string): Promise<void>;
  async screenshot(selector?: string): Promise<string>;
  async click(selector: string): Promise<void>;
  async fill(selector: string, value: string): Promise<void>;
  async getText(selector: string): Promise<string>;
  async getAttribute(selector: string, attribute: string): Promise<string>;
  async evaluate(script: string): Promise<any>;
  
  // 선택자 검증용
  async verifySelector(selector: string): Promise<boolean>;
  async findElements(selectorCandidates: string[]): Promise<SelectorVerificationResult[]>;
}

interface SelectorVerificationResult {
  selector: string;
  found: boolean;
  count: number;
  error?: string;
}
```

### 6. Selector Determiner

**책임**: 요소 선택자 결정, MCP를 통한 검증, 사용자 확인

```typescript
interface SelectorAnalysis {
  element: string;
  candidates: SelectorCandidate[];
  recommended: ElementSelector;
  verified: boolean;
}

interface SelectorCandidate {
  selector: ElementSelector;
  score: number;
  pros: string[];
  cons: string[];
}

class SelectorDeterminer {
  private mcpService: PlaywrightMCPService;
  
  async analyzePage(url: string, elementDescription: string): Promise<SelectorAnalysis>;
  async verifySelector(selector: ElementSelector): Promise<boolean>;
  async requestUserConfirmation(analysis: SelectorAnalysis): Promise<ElementSelector>;
  async tryAlternatives(candidates: SelectorCandidate[]): Promise<ElementSelector>;
  
  // MCP를 통한 실제 검증
  private async verifySelectorWithMCP(selector: string): Promise<boolean>;
  private async captureScreenshot(selector?: string): Promise<string>;
}
```

### 7. Authentication Service

**책임**: 자동 로그인 감지 및 처리, 환경변수 기반 인증 관리

```typescript
interface AuthConfig {
  enabled: boolean;
  emailEnvVar: string;
  passwordEnvVar: string;
  loginPath: string;
}

interface LoginFlow {
  steps: LoginStep[];
  successIndicator: string;  // 로그인 성공 확인 방법
}

interface LoginStep {
  action: 'navigate' | 'fill' | 'click' | 'wait';
  selector?: string;
  value?: string;
  target?: string;
}

class AuthenticationService {
  private config: AuthConfig;
  private mcpService: PlaywrightMCPService;
  
  // 로그인 필요 여부 감지
  async detectAuthRequired(currentUrl: string, response?: any): Promise<boolean>;
  
  // 환경변수에서 인증 정보 로드
  async loadCredentials(): Promise<{ email: string; password: string }>;
  
  // 도메인 문서에서 로그인 플로우 추출
  async extractLoginFlow(domainKnowledge: DomainKnowledge): Promise<LoginFlow>;
  
  // 자동 로그인 수행
  async performAutoLogin(loginFlow: LoginFlow, credentials: any): Promise<boolean>;
  
  // 테스트에 로그인 단계 추가
  async addLoginToTest(testFile: TestFile): Promise<TestFile>;
  
  // .env 파일 생성
  async createEnvTemplate(projectPath: string): Promise<void>;
  
  // .gitignore 업데이트
  async updateGitignore(projectPath: string): Promise<void>;
}
```

### 8. Mocking Management Service

**책임**: Mocking 공통화 및 재사용 관리

```typescript
interface MockingAnalysis {
  endpoint: string;
  usedInPages: string[];
  canBeShared: boolean;
  mockingCode: string;
}

class MockingManagementService {
  private testsDirectory: string;
  private mocksDirectory: string;
  
  // 테스트 디렉토리에서 API 엔드포인트 검색
  async searchExistingMocks(endpoint: string): Promise<MockingAnalysis[]>;
  
  // 공통 mocking 추출 제안
  async suggestCommonMocking(analyses: MockingAnalysis[]): Promise<string[]>;
  
  // 공통 mocking 파일 생성
  async createCommonMock(endpoint: string, mockingCode: string): Promise<string>;
  
  // 페이지 객체에서 공통 mocking import
  async updatePageObjectToUseCommonMock(
    pageObject: PageObject,
    commonMockPath: string
  ): Promise<void>;
  
  // 기존 공통 mocking 확인
  async findReusableMocks(dependencies: PageDependencies): Promise<Map<string, string>>;
}
```

### 9. Screenshot and Mocking Service

**책임**: 페이지별 스크린샷 생성, API/스토리지 Mocking 관리

```typescript
interface MockingConfig {
  api: ApiMock[];
  storage: StorageMock;
  scenarios: string[];  // 'success', 'error', 'loading' 등
}

interface ApiMock {
  endpoint: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  response: {
    status: number;
    body: any;
  };
  condition?: string;  // 시나리오 조건
}

interface StorageMock {
  localStorage?: Record<string, string>;
  sessionStorage?: Record<string, string>;
  cookies?: Array<{ name: string; value: string }>;
}

interface ScreenshotConfig {
  devices: DeviceConfig[];
  outputDir: string;
  scenarios?: string[];
}

interface DeviceConfig {
  name: 'pc' | 'mobile' | 'tablet';
  viewport: { width: number; height: number };
}

class ScreenshotMockingService {
  private mcpService: PlaywrightMCPService;
  private llmService: LLMService;
  
  // 페이지 의존성 분석
  async analyzePageDependencies(pageCode: string): Promise<PageDependencies>;
  
  // Mocking 설정 확인
  async checkExistingMocks(pageObject: PageObject): Promise<MockingConfig | null>;
  
  // Mocking 설정 생성
  async generateMockingConfig(dependencies: PageDependencies): Promise<MockingConfig>;
  
  // POM에 Mocking 메서드 추가
  async addMockingToPageObject(pageObject: PageObject, config: MockingConfig): Promise<void>;
  
  // 스크린샷 생성
  async captureScreenshots(
    pageObject: PageObject,
    config: ScreenshotConfig
  ): Promise<ScreenshotResult[]>;
  
  // Mocking 적용 및 페이지 로드
  private async loadPageWithMocks(
    url: string,
    mockConfig: MockingConfig,
    scenario: string
  ): Promise<void>;
}

interface PageDependencies {
  apiEndpoints: string[];
  storageKeys: {
    localStorage: string[];
    sessionStorage: string[];
  };
  requiredData: Record<string, any>;
}

interface ScreenshotResult {
  device: string;
  scenario: string;
  path: string;
  success: boolean;
}
```

### 8. Test Scenario Composer

**책임**: 테스트 파일 생성, 시나리오 구성, 검증

```typescript
interface TestFile {
  name: string;
  filePath: string;
  imports: string[];
  describes: TestDescribe[];
}

interface TestDescribe {
  description: string;
  tests: TestCase[];
  beforeEach?: string;
  afterEach?: string;
}

interface TestCase {
  description: string;
  steps: TestStep[];
  assertions: string[];
}

interface TestStep {
  action: string;
  pageObject: string;
  method: string;
  parameters?: any[];
}

class TestScenarioComposer {
  async composeTest(scenario: ScenarioAnalysis, pageObjects: PageObject[]): Promise<TestFile>;
  async generateImports(pageObjects: PageObject[]): string[];
  async generateTestCases(scenario: ScenarioAnalysis): Promise<TestCase[]>;
  async addWaitConditions(testCase: TestCase): Promise<TestCase>;
  async writeTestFile(testFile: TestFile): Promise<void>;
  async verifyTest(testFile: TestFile): Promise<boolean>;
}
```

### 9. LLM Service Layer

**책임**: Anthropic API 호출, 프롬프트 관리, 응답 파싱, 캐싱

**모델 선택: Claude 3.5 Sonnet**

Claude 3.5 Sonnet을 주 모델로 선택한 이유:
1. **코드 생성 품질**: TypeScript/Playwright 코드 생성 우수
2. **긴 컨텍스트**: 200K 토큰 - 도메인 문서, 기존 페이지 객체 모두 포함
3. **Prompt Caching**: 반복되는 컨텍스트(시스템 프롬프트, 도메인 지식) 캐싱으로 비용 90% 절감
4. **구조화된 추론**: 단계별 분석 및 코드 생성에 탁월
5. **비용 효율성**: GPT-4 대비 저렴하면서 성능 우수

```typescript
interface LLMService {
  chat(messages: Message[], options?: LLMOptions): Promise<LLMResponse>;
  generateCode(prompt: string, context?: any): Promise<string>;
  analyzeScenario(scenario: string, domainKnowledge?: DomainKnowledge): Promise<ScenarioAnalysis>;
  inferPagePath(pageName: string, context?: any): Promise<string>;
  selectBestSelector(candidates: SelectorCandidate[]): Promise<ElementSelector>;
}

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface LLMOptions {
  model?: string;              // 기본값: 'claude-3-5-sonnet-20241022'
  maxTokens?: number;
  temperature?: number;
  cacheControl?: boolean;      // Prompt caching 활성화
  traceId?: string;            // Langfuse trace ID
}

interface LLMResponse {
  content: string;
  usage: {
    inputTokens: number;
    outputTokens: number;
    cacheReadTokens?: number;
    cacheCreationTokens?: number;
  };
  traceId?: string;
}

class AnthropicLLMService implements LLMService {
  private client: Anthropic;
  private langfuse?: LangfuseClient;
  private promptCache: Map<string, CachedPrompt>;
  
  async chat(messages: Message[], options?: LLMOptions): Promise<LLMResponse>;
  private buildSystemPrompt(): string;
  private trackWithLangfuse(request: any, response: any, traceId: string): Promise<void>;
}
```

**향후 확장:**
- 추상화 레이어를 통해 GPT-4, Gemini 등 다른 모델 지원 가능
- 설정 파일에서 모델 선택 가능하도록 구현

## 데이터 모델

### ScenarioAnalysis

```typescript
interface ScenarioAnalysis {
  objective: string;
  pages: string[];
  userFlows: UserFlow[];
  requiredElements: RequiredElement[];
  assertions: string[];
}

interface UserFlow {
  name: string;
  steps: FlowStep[];
}

interface FlowStep {
  page: string;
  action: string;
  element?: string;
  data?: any;
}

interface RequiredElement {
  page: string;
  element: string;
  purpose: string;
  interactionType: 'click' | 'fill' | 'select' | 'check' | 'read';
}
```

### Configuration

```typescript
interface E2EAgentConfig {
  // 파일 경로 설정
  paths: {
    pages: string;
    tests: string;
    domainDoc?: string;
  };
  
  // 테스트 설정
  test: {
    baseUrl: string;
    timeout?: number;
    retries?: number;
  };
  
  // LLM 설정
  llm: {
    provider: 'anthropic';
    apiKey: string;
    model?: string;
    caching?: boolean;
  };
  
  // 모니터링 설정
  monitoring?: {
    langfuse?: {
      publicKey: string;
      secretKey: string;
      baseUrl?: string;
    };
  };
  
  // 선택자 우선순위
  selectorPriority?: SelectorStrategy[];
}
```

## 에러 처리

### 에러 타입

```typescript
enum ErrorType {
  CONFIGURATION_ERROR = 'configuration_error',
  LLM_ERROR = 'llm_error',
  BROWSER_ERROR = 'browser_error',
  FILE_SYSTEM_ERROR = 'file_system_error',
  VALIDATION_ERROR = 'validation_error',
  USER_CANCELLATION = 'user_cancellation'
}

interface AgentError {
  type: ErrorType;
  message: string;
  details?: any;
  recoverable: boolean;
  suggestedAction?: string;
}

class ErrorHandler {
  handle(error: AgentError): void;
  recover(error: AgentError, state: WorkflowState): Promise<WorkflowState>;
  report(error: AgentError): void;
}
```

### 에러 복구 전략

1. **LLM 에러**: 재시도 (최대 3회), 대체 프롬프트 사용
2. **브라우저 에러**: 브라우저 재시작, 대체 선택자 시도
3. **파일 시스템 에러**: 권한 확인, 경로 검증, 사용자 안내
4. **검증 에러**: 사용자에게 수정 요청, 이전 단계로 롤백

## 테스트 전략

### 단위 테스트

- 각 서비스 클래스의 메서드 테스트
- Mock을 사용한 외부 의존성 격리
- 엣지 케이스 및 에러 시나리오 테스트

### 통합 테스트

- 워크플로우 전체 실행 테스트
- LLM 응답 파싱 및 처리 테스트
- 파일 생성 및 검증 테스트

### E2E 테스트

- 실제 웹사이트에 대한 테스트 생성
- 생성된 테스트 코드 실행 검증
- CLI 명령어 실행 테스트

## 기술 스택

### 핵심 라이브러리

- **TypeScript**: 타입 안전성 및 개발 생산성
- **Node.js**: 런타임 환경
- **Anthropic SDK** (`@anthropic-ai/sdk`): Claude API 호출
- **Langfuse** (`langfuse`): LLM 호출 추적 및 모니터링
- **MCP SDK** (`@modelcontextprotocol/sdk`): MCP 클라이언트 구현
- **Microsoft Playwright MCP Server**: 브라우저 자동화 (외부 프로세스)
- **Playwright** (`@playwright/test`): 테스트 프레임워크 (코드 생성용)
- **Commander.js** (`commander`): CLI 인터페이스
- **Inquirer.js** (`inquirer`): 대화형 프롬프트
- **Zod**: 스키마 검증 및 타입 안전성

### 개발 도구

- **Vitest**: 테스트 프레임워크
- **ESLint**: 코드 품질 검사
- **Prettier**: 코드 포맷팅
- **tsx**: TypeScript 실행

## 프롬프트 엔지니어링

### 시스템 프롬프트 구조

```typescript
const SYSTEM_PROMPT = `
You are an expert E2E test engineer specializing in Playwright and the Page Object Model pattern.

Your responsibilities:
1. Analyze test scenarios and identify required pages
2. Generate clean, maintainable page object classes
3. Select optimal element selectors following best practices
4. Create comprehensive test scenarios

Guidelines:
- Follow Playwright best practices
- Prioritize accessibility-based selectors (getByRole, getByLabel)
- Use TypeScript for type safety
- Include proper error handling and waits
- Write clear, descriptive test names

Context:
{domain_knowledge}
{existing_pages}
`;
```

### 프롬프트 캐싱 전략

Anthropic의 Prompt Caching을 활용하여 비용 절감:

1. **시스템 프롬프트**: 전체 세션 동안 캐시
2. **도메인 지식**: 변경되지 않는 한 캐시
3. **기존 페이지 객체**: 새로운 페이지 생성 시 캐시

```typescript
const cachedMessages = [
  {
    role: 'system',
    content: SYSTEM_PROMPT,
    cache_control: { type: 'ephemeral' }
  },
  {
    role: 'user',
    content: domainKnowledgeContext,
    cache_control: { type: 'ephemeral' }
  }
];
```

## MCP 통합 상세

### MCP 서버 설정

Agent는 시작 시 Playwright MCP 서버를 자동으로 실행합니다:

```typescript
const MCP_SERVER_CONFIG: MCPServerConfig = {
  command: 'npx',
  args: ['-y', '@modelcontextprotocol/server-playwright'],
  env: {
    // 필요한 환경 변수
  }
};
```

### 활용 가능한 Playwright MCP 도구

1. **playwright_navigate**
   - 용도: 페이지 이동 및 경로 검증
   - 사용 시점: 페이지 객체 경로 확인, 테스트 실행

2. **playwright_click / playwright_fill**
   - 용도: 선택자 검증 (요소 존재 확인)
   - 사용 시점: 선택자 결정 단계

3. **playwright_screenshot**
   - 용도: 페이지 상태 캡처, 사용자에게 시각적 피드백
   - 사용 시점: 선택자 확인 요청 시

4. **playwright_evaluate**
   - 용도: 페이지 구조 분석, 요소 정보 추출
   - 사용 시점: 선택자 후보 생성

5. **playwright_get_text / playwright_get_attribute**
   - 용도: 요소 정보 확인
   - 사용 시점: 선택자 검증

### MCP 통신 플로우

```
Agent → MCP Client → Playwright MCP Server → Playwright Browser
  ↓                                                    ↓
  ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ←
              (결과 반환)
```

### 선택자 검증 워크플로우 (MCP 활용)

```typescript
async function verifySelectorsWithMCP(
  url: string,
  selectorCandidates: SelectorCandidate[]
): Promise<SelectorAnalysis> {
  // 1. 페이지 이동
  await mcpService.navigate(url);
  
  // 2. 각 선택자 후보 검증
  const results = await Promise.all(
    selectorCandidates.map(async (candidate) => {
      try {
        // 선택자로 요소 찾기 시도
        const text = await mcpService.getText(candidate.selector.value);
        return {
          selector: candidate,
          found: true,
          text
        };
      } catch (error) {
        return {
          selector: candidate,
          found: false,
          error: error.message
        };
      }
    })
  );
  
  // 3. 스크린샷 캡처 (사용자 확인용)
  const screenshot = await mcpService.screenshot();
  
  // 4. 결과 분석 및 추천
  return analyzeResults(results, screenshot);
}
```

## 배포 및 패키징

### NPM 패키지

```json
{
  "name": "@your-org/playwright-e2e-agent",
  "version": "1.0.0",
  "bin": {
    "e2e-agent": "./dist/cli.js"
  },
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts"
}
```

### 설치 및 사용

```bash
# 설치
npm install -g @your-org/playwright-e2e-agent

# 초기 설정 (MCP 서버 자동 설치 포함)
e2e-agent init

# 테스트 생성
e2e-agent generate --scenario ./scenarios/login.md

# 대화형 모드
e2e-agent interactive
```

### 의존성

Agent 실행 시 자동으로 다음을 설치/실행:
- `@modelcontextprotocol/server-playwright` (MCP 서버)
- Playwright 브라우저 (Chromium)

## 향후 개선 사항

1. **멀티 LLM 지원**: GPT-4, Gemini 등 다른 모델 선택 가능
2. **멀티 브라우저 지원**: Chromium, Firefox, WebKit
3. **병렬 테스트 생성**: 여러 시나리오 동시 처리
4. **테스트 리팩토링**: 기존 테스트 개선 제안
5. **시각적 회귀 테스트**: 스크린샷 비교 기능
6. **CI/CD 통합**: GitHub Actions, GitLab CI 템플릿
7. **웹 UI**: 브라우저 기반 인터페이스
