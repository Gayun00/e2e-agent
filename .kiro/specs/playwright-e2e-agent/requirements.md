# 요구사항 문서

## 소개

이 기능은 Page Object Model(POM) 패턴을 사용하여 Playwright E2E 테스트를 자동으로 생성하는 AI Agent를 만드는 것을 목표로 합니다. Agent는 테스트 시나리오를 분석하고, 페이지 객체를 생성하며, 요소 선택자를 지능적으로 선택하고, 테스트 동작을 생성하며, 완전한 테스트 시나리오를 구성합니다. 또한 페이지 구조와 도메인 지식에 대한 문서를 유지하여 테스트 생성의 정확도를 향상시킵니다.

## Page Object Model 패턴 예시

Playwright 공식 문서를 기반으로 한 POM 구조 예시입니다.

### 페이지 객체 구조 예시

```typescript
// pages/LoginPage.ts
import { Page, Locator } from '@playwright/test';

export class LoginPage {
  readonly page: Page;
  readonly usernameInput: Locator;
  readonly passwordInput: Locator;
  readonly loginButton: Locator;
  readonly errorMessage: Locator;

  constructor(page: Page) {
    this.page = page;
    // 요소 선택자 정의
    this.usernameInput = page.getByPlaceholder('사용자명');
    this.passwordInput = page.getByPlaceholder('비밀번호');
    this.loginButton = page.getByRole('button', { name: '로그인' });
    this.errorMessage = page.getByRole('alert');
  }

  // 페이지 이동
  async goto() {
    await this.page.goto('/login');
  }

  // 페이지별 동작 메서드
  async login(username: string, password: string) {
    await this.usernameInput.fill(username);
    await this.passwordInput.fill(password);
    await this.loginButton.click();
  }

  // 검증 메서드
  async getErrorMessage() {
    return await this.errorMessage.textContent();
  }
}
```

### 테스트 시나리오 구성 예시

```typescript
// tests/login.spec.ts
import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';
import { MainPage } from '../pages/MainPage';

test.describe('로그인 테스트', () => {
  test('성공적인 로그인', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const mainPage = new MainPage(page);

    // 로그인 페이지로 이동
    await loginPage.goto();
    
    // 로그인 수행
    await loginPage.login('testuser', 'password123');
    
    // 메인 페이지 표시 확인
    await expect(mainPage.welcomeMessage).toBeVisible();
  });

  test('잘못된 자격증명으로 로그인 실패', async ({ page }) => {
    const loginPage = new LoginPage(page);

    await loginPage.goto();
    await loginPage.login('wronguser', 'wrongpass');
    
    // 에러 메시지 확인
    const errorMsg = await loginPage.getErrorMessage();
    expect(errorMsg).toContain('로그인 실패');
  });
});
```

### 요소 선택자 우선순위

Playwright 권장 선택자 우선순위:
1. `getByRole()` - 접근성 기반 (가장 권장)
2. `getByLabel()` - 폼 요소용
3. `getByPlaceholder()` - 입력 필드용
4. `getByText()` - 텍스트 기반
5. `getByTestId()` - 테스트 전용 속성
6. CSS/XPath 선택자 (최후의 수단)

### 도메인 지식 문서 예시

```markdown
# E2E 테스트 도메인 지식

## 페이지 정보

### 로그인 페이지
- 경로: `/login`
- 설명: 사용자 인증을 위한 페이지
- 접근 방법: GNB의 "로그인" 버튼 클릭 또는 직접 URL 접근

### 메인 페이지
- 경로: `/`
- 설명: 로그인 후 표시되는 대시보드
- 접근 방법: 로그인 성공 후 자동 리다이렉트

### 상품 목록 페이지
- 경로: `/products`
- 설명: 전체 상품 목록을 표시
- 접근 방법: GNB의 "상품" 메뉴 클릭

## 테스트 플로우

### 로그인 플로우
1. GNB에서 "로그인" 버튼 클릭
2. 로그인 페이지로 이동 확인
3. 사용자명과 비밀번호 입력
4. "로그인" 버튼 클릭
5. 메인 페이지로 리다이렉트 확인
6. 환영 메시지 표시 확인

### 상품 구매 플로우
1. 로그인 필요 (위 플로우 참조)
2. 상품 목록 페이지로 이동
3. 특정 상품 선택
4. 장바구니에 추가
5. 결제 페이지로 이동
6. 결제 정보 입력 및 완료

## 도메인 특화 정보

### 인증
- 테스트 계정: `testuser` / `password123`
- 로그인 후 세션은 30분 유지
- 로그인 실패 시 에러 메시지는 alert 역할로 표시됨

### 상품 데이터
- 테스트 상품 ID: `PROD-001`
- 상품 가격은 항상 숫자 형식으로 표시 (예: 10,000원)

### 페이지 로딩
- 모든 페이지는 로딩 완료 시 특정 요소가 표시됨
- 네트워크가 느린 경우 최대 5초까지 대기 필요
```

## 요구사항

### 요구사항 1: 도메인 지식 문서 관리

**사용자 스토리:** QA 엔지니어로서, 테스트 작성에 필요한 도메인 지식(페이지 경로, 플로우, 비즈니스 로직 등)을 문서로 작성하여, Agent가 이를 참고하여 정확한 테스트를 생성하도록 하고 싶습니다.

#### 인수 기준

1. WHEN 사용자가 도메인 지식 문서를 작성하면 THEN Agent는 해당 문서를 읽고 이해해야 합니다
2. WHEN 도메인 지식 문서를 읽을 때 THEN Agent는 다음 정보를 추출해야 합니다:
   - 페이지 목록과 각 페이지별 경로 (선택 사항)
   - 테스트에 필요한 플로우 정보
   - LLM이 이해해야 할 도메인 특화 정보
3. WHEN Agent가 페이지 객체를 생성하기 전에 THEN Agent는 도메인 지식 문서를 먼저 참고해야 합니다
4. IF 도메인 지식 문서에 페이지 경로가 명시되어 있으면 THEN Agent는 해당 경로를 우선 사용해야 합니다
5. IF 도메인 지식 문서가 없거나 불완전하면 THEN Agent는 추론을 통해 정보를 보완하고 사용자에게 확인을 요청해야 합니다
6. WHEN 테스트 생성 과정에서 THEN Agent는 지속적으로 도메인 지식 문서를 참조해야 합니다
7. WHEN 새로운 정보가 발견되면 THEN Agent는 도메인 지식 문서를 업데이트할 것을 제안해야 합니다

### 요구사항 2: 페이지 객체 생성

**사용자 스토리:** QA 엔지니어로서, 테스트 시나리오에 필요한 페이지 객체를 자동으로 식별하고 생성하여, 깔끔하고 재사용 가능한 테스트 코드를 유지하고 싶습니다.

#### 인수 기준

1. WHEN 테스트 시나리오가 제공되면 THEN Agent는 시나리오에 필요한 모든 페이지를 정의해야 합니다
2. WHEN 페이지가 정의되면 THEN Agent는 각 페이지의 경로(route/path)를 추론해야 합니다
3. WHEN 페이지 경로가 추론되면 THEN Agent는 사용자에게 경로 확인을 요청해야 합니다
4. IF 사용자가 경로를 수정하면 THEN Agent는 수정된 경로를 사용해야 합니다
5. WHEN 경로가 확인되면 THEN Agent는 해당 경로로 이동하는 `goto()` 메서드를 페이지 객체에 추가해야 합니다
6. WHEN 경로가 확인되면 THEN Agent는 현재 페이지가 올바른 경로에 있는지 확인하는 검증 메서드를 페이지 객체에 추가해야 합니다
7. WHEN 페이지 경로와 검증 메서드가 준비되면 THEN Agent는 POM 패턴을 따르는 페이지 객체 클래스를 생성해야 합니다
8. IF 페이지 객체가 이미 존재하면 THEN Agent는 중복 생성 대신 기존 페이지 객체를 재사용해야 합니다

### 요구사항 3: 요소 선택자 결정

**사용자 스토리:** QA 엔지니어로서, UI 요소에 대한 최적의 선택자를 지능적으로 선택하여, 안정적이고 유지보수 가능한 테스트를 작성하고 싶습니다.

#### 인수 기준

1. WHEN Agent가 UI 요소와 상호작용해야 할 때 THEN Agent는 브라우저를 실행하여 실제 페이지를 확인해야 합니다
2. WHEN 브라우저에서 페이지를 확인할 때 THEN Agent는 여러 선택자 전략(role, placeholder, test-id, text 등)을 분석해야 합니다
3. WHEN 선택자 전략을 분석할 때 THEN Agent는 모범 사례를 기반으로 초기 선택을 해야 합니다
4. WHEN 선택자가 선택되면 THEN Agent는 실제 페이지에서 선택자가 올바르게 작동하는지 검증해야 합니다
5. IF 선택자 검증이 실패하면 THEN Agent는 대체 선택자 전략을 시도해야 합니다
6. WHEN Agent가 선택자를 구성하면 THEN Agent는 사용자에게 선택자 확인 및 수정을 요청해야 합니다
7. IF 사용자가 수정 사항을 제공하면 THEN Agent는 선택자를 업데이트하고 이후 작업에 수정된 버전을 사용해야 합니다
8. WHEN 선택자가 확정되면 THEN Agent는 다음 단계로 진행해야 합니다

### 요구사항 4: 테스트 동작 생성

**사용자 스토리:** QA 엔지니어로서, 각 페이지에 대한 재사용 가능한 동작 메서드를 생성하여, 복잡한 테스트 시나리오를 쉽게 구성하고 싶습니다.

#### 인수 기준

1. WHEN 페이지 객체가 생성되면 THEN Agent는 테스트 시나리오 요구사항을 기반으로 동작 메서드를 생성해야 합니다
2. WHEN 동작 메서드를 생성할 때 THEN 각 메서드는 선택된 요소 선택자를 사용해야 합니다
3. WHEN 동작 메서드를 생성할 때 THEN Agent는 명명 규칙을 따라야 합니다 (예: clickLogin(), login(), isDisplayed())
4. WHEN 동작 메서드를 생성할 때 THEN Agent는 적절한 대기 시간과 검증을 포함해야 합니다
5. IF 동작이 네비게이션을 포함하면 THEN 메서드는 페이지 전환을 적절히 처리해야 합니다
6. IF 동작이 입력 데이터를 필요로 하면 THEN 메서드는 테스트 데이터를 위한 매개변수를 받아야 합니다

### 요구사항 5: 테스트 시나리오 구성

**사용자 스토리:** QA 엔지니어로서, 페이지 동작을 조합하여 완전한 테스트 시나리오를 구성하여, 포괄적인 E2E 테스트를 빠르게 생성하고 싶습니다.

#### 인수 기준

1. WHEN 테스트 시나리오를 구성할 때 THEN Agent는 동작을 논리적인 테스트 플로우로 구성해야 합니다
2. WHEN 테스트 플로우를 구성할 때 THEN Agent는 Playwright 규칙을 따르는 describe/test 블록을 사용해야 합니다
3. WHEN 테스트 시나리오가 생성되면 THEN Agent는 적절한 setup 및 teardown 단계를 포함해야 합니다
4. IF 타이밍 문제로 테스트가 실패하면 THEN Agent는 적절한 대기 조건을 추가해야 합니다
5. IF 페이지 로드 타이밍으로 테스트가 실패하면 THEN Agent는 페이지 로드 검증 단계를 추가해야 합니다
6. WHEN 테스트 시나리오가 완료되면 THEN Agent는 테스트가 성공적으로 실행될 수 있는지 검증해야 합니다

### 요구사항 6: 테스트 문서 관리

**사용자 스토리:** QA 엔지니어로서, 페이지 구조와 도메인 지식에 대한 문서를 유지하여, 향후 테스트 생성이 더 정확하고 맥락을 인식하도록 하고 싶습니다.

#### 인수 기준

1. WHEN 페이지 객체가 생성되면 THEN Agent는 E2E 테스트 문서 파일을 생성하거나 업데이트해야 합니다
2. WHEN 문서를 업데이트할 때 THEN Agent는 페이지 경로와 path를 기록해야 합니다
3. WHEN 문서를 업데이트할 때 THEN Agent는 각 페이지에 도달하기 위해 필요한 테스트 플로우를 문서화해야 합니다
4. WHEN 문서를 업데이트할 때 THEN Agent는 테스트 생성에 필요한 도메인 지식을 캡처해야 합니다
5. IF 문서가 이미 존재하면 THEN Agent는 덮어쓰기 대신 점진적으로 업데이트해야 합니다
6. WHEN 새로운 테스트를 생성할 때 THEN Agent는 일관성을 유지하기 위해 기존 문서를 참조해야 합니다

### 요구사항 7: CLI 인터페이스

**사용자 스토리:** QA 엔지니어로서, 명령줄에서 Agent를 실행하여, 자동화 파이프라인에 통합하거나 터미널에서 빠르게 테스트를 생성하고 싶습니다.

#### 인수 기준

1. WHEN 사용자가 CLI 명령을 실행하면 THEN Agent는 대화형 모드로 시작해야 합니다
2. WHEN CLI가 시작되면 THEN Agent는 사용자에게 테스트 시나리오를 입력받아야 합니다
3. WHEN 사용자가 테스트 파일 위치를 지정하면 THEN Agent는 해당 위치에 테스트 파일을 생성해야 합니다
4. IF 사용자가 테스트 파일 위치를 지정하지 않으면 THEN Agent는 Playwright 공식 문서의 기본 구조를 따라야 합니다:
   - 페이지 객체: `tests/pages/` 또는 `e2e/pages/`
   - 테스트 파일: `tests/` 또는 `e2e/`
5. WHEN CLI가 실행 중일 때 THEN Agent는 진행 상황을 터미널에 표시해야 합니다
6. WHEN 테스트 생성이 완료되면 THEN Agent는 생성된 파일 목록을 출력해야 합니다
7. IF 오류가 발생하면 THEN Agent는 명확한 오류 메시지와 해결 방법을 제공해야 합니다

### 요구사항 8: 파일 위치 설정

**사용자 스토리:** QA 엔지니어로서, 프로젝트 구조에 맞게 테스트 파일 위치를 설정하여, 기존 프로젝트 규칙을 유지하고 싶습니다.

#### 인수 기준

1. WHEN 사용자가 설정 파일을 제공하면 THEN Agent는 해당 설정을 읽고 적용해야 합니다
2. WHEN 설정 파일에 페이지 객체 디렉토리가 지정되면 THEN Agent는 해당 위치에 페이지 객체를 생성해야 합니다
3. WHEN 설정 파일에 테스트 파일 디렉토리가 지정되면 THEN Agent는 해당 위치에 테스트 파일을 생성해야 합니다
4. IF 설정 파일이 없으면 THEN Agent는 Playwright 기본 구조를 사용해야 합니다
5. WHEN 파일을 생성할 때 THEN Agent는 필요한 디렉토리를 자동으로 생성해야 합니다
6. WHEN 파일을 생성할 때 THEN Agent는 기존 파일을 덮어쓰기 전에 사용자에게 확인을 요청해야 합니다

### 요구사항 9: 대화형 피드백 루프

**사용자 스토리:** QA 엔지니어로서, 테스트 생성 중에 Agent에게 피드백을 제공하여, 생성된 테스트가 내 기대와 요구사항에 맞도록 하고 싶습니다.

#### 인수 기준

1. WHEN Agent가 선택자에 대한 결정을 내릴 때 THEN Agent는 개발자 확인을 요청해야 합니다
2. WHEN Agent가 페이지 객체를 생성할 때 THEN Agent는 다음 단계로 진행하기 전에 개발자 검토를 허용해야 합니다
3. IF 개발자가 수정 사항을 제공하면 THEN Agent는 즉시 피드백을 반영해야 합니다
4. WHEN Agent가 모호함을 만나면 THEN Agent는 가정하지 않고 명확한 질문을 해야 합니다
5. WHEN 테스트 생성 단계가 완료되면 THEN Agent는 다음 단계로 진행하기 전에 승인을 기다려야 합니다
