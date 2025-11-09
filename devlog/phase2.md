# Phase 2: 시나리오 문서 기반 Skeleton 생성 개발 로그

## 개요

Phase 2의 목표는 사용자가 제공한 정형화된 시나리오 문서를 파싱하여 Page Object와 테스트 파일의 skeleton을 메모리에 생성하는 것입니다. 이 단계에서는 실제 선택자 대신 PLACEHOLDER를 사용하며, Phase 3에서 MCP를 통해 실제 선택자로 채워넣습니다.

---

## 7. 시나리오 문서 파서

### 7.1 시나리오 문서 형식 정의
**완료 날짜**: 2025-11-10

**구현 내용**:
- Markdown 기반 정형화된 문서 구조 정의
- 페이지 정의 섹션과 테스트 플로우 섹션으로 구분
- 각 섹션의 파싱 규칙 명확화

**핵심 개념**:

#### 1. 정형화된 문서의 필요성
자연어는 유연하지만 파싱하기 어렵습니다. 정형화된 구조를 사용하면:
- 파싱 로직이 단순해짐
- 에러 가능성 감소
- 사용자가 작성하기 쉬움
- 일관성 있는 결과 생성

#### 2. 문서 구조
```markdown
# 테스트 시나리오: [제목]

## 📄 페이지 정의

### [PageName]
- **경로**: `/path`
- **설명**: 페이지 설명

## 🧪 테스트 플로우

### [플로우 이름]
**목적**: 플로우 목적

1. 첫 번째 단계
2. 두 번째 단계 (`값`)
```

**설계 결정사항**:

1. **섹션 구분자**
   - `## 📄 페이지 정의` 또는 `## 페이지 정의`
   - `## 🧪 테스트 플로우` 또는 `## 테스트 플로우`
   - 이모지는 선택사항 (있어도 없어도 파싱 가능)

2. **페이지 정의 형식**
   - `### PageName`: 페이지 이름 (PascalCase)
   - `- **경로**: \`/path\``: 백틱으로 감싼 경로
   - `- **설명**: 설명`: 선택사항

3. **테스트 플로우 형식**
   - `### 플로우 이름`: 테스트 케이스 이름
   - `**목적**: 설명`: 선택사항
   - `1. 단계 설명`: 숫자로 시작하는 단계
   - `(값)`: 백틱으로 감싼 값 (입력값, 검증값 등)

**주요 학습 포인트**:

1. **정형화 vs 자연어의 균형**
   - 너무 엄격하면 사용자가 작성하기 어려움
   - 너무 자유로우면 파싱이 어려움
   - 이모지 선택사항으로 유연성 확보

2. **백틱 사용의 이유**
   - 값과 일반 텍스트 구분
   - 파싱 시 명확한 경계
   - Markdown 문법과 일치

3. **확장 가능한 구조**
   - 새로운 섹션 추가 가능
   - 페이지 속성 추가 가능
   - 하위 호환성 유지

---

### 7.2 시나리오 문서 파서 구현
**완료 날짜**: 2025-11-10

**구현 내용**:
- Markdown 파싱 로직 구현
- 페이지 정보 추출
- 테스트 플로우 및 단계 추출
- 단계별 동작 타입 파악 (navigate, input, click, verify 등)

**핵심 개념**:

#### 1. 파서의 역할
파서는 비구조화된 텍스트를 구조화된 데이터로 변환합니다:
```
Markdown 텍스트
  ↓ 파싱
ScenarioDocument 객체
  ↓ 사용
Skeleton 생성
```

#### 2. 상태 기반 파싱
파서는 현재 어느 섹션을 읽고 있는지 추적합니다:
```typescript
let currentSection: 'none' | 'pages' | 'flows' = 'none';
```

- `none`: 아직 섹션 시작 전
- `pages`: 페이지 정의 섹션
- `flows`: 테스트 플로우 섹션

#### 3. 단계 동작 타입 추론
각 단계의 텍스트에서 동작 타입을 추론합니다:
- "이동" → `NAVIGATE`
- "입력" → `INPUT`
- "클릭" → `CLICK`
- "확인" → `VERIFY_*`

**코드 구조**:

```typescript
class ScenarioParser {
  // 파일에서 로드
  async parseFile(filePath: string): Promise<ScenarioDocument>
  
  // 문자열 파싱
  parse(content: string): Promise<ScenarioDocument>
  
  // 검증
  validate(document: ScenarioDocument): ValidationResult
}
```

**설계 결정사항**:

1. **줄 단위 파싱**
   - 파일을 줄 단위로 읽음
   - 각 줄의 패턴 매칭
   - 상태 전환으로 섹션 추적

2. **정규표현식 사용**
   - 페이지 이름: `/^### (.+)$/`
   - 속성: `/^- \*\*(.+?)\*\*: (.+)$/`
   - 단계: `/^(\d+)\. (.+)$/`
   - 값: `/\`([^`]+)\`/`

3. **에러 허용**
   - 빈 줄 무시
   - 알 수 없는 줄 건너뛰기
   - 필수 정보만 검증

**주요 학습 포인트**:

1. **상태 기계 패턴**
   - 파서는 상태 기계로 구현
   - 각 줄이 상태 전환 트리거
   - 명확한 상태 관리로 복잡도 감소

2. **점진적 파싱**
   - 한 번에 모든 것을 파싱하지 않음
   - 섹션별로 파싱
   - 각 섹션 내에서 요소별로 파싱

3. **검증 분리**
   - 파싱과 검증을 분리
   - 파싱은 최대한 허용적
   - 검증에서 필수 정보 확인

---

## 8. Skeleton 생성 및 관리

### 8.1 PageObjectSkeleton 생성
**완료 날짜**: 2025-11-10

**구현 내용**:
- LLM 기반으로 시나리오 문서에서 직접 TypeScript 코드 생성
- getter 방식으로 Locator 정의
- PLACEHOLDER 선택자 사용
- 필수 메서드: goto(), isOnPage()
- 동작 메서드: 테스트 플로우 기반 생성

**핵심 개념**:

#### 1. Skeleton이란?
Skeleton은 "뼈대"를 의미합니다. 완전한 구현은 아니지만 구조는 갖춘 코드입니다:
- ✅ 클래스 구조
- ✅ 메서드 시그니처
- ✅ 요소 정의
- ❌ 실제 선택자 (PLACEHOLDER 사용)
- ❌ 완전한 구현 (TODO 주석)

#### 2. 왜 Skeleton을 먼저 만드는가?
1. **빠른 구조 생성**: LLM이 한 번에 전체 구조 생성
2. **검증 가능**: 구조가 맞는지 먼저 확인
3. **점진적 완성**: Phase 3에서 실제 선택자로 채움
4. **파일 I/O 최소화**: 메모리에서 작업, 완성 후 저장

#### 3. getter 방식 vs readonly 필드
```typescript
// getter 방식 (선택)
get emailInput(): Locator {
  return this.page.locator('PLACEHOLDER_emailInput');
}

// readonly 필드 방식
readonly emailInput = this.page.locator('PLACEHOLDER_emailInput');
```

**getter 방식의 장점**:
- 매번 새로운 Locator 생성 (최신 상태)
- 동적 선택자 가능
- Phase 3에서 교체하기 쉬움

**코드 구조**:

```typescript
class SkeletonGenerator {
  constructor(private llm: AnthropicLLMService) {}
  
  // 전체 skeleton 생성
  async generateSkeletons(scenario: ScenarioDocument): Promise<SkeletonGenerationResult>
  
  // 단일 페이지 skeleton 생성
  private async generatePageObjectSkeleton(
    scenario: ScenarioDocument,
    pageName: string
  ): Promise<string>
}
```

**LLM 프롬프트 전략**:

1. **명확한 지시**
   - "TypeScript 코드만 출력"
   - "마크다운 코드 블록 사용하지 말 것"
   - "PLACEHOLDER 사용"

2. **예시 제공**
   - 원하는 코드 형식 예시
   - getter 방식 예시
   - 메서드 구조 예시

3. **제약 조건**
   - BasePage 상속
   - 특정 메서드 필수
   - 주석 최소화

**설계 결정사항**:

1. **LLM이 직접 코드 생성**
   - 템플릿 방식 대신 LLM 생성
   - 더 유연하고 자연스러운 코드
   - 시나리오에 맞는 메서드 이름

2. **PLACEHOLDER 명명 규칙**
   - `PLACEHOLDER_요소이름`
   - 예: `PLACEHOLDER_emailInput`
   - Phase 3에서 찾기 쉬움

3. **TODO 주석 추가**
   - `// TODO: MCP로 검증`
   - Phase 3 작업 표시
   - 미완성 부분 명확화

**주요 학습 포인트**:

1. **LLM 코드 생성의 장점**
   - 템플릿보다 유연
   - 컨텍스트에 맞는 코드
   - 메서드 이름 자동 생성

2. **Skeleton 패턴**
   - 구조 먼저, 구현 나중에
   - 점진적 완성
   - 검증 가능한 중간 단계

3. **코드 추출 처리**
   - LLM이 마크다운 블록 사용할 수 있음
   - 정규표현식으로 코드만 추출
   - 안전한 파싱

---

### 8.2 TestFileSkeleton 생성
**완료 날짜**: 2025-11-10

**구현 내용**:
- LLM 기반으로 테스트 파일 코드 생성
- test.describe와 test.step 구조
- Page Object 메서드 호출
- 검증 단계 포함

**핵심 개념**:

#### 1. 테스트 파일 구조
Playwright 테스트는 계층 구조를 가집니다:
```typescript
test.describe('전체 시나리오', () => {
  test('개별 테스트', async ({ page }) => {
    await test.step('단계 1', async () => {
      // 동작
    });
    
    await test.step('단계 2', async () => {
      // 검증
    });
  });
});
```

#### 2. test.step의 중요성
- 테스트를 논리적 단계로 구분
- 실패 시 어느 단계에서 실패했는지 명확
- 리포트에서 단계별로 표시
- 디버깅 용이

#### 3. Page Object 사용 패턴
```typescript
const loginPage = new LoginPage(page);
await loginPage.goto();
await loginPage.fillEmail('test@test.com');
await loginPage.clickLoginButton();
```

**설계 결정사항**:

1. **test.describe 사용**
   - 시나리오 전체를 그룹화
   - 관련 테스트 묶기
   - beforeEach/afterEach 공유

2. **test.step으로 단계 구분**
   - 각 주요 동작을 step으로
   - 명확한 단계 설명
   - 실패 지점 파악 용이

3. **Page Object 메서드 호출**
   - 선택자 직접 사용 금지
   - Page Object의 동작 메서드 사용
   - 추상화 레벨 유지

**주요 학습 포인트**:

1. **테스트 가독성**
   - test.step으로 의도 명확화
   - 각 단계가 무엇을 하는지 설명
   - 코드만 봐도 플로우 이해 가능

2. **Page Object 패턴의 가치**
   - 테스트 코드가 간결
   - 선택자 변경 시 한 곳만 수정
   - 재사용 가능한 동작

3. **LLM의 코드 생성 품질**
   - 적절한 프롬프트로 좋은 코드 생성
   - 예시 제공이 중요
   - 제약 조건 명확히 전달

---

## 9. MCP 클라이언트 구현

### 9.1 MCP 클라이언트 기본 구현
**완료 날짜**: 2025-11-10

**구현 내용**:
- @modelcontextprotocol/sdk 사용
- Playwright MCP 서버 연결
- 세션 관리 (시작, 종료)
- 도구 목록 조회

**핵심 개념**:

#### 1. MCP (Model Context Protocol)란?
MCP는 AI 애플리케이션이 외부 도구와 통신하기 위한 프로토콜입니다:
- **표준화된 인터페이스**: 다양한 도구를 동일한 방식으로 사용
- **도구 발견**: 사용 가능한 도구 자동 탐색
- **타입 안전성**: 도구의 입력/출력 스키마 정의

#### 2. Playwright MCP 서버
Microsoft에서 제공하는 MCP 서버로, Playwright 브라우저를 제어하는 도구들을 제공합니다:
- `playwright_navigate`: 페이지 이동
- `playwright_click`: 요소 클릭
- `playwright_fill`: 입력 필드 채우기
- `playwright_screenshot`: 스크린샷 캡처
- `playwright_snapshot`: 페이지 구조 분석
- 등등...

#### 3. StdioClientTransport
MCP 서버와 통신하는 방법:
- **Stdio**: 표준 입출력으로 통신
- **서버 프로세스**: npx 명령으로 서버 실행
- **양방향 통신**: 요청/응답 패턴

**코드 구조**:

```typescript
class MCPClient {
  private client: Client | null = null;
  private transport: StdioClientTransport | null = null;
  
  // 연결
  async connect(config: MCPServerConfig): Promise<MCPSession>
  
  // 도구 호출
  async callTool(toolName: string, params: any): Promise<MCPToolResult>
  
  // 연결 종료
  async disconnect(): Promise<void>
}
```

**설계 결정사항**:

1. **서버 자동 실행**
   - npx 명령으로 서버 자동 시작
   - 사용자가 별도 설치 불필요
   - 버전 관리 용이 (`@latest`)

2. **세션 관리**
   - 연결 상태 추적
   - 사용 가능한 도구 목록 저장
   - 세션 ID 생성

3. **에러 처리**
   - 연결 실패 시 명확한 에러 메시지
   - 도구 호출 실패 시 isError 플래그
   - 안전한 종료 처리

**주요 학습 포인트**:

1. **MCP의 가치**
   - 브라우저 제어 로직 직접 구현 불필요
   - 검증된 도구 활용
   - 표준 프로토콜로 확장 가능

2. **프로세스 간 통신**
   - Stdio를 통한 통신
   - JSON-RPC 프로토콜
   - 비동기 요청/응답

3. **도구 발견 패턴**
   - 연결 시 도구 목록 자동 조회
   - 동적으로 사용 가능한 도구 파악
   - 타입 안전성 확보

---

### 9.2 Playwright MCP 도구 래퍼
**완료 날짜**: 2025-11-10

**구현 내용**:
- navigate, click, fill, getText 등 기본 도구 래핑
- 선택자 검증 메서드
- 스크린샷 캡처
- 페이지 snapshot (accessibility tree)

**핵심 개념**:

#### 1. 래퍼(Wrapper)의 역할
MCP 도구를 직접 호출하는 대신 래퍼를 사용하는 이유:
- **추상화**: 복잡한 MCP 호출 숨김
- **타입 안전성**: TypeScript 타입 제공
- **에러 처리**: 일관된 에러 처리
- **로깅**: 진행 상황 표시

#### 2. Accessibility Tree
Playwright의 snapshot은 accessibility tree를 반환합니다:
```
- button "Login" [ref=e10]
- textbox "Email" [ref=e12]
- textbox "Password" [ref=e14]
```

이것은:
- 스크린 리더가 보는 페이지 구조
- 의미론적 요소 정보
- 선택자 생성에 유용

#### 3. ref 기반 상호작용
MCP snapshot의 ref를 사용하면:
- 정확한 요소 지정
- 선택자 없이 상호작용
- 검증 용도로 활용

**코드 구조**:

```typescript
class PlaywrightMCPService {
  private mcpClient: MCPClient;
  
  // 페이지 이동
  async navigate(path: string): Promise<void>
  
  // 요소 상호작용
  async click(selector: string): Promise<void>
  async fill(selector: string, value: string): Promise<void>
  
  // 정보 조회
  async getText(selector: string): Promise<string>
  async getAttribute(selector: string, attr: string): Promise<string>
  
  // 검증
  async verifySelector(selector: string): Promise<boolean>
  async findElements(candidates: string[]): Promise<SelectorVerificationResult[]>
  
  // 분석
  async snapshot(): Promise<string>
  async screenshot(selector?: string): Promise<string>
}
```

**설계 결정사항**:

1. **baseUrl 관리**
   - 생성자에서 baseUrl 받기
   - 상대 경로 자동 변환
   - 절대 URL도 지원

2. **콘솔 로깅**
   - 각 동작마다 이모지와 함께 로그
   - 진행 상황 명확히 표시
   - 디버깅 용이

3. **에러 변환**
   - MCP 에러를 명확한 메시지로 변환
   - throw Error로 일관된 에러 처리
   - 스택 트레이스 유지

**주요 학습 포인트**:

1. **래퍼 패턴의 가치**
   - 복잡한 API를 간단하게
   - 일관된 인터페이스
   - 변경 격리 (MCP 변경 시 래퍼만 수정)

2. **Accessibility Tree 활용**
   - 의미론적 선택자 생성
   - 스크린 리더 친화적
   - 안정적인 선택자

3. **비동기 처리**
   - 모든 MCP 호출은 비동기
   - async/await 일관되게 사용
   - 에러 처리 필수

---

## Phase 2 완료 기준 달성

✅ 시나리오 문서 파싱 완료
✅ Page Object Skeleton 생성 (TypeScript 코드)
✅ Test File Skeleton 생성 (TypeScript 코드)
✅ BasePage 템플릿 자동 생성
✅ MCP 클라이언트 기본 구현
✅ Playwright MCP 도구 래퍼 구현
✅ 다음 단계(MCP 검증)를 위한 준비 완료

**다음 단계: Phase 3**
- MCP로 실시간 검증하며 skeleton 채워넣기
- 실패 시 사용자 검토 및 복구
- 생성된 테스트가 실제로 작동하도록 완성
