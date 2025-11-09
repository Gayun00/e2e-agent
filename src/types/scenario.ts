/**
 * 시나리오 문서 파싱 결과 타입 정의
 */

export interface ScenarioDocument {
  pages: PageDefinition[];
  flows: TestFlow[];
}

export interface PageDefinition {
  name: string;           // 예: 'LoginPage'
  path: string;           // 예: '/login'
  description?: string;   // 예: '사용자 로그인 페이지'
}

export interface TestFlow {
  name: string;           // 예: '성공적인 로그인'
  purpose?: string;       // 예: '올바른 계정 정보로 로그인이 정상적으로 동작하는지 확인'
  steps: TestStep[];
}

export interface TestStep {
  order: number;          // 단계 순서
  raw: string;            // 원본 텍스트
  action: StepAction;     // 파싱된 동작 타입
  target?: string;        // 동작 대상 (예: '이메일', '로그인 버튼')
  value?: string;         // 입력 값 (예: 'test@example.com')
  page?: string;          // 페이지 이름 (예: 'LoginPage')
  assertion?: string;     // 검증 내용 (예: '안녕하세요')
}

export enum StepAction {
  NAVIGATE = 'navigate',           // 페이지 이동
  INPUT = 'input',                 // 입력
  CLICK = 'click',                 // 클릭
  VERIFY_URL = 'verify_url',       // URL 확인
  VERIFY_TEXT = 'verify_text',     // 텍스트 확인
  VERIFY_VISIBLE = 'verify_visible', // 요소 표시 확인
  WAIT = 'wait',                   // 대기
  SELECT = 'select',               // 선택
}

/**
 * 파싱된 시나리오를 기반으로 생성할 구조
 */
export interface ParsedScenario {
  document: ScenarioDocument;
  pageObjects: PageObjectSpec[];
  testFiles: TestFileSpec[];
}

export interface PageObjectSpec {
  name: string;
  path: string;
  description?: string;
  requiredElements: ElementSpec[];
  requiredMethods: MethodSpec[];
}

export interface ElementSpec {
  name: string;           // 예: 'emailInput'
  purpose: string;        // 예: '이메일 입력'
  type: ElementType;      // 예: 'input'
  usedInSteps: number[];  // 어느 단계에서 사용되는지
}

export enum ElementType {
  INPUT = 'input',
  BUTTON = 'button',
  LINK = 'link',
  TEXT = 'text',
  SELECT = 'select',
  CHECKBOX = 'checkbox',
  RADIO = 'radio',
}

export interface MethodSpec {
  name: string;           // 예: 'login'
  purpose: string;        // 예: '이메일과 비밀번호로 로그인'
  parameters: ParameterSpec[];
  steps: string[];        // 메서드 내부 단계 설명
}

export interface ParameterSpec {
  name: string;           // 예: 'email'
  type: 'string' | 'number' | 'boolean';
  description?: string;
}

export interface TestFileSpec {
  name: string;           // 예: 'login-flow'
  describes: TestDescribeSpec[];
}

export interface TestDescribeSpec {
  description: string;    // 예: '로그인 플로우'
  tests: TestCaseSpec[];
}

export interface TestCaseSpec {
  description: string;    // 예: '성공적인 로그인'
  purpose?: string;
  steps: TestStepSpec[];
}

export interface TestStepSpec {
  order: number;
  description: string;
  pageObject: string;     // 사용할 페이지 객체
  action: string;         // 수행할 동작
  parameters?: any[];
  assertion?: AssertionSpec;
}

export interface AssertionSpec {
  type: 'url' | 'text' | 'visible' | 'count' | 'value';
  expected: any;
  message?: string;
}
