# 디자인 문서

## 개요

Playwright E2E 테스트 자동 생성 AI Agent는 사용자가 제공한 테스트 시나리오와 도메인 지식을 기반으로 Page Object Model 패턴을 따르는 테스트 코드를 생성합니다. Agent는 Anthropic Claude API를 사용하여 자연어 처리 및 코드 생성을 수행하고, Langfuse를 통해 LLM 호출을 추적 및 모니터링합니다.

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
  // 1단계: 도메인 지식 로드 및 인증 설정
  loadDomainKnowledge(): Promise<DomainKnowledge | null>;
  loadAuthConfig(): Promise<AuthConfig | null>;
  
  // 2단계: 테스트 시나리오 분석
  analyzeScenario(scenario: string): Promise<ScenarioAnalysis>;
  
  // 3단계: 페이지 객체 생성
  generatePageObjects(analysis: ScenarioAnalysis): Promise<PageObject[]>;
  
  // 4단계: 요소 선택자 결정 (자동 로그인 포함)
  determineSelectors(pageObject: PageObject): Promise<ElementSelector[]>;
  
  // 5단계: Mocking 설정 및 스크린샷 생성
  setupMockingAndScreenshots(pageObject: PageObject): Promise<void>;
  checkAndShareCommonMocks(): Promise<void>;
  
  // 6단계: 테스트 동작 생성
  generateActions(pageObject: PageObject): Promise<PageAction[]>;
  
  // 7단계: 테스트 시나리오 구성 (로그인 단계 포함)
  composeTestScenario(pageObjects: PageObject[]): Promise<TestFile>;
  
  // 8단계: 문서 업데이트
  updateDocumentation(pageObjects: PageObject[]): Promise<void>;
}

interface WorkflowState {
  currentStep: WorkflowStep;
  domainKnowledge?: DomainKnowledge;
  scenarioAnalysis?: ScenarioAnalysis;
  pageObjects: PageObject[];
  testFiles: TestFile[];
  errors: WorkflowError[];
}

enum WorkflowStep {
  LOAD_DOMAIN_KNOWLEDGE = 'load_domain_knowledge',
  LOAD_AUTH_CONFIG = 'load_auth_config',
  ANALYZE_SCENARIO = 'analyze_scenario',
  GENERATE_PAGE_OBJECTS = 'generate_page_objects',
  DETERMINE_SELECTORS = 'determine_selectors',
  AUTO_LOGIN_IF_NEEDED = 'auto_login_if_needed',
  SETUP_MOCKING_SCREENSHOTS = 'setup_mocking_screenshots',
  CHECK_COMMON_MOCKS = 'check_common_mocks',
  GENERATE_ACTIONS = 'generate_actions',
  COMPOSE_TEST = 'compose_test',
  UPDATE_DOCUMENTATION = 'update_documentation',
  COMPLETE = 'complete'
}
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

**책임**: 페이지 객체 클래스 생성, 경로 추론, 사용자 확인

```typescript
interface PageObject {
  name: string;
  path: string;
  className: string;
  elements: ElementDefinition[];
  actions: PageAction[];
  mockingConfig?: MockingConfig;
  screenshots?: ScreenshotResult[];
  filePath: string;
}

interface ElementDefinition {
  name: string;
  selector: ElementSelector;
  type: 'button' | 'input' | 'text' | 'link' | 'custom';
}

interface ElementSelector {
  strategy: SelectorStrategy;
  value: string;
  options?: Record<string, any>;
}

enum SelectorStrategy {
  ROLE = 'role',
  PLACEHOLDER = 'placeholder',
  LABEL = 'label',
  TEXT = 'text',
  TEST_ID = 'testId',
  CSS = 'css',
  XPATH = 'xpath'
}

interface PageAction {
  name: string;
  type: 'navigation' | 'interaction' | 'assertion';
  parameters: ActionParameter[];
  implementation: string;
}

class PageObjectGenerator {
  async identifyPages(scenario: ScenarioAnalysis): Promise<string[]>;
  async inferPath(pageName: string, domainKnowledge?: DomainKnowledge): Promise<string>;
  async confirmPath(pageName: string, inferredPath: string): Promise<string>;
  async generateClass(pageObject: PageObject): Promise<string>;
  async writeToFile(pageObject: PageObject, code: string): Promise<void>;
}
```

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
