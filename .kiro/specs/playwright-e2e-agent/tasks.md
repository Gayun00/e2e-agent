# Implementation Plan

## 우선순위 및 접근 방식

이 구현 계획은 **MVP(Minimum Viable Product) 우선**으로 설계되었습니다:
- **Phase 1**: 핵심 기능만으로 동작하는 최소 버전
- **Phase 2**: 고급 기능 추가 (Mocking, 스크린샷)
- **Phase 3**: 최적화 및 사용성 개선

각 태스크는:
- ✅ 독립적으로 테스트 가능
- ✅ 실행 가능한 검증 방법 포함
- ✅ 점진적으로 기능 추가

---

## Phase 1: 핵심 MVP (기본 테스트 생성)

목표: 간단한 페이지 객체와 테스트를 생성할 수 있는 최소 기능

### 1. 프로젝트 초기 설정

- [x] 1.1 프로젝트 초기화
  - TypeScript 프로젝트 설정 (tsconfig.json)
  - 필수 패키지 설치: @anthropic-ai/sdk, commander, inquirer, zod, dotenv
  - 기본 디렉토리 구조: src/, tests/
  - _Requirements: 7.1, 8.1_
  
  **테스트 방법:**
  ```bash
  # 프로젝트 생성 후
  npm run build  # 빌드 성공 확인
  node dist/index.js --version  # 버전 출력 확인
  ```

- [x] 1.2 설정 파일 시스템
  - AgentConfig 타입 정의 (Zod 스키마)
  - .env 파일 로드 (dotenv)
  - 설정 검증 및 에러 처리
  - _Requirements: 8.1, 11.1, 11.2_
  
  **테스트 방법:**
  ```typescript
  // tests/config.test.ts
  test('설정 파일 로드', () => {
    const config = loadConfig('.e2e-agent.config.json');
    expect(config.baseUrl).toBeDefined();
  });
  
  test('환경변수 로드', () => {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    expect(apiKey).toBeDefined();
  });
  ```

### 2. 기본 CLI 인터페이스

- [x] 2.1 CLI 진입점 구현
  - Commander.js로 기본 명령어 구조
  - `e2e-agent` 실행 시 대화형 모드 시작
  - 사용자 입력 받기 (Inquirer.js)
  - _Requirements: 7.1, 7.2_
  
  **테스트 방법:**
  ```bash
  npm run build
  node dist/cli.js
  # "🤖 Playwright E2E Agent" 메시지 확인
  # 프롬프트에 "안녕" 입력 → 응답 확인
  ```

- [x] 2.2 간단한 명령 파서
  - 사용자 입력 텍스트 파싱
  - 기본 의도 파악 (테스트 생성 vs 도움말)
  - _Requirements: 7.2_
  
  **테스트 방법:**
  ```typescript
  test('명령 파싱', () => {
    const intent = parseCommand('로그인 테스트 만들어줘');
    expect(intent.type).toBe('generate_test');
  });
  ```

### 3. LLM 기본 통합

- [x] 3.1 Anthropic 클라이언트 구현
  - Anthropic SDK 초기화
  - 기본 chat 메서드 구현
  - 에러 처리
  - _Requirements: 1.1_
  
  **테스트 방법:**
  ```typescript
  test('LLM 호출', async () => {
    const llm = new AnthropicLLMService(apiKey);
    const response = await llm.chat([
      { role: 'user', content: '안녕' }
    ]);
    expect(response.content).toBeDefined();
  });
  ```
  
  **수동 테스트:**
  ```bash
  # CLI에서
  > 안녕
  # LLM 응답 확인
  ```

- [x] 3.2 시나리오 분석 기능
  - 사용자 입력에서 필요한 페이지 추출
  - 간단한 프롬프트로 페이지 목록 반환
  - _Requirements: 2.1_
  
  **테스트 방법:**
  ```typescript
  test('시나리오 분석', async () => {
    const analysis = await llm.analyzeScenario('로그인 테스트');
    expect(analysis.pages).toContain('LoginPage');
  });
  ```

### 4. 페이지 객체 생성 (간소화 버전)

- [x] 4.1 페이지 경로 추론
  - LLM으로 페이지 이름 → 경로 추론
  - 사용자 확인 (간단한 yes/no)
  - _Requirements: 2.2, 2.3_
  
  **테스트 방법:**
  ```bash
  # CLI에서
  > 로그인 테스트 만들어줘
  # "LoginPage - 추론된 경로: /login" 출력 확인
  # "경로가 맞나요? (y/n)" 프롬프트 확인
  ```

- [x] 4.2 기본 페이지 객체 코드 생성
  - LLM으로 TypeScript 코드 생성
  - 기본 구조만 (constructor, goto)
  - 선택자는 하드코딩 (나중에 개선)
  - _Requirements: 2.7_
  
  **테스트 방법:**
  ```typescript
  test('페이지 객체 생성', async () => {
    const code = await generator.generatePageObject('LoginPage', '/login');
    expect(code).toContain('class LoginPage');
    expect(code).toContain('async goto()');
  });
  ```

- [x] 4.3 파일 저장
  - 생성된 코드를 파일로 저장
  - tests/pages/ 디렉토리에 저장
  - _Requirements: 8.2_
  
  **테스트 방법:**
  ```bash
  # CLI 실행 후
  ls tests/pages/
  # LoginPage.ts 파일 존재 확인
  cat tests/pages/LoginPage.ts
  # 코드 내용 확인
  ```

### 5. 기본 테스트 파일 생성

- [x] 5.1 간단한 테스트 코드 생성
  - LLM으로 테스트 파일 생성
  - describe/test 블록 포함
  - 페이지 객체 import
  - _Requirements: 5.1, 5.2_
  
  **테스트 방법:**
  ```typescript
  test('테스트 파일 생성', async () => {
    const code = await composer.generateTest('LoginPage');
    expect(code).toContain("import { LoginPage }");
    expect(code).toContain("test.describe");
  });
  ```

- [x] 5.2 테스트 파일 저장
  - tests/ 디렉토리에 저장
  - _Requirements: 8.3_
  
  **테스트 방법:**
  ```bash
  ls tests/
  # login.spec.ts 파일 존재 확인
  cat tests/login.spec.ts
  # 테스트 코드 확인
  ```

- [x] 5.3 POM 공통 메서드 및 동작 메서드 추가
  - 재사용 가능한 공통 메서드 식별 및 구현 (fill, click, waitFor 등)
  - BasePage 클래스 또는 공통 유틸리티 생성
  - 페이지별 동작 메서드 생성 (login(), submit() 등)
  - 공통 메서드를 활용하여 동작 메서드 구현
  - _Requirements: 2.7, 4.1, 4.2, 4.3_
  
  **테스트 방법:**
  ```bash
  # BasePage 확인
  cat tests/pages/BasePage.ts
  # 공통 메서드 존재 확인
  
  # 페이지 객체에서 BasePage 상속 및 동작 메서드 확인
  cat tests/pages/LoginPage.ts | grep "extends BasePage"
  cat tests/pages/LoginPage.ts | grep "async login"
  
  # 공통 메서드 활용 확인
  cat tests/pages/LoginPage.ts | grep "this.fillInput\|this.clickElement"
  ```

### 6. Phase 1 통합 테스트

- [x] 6.1 E2E 워크플로우 테스트
  - CLI 시작 → 테스트 생성 요청 → 파일 생성 확인
  - _Requirements: 전체_
  
  **테스트 방법:**
  ```bash
  # 1. CLI 시작
  npm start
  
  # 2. 명령 입력
  > 로그인 테스트 만들어줘
  
  # 3. 확인 사항
  # - "LoginPage 생성 중..." 메시지
  # - "경로가 맞나요?" 프롬프트
  # - "y" 입력
  # - "LoginPage 생성 완료" 메시지
  # - "테스트 파일 생성 완료" 메시지
  
  # 4. 파일 확인
  ls tests/pages/LoginPage.ts
  ls tests/login.spec.ts
  
  # 5. 생성된 테스트 실행 (Playwright 설치 필요)
  npx playwright test tests/login.spec.ts --headed
  ```

**Phase 1 완료 기준:**
- ✅ CLI로 대화 가능
- ✅ 간단한 페이지 객체 생성
- ✅ 기본 테스트 파일 생성
- ✅ 파일이 올바른 위치에 저장됨

---

## Phase 2: 시나리오 문서 기반 Skeleton 생성

목표: 시나리오 문서를 파싱하여 Page Object와 테스트 파일의 skeleton을 메모리에 생성

### 7. 시나리오 문서 파서

- [x] 7.1 시나리오 문서 형식 정의
  - Markdown 기반 정형화된 문서 구조
  - 페이지 정의 섹션 (이름, 경로, 설명)
  - 테스트 플로우 섹션 (단계별 동작)
  - _Requirements: 1.1, 1.2_
  
  **테스트 방법:**
  ```typescript
  test('시나리오 문서 파싱', async () => {
    const doc = await parser.parse('scenarios/login.md');
    expect(doc.pages).toContainEqual({
      name: 'LoginPage',
      path: '/login'
    });
    expect(doc.flows[0].steps).toContain('이메일 입력');
  });
  ```

- [x] 7.2 시나리오 문서 파서 구현
  - Markdown 파싱
  - 페이지 정보 추출
  - 테스트 플로우 추출
  - _Requirements: 1.1, 1.2_
  
  **테스트 방법:**
  ```bash
  # 샘플 시나리오 문서 생성
  cat scenarios/login.md
  
  # 파서 테스트
  npm run test -- scenario-parser.test.ts
  ```

### 8. Skeleton 생성 및 관리

- [ ] 8.1 PageObjectSkeleton 생성
  - 시나리오 문서 기반으로 skeleton 생성
  - 요소 목록 (selector는 null)
  - 메서드 목록 (implementation은 null)
  - 메모리에만 유지
  - _Requirements: 2.1, 2.7_
  
  **테스트 방법:**
  ```typescript
  test('Skeleton 생성', async () => {
    const skeleton = await generator.createSkeleton(parsedScenario, 'LoginPage');
    expect(skeleton.elements).toContainEqual({
      name: 'emailInput',
      purpose: '이메일 입력',
      type: 'input',
      selector: null
    });
    expect(skeleton.methods[0].implementation).toBeNull();
  });
  ```

- [ ] 8.2 TestFileSkeleton 생성
  - 테스트 플로우 기반으로 skeleton 생성
  - 각 단계를 TestStep으로 변환
  - 메모리에만 유지
  - _Requirements: 5.1, 5.2_
  
  **테스트 방법:**
  ```typescript
  test('테스트 Skeleton 생성', async () => {
    const testSkeleton = await composer.createTestSkeleton(parsedScenario);
    expect(testSkeleton.testCases[0].steps).toContainEqual({
      description: '이메일 입력',
      pageObject: 'LoginPage',
      method: 'fillEmail',
      parameters: ['test@example.com']
    });
  });
  ```

**Phase 2 완료 기준:**
- ✅ 시나리오 문서 파싱 완료
- ✅ Page Object Skeleton 생성 (메모리)
- ✅ Test File Skeleton 생성 (메모리)
- ✅ 다음 단계(MCP 검증)를 위한 준비 완료

---

## Phase 3: MCP 실시간 검증 및 완성

목표: 메모리의 skeleton을 MCP로 실시간 검증하면서 실제 선택자와 메서드로 채워넣기

### 9. MCP 클라이언트 구현

- [ ] 9.1 MCP 클라이언트 기본 구현
  - @modelcontextprotocol/sdk 사용
  - Playwright MCP 서버 연결
  - 세션 관리 (시작, 종료)
  - _Requirements: 3.1_
  
  **테스트 방법:**
  ```typescript
  test('MCP 세션 시작', async () => {
    const session = await mcpClient.startSession();
    expect(session.isConnected).toBe(true);
    const tools = await session.listTools();
    expect(tools).toContain('playwright_navigate');
  });
  ```

- [ ] 9.2 Playwright MCP 도구 래퍼
  - navigate, click, fill, getText 등 기본 도구
  - 선택자 검증 메서드
  - 스크린샷 캡처
  - _Requirements: 3.3_
  
  **테스트 방법:**
  ```typescript
  test('MCP 도구 사용', async () => {
    await mcpSession.navigate('http://localhost:3000/login');
    const exists = await mcpSession.verifySelector('getByPlaceholder("이메일")');
    expect(exists).toBe(true);
  });
  ```
  
  **수동 테스트:**
  ```bash
  # 테스트 서버 실행 (별도 터미널)
  cd test-app && npm run dev
  
  # MCP 테스트
  npm run test:mcp
  ```

### 10. 실시간 검증 및 채워넣기

- [ ] 10.1 테스트 플로우 실행 엔진
  - Skeleton의 테스트 플로우를 순서대로 실행
  - 각 단계에서 필요한 선택자 실시간 탐색
  - 성공 시 skeleton에 채워넣기
  - _Requirements: 3.1, 3.2, 3.8_
  
  **테스트 방법:**
  ```typescript
  test('플로우 실행 및 채워넣기', async () => {
    const result = await executor.executeAndFill(
      testSkeleton,
      pageObjectSkeletons,
      mcpSession
    );
    
    // 선택자가 채워졌는지 확인
    const loginPage = result.pageObjects.find(p => p.name === 'LoginPage');
    expect(loginPage.elements[0].selector).not.toBeNull();
    expect(loginPage.elements[0].selector).toContain('getBy');
  });
  ```

- [ ] 10.2 선택자 후보 생성 및 검증
  - 요소의 purpose와 type 기반으로 후보 생성
  - MCP로 각 후보 순서대로 검증
  - 첫 번째 성공한 선택자 사용
  - _Requirements: 3.2, 3.4, 3.5_
  
  **테스트 방법:**
  ```typescript
  test('선택자 찾기', async () => {
    const selector = await selectorFinder.findAndVerify(
      mcpSession,
      {
        name: 'emailInput',
        purpose: '이메일 입력',
        type: 'input'
      }
    );
    
    expect(selector).toBeDefined();
    expect(selector.strategy).toBeOneOf(['testId', 'placeholder', 'role']);
  });
  ```

- [ ] 10.3 메서드 구현 생성
  - 검증된 선택자를 사용하여 메서드 구현 생성
  - LLM으로 코드 생성
  - Skeleton에 채워넣기
  - _Requirements: 4.1, 4.2, 4.3_
  
  **테스트 방법:**
  ```typescript
  test('메서드 구현 생성', async () => {
    const implementation = await methodGenerator.generate(
      {
        name: 'login',
        parameters: [{ name: 'email' }, { name: 'password' }],
        steps: ['emailInput에 입력', 'passwordInput에 입력', 'loginButton 클릭']
      },
      filledElements
    );
    
    expect(implementation).toContain('await this.emailInput.fill(email)');
    expect(implementation).toContain('await this.loginButton.click()');
  });
  ```

### 11. 실패 처리 및 사용자 검토

- [ ] 11.1 실패 감지 및 로깅
  - 선택자를 찾지 못한 경우
  - 동작 실패한 경우
  - 타임아웃 발생한 경우
  - _Requirements: 7.7_
  
  **테스트 방법:**
  ```typescript
  test('실패 감지', async () => {
    const result = await executor.executeStep(invalidStep, mcpSession);
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
    expect(result.failureType).toBe('SELECTOR_NOT_FOUND');
  });
  ```

- [ ] 11.2 사용자 검토 프롬프트
  - 실패 상황 설명
  - 선택지 제공 (재시도, 수동 입력, 건너뛰기)
  - 사용자 입력 처리
  - _Requirements: 13.1, 13.3_
  
  **테스트 방법:**
  ```bash
  # CLI에서 실패 시나리오 테스트
  npm start -- --scenario scenarios/failing-test.md
  
  # 예상 출력:
  # "❌ 이메일 입력 필드를 찾을 수 없습니다."
  # "1. 다른 선택자 시도"
  # "2. 수동으로 선택자 입력"
  # "3. 이 단계 건너뛰기"
  ```

- [ ] 11.3 재시도 및 복구 로직
  - 사용자 선택에 따라 재시도
  - 수동 입력 선택자 검증
  - 건너뛴 단계 기록
  - _Requirements: 7.7, 13.3_
  
  **테스트 방법:**
  ```typescript
  test('재시도 로직', async () => {
    const userChoice = { action: 'retry', alternativeSelector: 'getByTestId("email")' };
    const result = await failureHandler.retry(failedStep, userChoice, mcpSession);
    expect(result.success).toBe(true);
  });
  ```
    expect(result.screenshot).toBeDefined();
  });
  ```

### 12. 최종 코드 생성 및 저장

- [ ] 12.1 완성된 PageObject 코드 생성
  - 채워진 skeleton을 TypeScript 코드로 변환
  - BasePage 상속 구조
  - 검증된 선택자 사용
  - 구현된 메서드 포함
  - _Requirements: 2.7, 4.1, 4.2, 4.3_
  
  **테스트 방법:**
  ```typescript
  test('PageObject 코드 생성', async () => {
    const code = await codeGenerator.generatePageObject(filledSkeleton);
    expect(code).toContain('class LoginPage extends BasePage');
    expect(code).toContain('emailInput = this.page.getByPlaceholder');
    expect(code).toContain('async login(email: string, password: string)');
    expect(code).not.toContain('null');
    expect(code).not.toContain('placeholder-');
  });
  ```

- [ ] 12.2 완성된 테스트 파일 코드 생성
  - 채워진 test skeleton을 Playwright 테스트 코드로 변환
  - 페이지 객체 import
  - describe/test 블록
  - 검증 단계 포함
  - _Requirements: 5.1, 5.2_
  
  **테스트 방법:**
  ```typescript
  test('테스트 파일 코드 생성', async () => {
    const code = await codeGenerator.generateTestFile(filledTestSkeleton);
    expect(code).toContain("import { LoginPage } from './pages/LoginPage'");
    expect(code).toContain("test.describe('로그인 플로우'");
    expect(code).toContain("await loginPage.login('test@example.com', 'password')");
  });
  ```

- [ ] 12.3 파일 저장
  - 생성된 코드를 디스크에 저장
  - tests/pages/ 디렉토리에 페이지 객체
  - tests/ 디렉토리에 테스트 파일
  - _Requirements: 8.2, 8.3_
  
  **테스트 방법:**
  ```bash
  # 파일 생성 확인
  ls tests/pages/LoginPage.ts
  ls tests/login.spec.ts
  
  # 내용 확인
  cat tests/pages/LoginPage.ts
  # 실제 선택자 확인
  cat tests/pages/LoginPage.ts | grep "getByPlaceholder\|getByRole\|getByTestId"
  
  # 테스트 파일 확인
  cat tests/login.spec.ts
  # 페이지 객체 사용 확인
  cat tests/login.spec.ts | grep "loginPage.login"
  ```

### 13. Phase 2 통합 테스트

- [ ] 13.1 전체 워크플로우 E2E 테스트
  - 시나리오 문서 → Skeleton 생성 → MCP 검증 → 파일 저장
  - 실제 테스트 앱으로 검증
  - _Requirements: 전체_
  
  **테스트 방법:**
  ```bash
  # 1. 테스트 앱 실행 (별도 터미널)
  cd test-app && npm run dev
  
  # 2. 시나리오 문서 작성
  cat > scenarios/login-flow.md << 'EOF'
  # 테스트 시나리오: 로그인 플로우
  
  ## 페이지 정의
  
  ### LoginPage
  - 경로: /login
  - 설명: 사용자 로그인 페이지
  
  ## 테스트 플로우
  
  ### 성공적인 로그인
  1. LoginPage로 이동
  2. 이메일 입력 (test@example.com)
  3. 비밀번호 입력 (password123)
  4. 로그인 버튼 클릭
  5. 대시보드로 리다이렉트 확인
  EOF
  
  # 3. Agent 실행
  npm start -- --scenario scenarios/login-flow.md
  
  # 4. 진행 상황 확인
  # - "시나리오 문서 파싱 중..." 메시지
  # - "Skeleton 생성 완료" 메시지
  # - "MCP 세션 시작..." 메시지
  # - "LoginPage로 이동 중..." 메시지
  # - "이메일 입력 필드 찾는 중..." 메시지
  # - "✓ 선택자 발견: getByPlaceholder('이메일')" 메시지
  # - 각 단계별 진행 상황 표시
  
  # 5. 파일 생성 확인
  ls tests/pages/LoginPage.ts
  ls tests/login-flow.spec.ts
  
  # 6. 생성된 테스트 실행
  npx playwright test tests/login-flow.spec.ts --headed
  # 테스트가 실제로 통과하는지 확인
  ```

- [ ] 13.2 실패 시나리오 테스트
  - 선택자를 찾지 못하는 경우
  - 사용자 검토 프롬프트 확인
  - 재시도 및 복구 확인
  - _Requirements: 7.7, 13.3_
  
  **테스트 방법:**
  ```bash
  # 존재하지 않는 요소가 포함된 시나리오
  cat > scenarios/failing-test.md << 'EOF'
  ## 테스트 플로우
  1. LoginPage로 이동
  2. 존재하지 않는 필드 입력
  EOF
  
  npm start -- --scenario scenarios/failing-test.md
  
  # 예상 출력:
  # "❌ '존재하지 않는 필드'를 찾을 수 없습니다."
  # "1. 다른 선택자 시도"
  # "2. 수동으로 선택자 입력"
  # "3. 이 단계 건너뛰기"
  
  # "2" 선택 후 수동 입력 테스트
  # "getByTestId('custom-field')" 입력
  # 검증 후 진행
  ```

**Phase 3 완료 기준:**
- ✅ MCP로 실시간 검증하며 skeleton 채워넣기
- ✅ 실패 시 사용자 검토 및 복구
- ✅ 생성된 테스트가 실제로 작동함
- ✅ 파일 읽기/쓰기 최소화 (최종 완성본만 저장)

---

## Phase 4: 고급 기능 (Mocking, 스크린샷, 인증)

### 11. 인증 시스템

- [ ] 11.1 환경변수 인증 정보 로드
  - .env에서 계정 정보 읽기
  - _Requirements: 11.2_
  
  **테스트 방법:**
  ```typescript
  test('인증 정보 로드', () => {
    const creds = authService.loadCredentials();
    expect(creds.email).toBeDefined();
  });
  ```

- [ ] 11.2 로그인 필요 감지
  - 리다이렉트 감지
  - _Requirements: 10.1, 10.2_
  
  **테스트 방법:**
  ```typescript
  test('로그인 필요 감지', async () => {
    const needsAuth = await authService.detectAuthRequired('/products');
    expect(needsAuth).toBe(true);
  });
  ```

- [ ] 11.3 자동 로그인 수행
  - 도메인 문서에서 로그인 플로우 추출
  - MCP로 로그인 실행
  - _Requirements: 10.3, 10.4, 10.5_
  
  **테스트 방법:**
  ```bash
  # CLI에서
  > 상품 페이지 테스트 만들어줘
  # "로그인 필요 감지" 메시지
  # "자동 로그인 수행 중..." 메시지
  # "로그인 완료" 메시지
  ```

### 12. Mocking 시스템

- [ ] 12.1 페이지 의존성 분석
  - API 엔드포인트 추출
  - _Requirements: 9.1, 9.2_
  
  **테스트 방법:**
  ```typescript
  test('의존성 분석', async () => {
    const deps = await mockingService.analyzeDependencies(pageCode);
    expect(deps.apiEndpoints).toContain('/api/auth/login');
  });
  ```

- [ ] 12.2 Mocking 코드 생성
  - LLM으로 setupMocks() 메서드 생성
  - _Requirements: 9.4, 9.5_
  
  **테스트 방법:**
  ```bash
  cat tests/pages/LoginPage.ts | grep "setupMocks"
  # setupMocks 메서드 존재 확인
  ```

- [ ] 12.3 공통 Mocking 관리
  - 중복 API 감지
  - tests/mocks/ 디렉토리에 공통 파일 생성
  - _Requirements: 12.1, 12.2, 12.3_
  
  **테스트 방법:**
  ```bash
  ls tests/mocks/
  # auth.mock.ts 등 공통 파일 확인
  ```

### 13. 스크린샷 기능

- [ ] 13.1 커스텀 MCP 서버 구현
  - screenshot-with-mocking MCP 서버
  - _Requirements: 9.7_
  
  **테스트 방법:**
  ```bash
  # MCP 서버 실행
  npm run mcp:screenshot
  # 별도 터미널에서 테스트
  ```

- [ ] 13.2 스크린샷 생성
  - Mocking 적용 후 스크린샷
  - PC/Mobile 디바이스
  - _Requirements: 9.8, 9.9_
  
  **테스트 방법:**
  ```bash
  # CLI에서
  > @LoginPage 스크린샷 찍어줘
  # screenshots/LoginPage/ 디렉토리 확인
  ls screenshots/LoginPage/
  # pc-success.png, mobile-success.png 확인
  ```

### 14. 도메인 지식 관리

- [ ] 14.1 도메인 문서 파서
  - Markdown 파싱
  - 페이지 정보, 플로우 추출
  - _Requirements: 1.1, 1.2_
  
  **테스트 방법:**
  ```typescript
  test('도메인 문서 파싱', async () => {
    const knowledge = await domainManager.load('docs/e2e-domain.md');
    expect(knowledge.pages.length).toBeGreaterThan(0);
  });
  ```

- [ ] 14.2 도메인 문서 업데이트
  - 새 정보 추가
  - 기존 내용 보존
  - _Requirements: 1.7, 6.5_
  
  **테스트 방법:**
  ```bash
  # 테스트 생성 후
  cat docs/e2e-domain.md
  # 새로운 페이지 정보 추가 확인
  ```

### 15. Prompt Caching 및 최적화

- [ ] 15.1 Prompt Caching 구현
  - 시스템 프롬프트 캐싱
  - 도메인 지식 캐싱
  - _Requirements: 1.1_
  
  **테스트 방법:**
  ```typescript
  test('캐시 사용', async () => {
    const response1 = await llm.chat(messages);
    const response2 = await llm.chat(messages);
    expect(response2.usage.cacheReadTokens).toBeGreaterThan(0);
  });
  ```

- [ ] 15.2 Langfuse 통합
  - LLM 호출 추적
  - _Requirements: 1.1_
  
  **테스트 방법:**
  ```bash
  # Langfuse 대시보드에서 trace 확인
  # 토큰 사용량, 비용 확인
  ```

### 16. 대화형 개선

- [ ] 16.1 세션 관리
  - 대화 기록 유지
  - /clear 명령어
  - _Requirements: 13.5_
  
  **테스트 방법:**
  ```bash
  # CLI에서
  > 로그인 테스트 만들어줘
  # (완료)
  > 상품 페이지 테스트도 만들어줘
  # 이전 컨텍스트 유지 확인
  > /clear
  # "세션 초기화" 메시지 확인
  ```

- [ ] 16.2 파일 자동완성
  - @ 입력 시 페이지 목록 표시
  - _Requirements: 13.1_
  
  **테스트 방법:**
  ```bash
  # CLI에서
  > @
  # 페이지 목록 표시 확인
  # @LoginPage 선택 가능 확인
  ```

### 17. 에러 처리 개선

- [ ] 17.1 에러 복구 메커니즘
  - 해결 방법 제안
  - 1. approve 2. tell differently
  - _Requirements: 7.7, 13.3_
  
  **테스트 방법:**
  ```bash
  # 잘못된 페이지 이름으로 테스트
  > @WrongPage 업데이트해줘
  # 에러 메시지 및 해결 방법 제안 확인
  # "1. approve 2. tell differently" 프롬프트 확인
  ```

### 18. Phase 3 통합 테스트

- [ ] 18.1 전체 기능 테스트
  - 인증, Mocking, 스크린샷 모두 포함
  - _Requirements: 전체_
  
  **테스트 방법:**
  ```bash
  # 1. 프로젝트 초기화
  > 프로젝트 초기화해줘
  
  # 2. 도메인 문서 작성
  # docs/e2e-domain.md 작성
  
  # 3. 로그인 테스트 생성
  > 로그인 테스트 만들어줘
  
  # 4. 인증 필요 페이지 테스트
  > 상품 페이지 테스트 만들어줘
  # 자동 로그인 확인
  
  # 5. 스크린샷 생성
  > @LoginPage 스크린샷 찍어줘
  
  # 6. 모든 테스트 실행
  npx playwright test
  ```

**Phase 4 완료 기준:**
- ✅ 자동 로그인 작동
- ✅ Mocking 자동 생성
- ✅ 스크린샷 생성 가능
- ✅ 도메인 지식 활용
- ✅ 에러 복구 가능

---

## Phase 5: 배포 준비

### 19. 문서화

- [ ] 19.1 README 작성
  - 설치 방법
  - 사용 예시
  - 설정 가이드
  
  **테스트 방법:**
  ```bash
  # README 따라서 처음부터 설치
  # 모든 단계가 작동하는지 확인
  ```

- [ ] 19.2 예제 프로젝트
  - test-app/ 디렉토리에 샘플 앱
  - 도메인 문서 예시
  
  **테스트 방법:**
  ```bash
  cd test-app
  npm install
  npm run dev
  # Agent로 테스트 생성 가능 확인
  ```

### 20. NPM 패키지 설정

- [ ] 20.1 package.json 설정
  - bin 명령어 설정
  - 빌드 스크립트
  - _Requirements: 7.1_
  
  **테스트 방법:**
  ```bash
  npm pack
  npm install -g ./playwright-e2e-agent-1.0.0.tgz
  e2e-agent
  # 전역 설치 후 실행 확인
  ```

- [ ] 20.2 배포
  - NPM 퍼블리시
  
  **테스트 방법:**
  ```bash
  npm publish --dry-run
  # 패키지 내용 확인
  ```

---

## 테스트 전략 요약

### 단위 테스트 (Vitest)
```bash
npm run test
```
- 각 서비스 클래스 메서드 테스트
- Mock을 사용한 격리 테스트

### 통합 테스트
```bash
npm run test:integration
```
- MCP 연결 테스트
- LLM 호출 테스트
- 파일 생성 테스트

### E2E 테스트
```bash
npm run test:e2e
```
- 실제 CLI 실행
- 전체 워크플로우 테스트
- 생성된 테스트 실행

### 수동 테스트 체크리스트

각 Phase 완료 시:
- [ ] CLI 실행 가능
- [ ] 에러 없이 완료
- [ ] 생성된 파일 확인
- [ ] 생성된 테스트 실행 가능
- [ ] 사용자 경험 자연스러움

---

## 다음 단계

1. **Phase 1부터 시작**: 가장 기본적인 기능부터 구현
2. **각 태스크마다 테스트**: 작동 확인 후 다음 단계
3. **점진적 개선**: 기능 추가하면서 리팩토링
4. **피드백 반영**: 사용하면서 개선점 발견

tasks.md 파일을 열고 "Start task" 버튼을 클릭하여 구현을 시작하세요!
