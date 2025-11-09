# E2E Agent 사용 시나리오

## 시나리오 1: 새 프로젝트에서 로그인 테스트 생성

### 배경
- 새로운 웹 애플리케이션 프로젝트
- Playwright가 이미 설치되어 있음
- 로그인 기능에 대한 E2E 테스트 필요

### 사용자 행동

```bash
# 1. Agent 설치
npm install -g @your-org/playwright-e2e-agent

# 2. 프로젝트 초기화
cd my-project
e2e-agent init
```

**Agent 응답:**
```
✓ Playwright E2E Agent 초기화 중...
✓ 설정 파일 생성: .e2e-agent.config.json
✓ Playwright MCP 서버 설치 중...
✓ 초기화 완료!

다음 정보를 입력해주세요:
? 테스트 대상 URL: http://localhost:3000
? Anthropic API Key: sk-ant-...
? Langfuse 사용하시겠습니까? (Y/n): n
? 페이지 객체 디렉토리 (기본: tests/pages): [Enter]
? 테스트 파일 디렉토리 (기본: tests): [Enter]

✓ 설정 완료!
```

```bash
# 3. 도메인 지식 문서 작성 (선택 사항)
mkdir -p docs
cat > docs/e2e-domain.md << EOF
# E2E 테스트 도메인 지식

## 페이지 정보

### 로그인 페이지
- 경로: /login
- 설명: 사용자 인증 페이지
- 접근: 직접 URL 또는 홈페이지의 "로그인" 버튼

## 도메인 정보

### 인증
- 테스트 계정: test@example.com / Test1234!
- 로그인 성공 시 /dashboard로 리다이렉트
- 실패 시 에러 메시지 표시
EOF

# 4. 테스트 생성 시작
e2e-agent generate
```

**Agent 대화:**
```
🤖 Playwright E2E Agent

? 어떤 테스트를 생성하시겠습니까?: 로그인 테스트

✓ 도메인 지식 문서 로드 중... (docs/e2e-domain.md)
✓ 시나리오 분석 중...

📋 분석 결과:
- 필요한 페이지: LoginPage, DashboardPage
- 테스트 플로우: 로그인 → 대시보드 확인

? 계속 진행하시겠습니까? (Y/n): y

--- 페이지 객체 생성 ---

📄 LoginPage
- 추론된 경로: /login
? 경로가 맞습니까? (Y/n): y

🌐 브라우저 실행 중... (http://localhost:3000/login)

🔍 요소 선택자 분석 중...

발견된 요소:
1. 이메일 입력: 
   - 추천: page.getByPlaceholder('이메일')
   - 대안: page.getByLabel('이메일')
   
2. 비밀번호 입력:
   - 추천: page.getByPlaceholder('비밀번호')
   - 대안: page.getByLabel('비밀번호')
   
3. 로그인 버튼:
   - 추천: page.getByRole('button', { name: '로그인' })

? 선택자가 적절합니까? (Y/n/수정): y

📸 스크린샷 생성 준비 중...

🔍 페이지 의존성 분석 중...
- API: POST /api/auth/login
- LocalStorage: authToken

? 기존 mocking 설정이 없습니다. 생성하시겠습니까? (Y/n): y

💡 생성된 Mocking 설정:
```typescript
async setupMocks(scenario: 'success' | 'error' = 'success') {
  await this.page.route('/api/auth/login', route => {
    if (scenario === 'error') {
      route.fulfill({
        status: 401,
        body: JSON.stringify({ error: '인증 실패' })
      });
    } else {
      route.fulfill({
        status: 200,
        body: JSON.stringify({ 
          token: 'mock-token-123',
          user: { email: 'test@example.com' }
        })
      });
    }
  });
}
```

? Mocking 설정이 적절합니까? (Y/n/수정): y

📸 스크린샷 생성 중...
✓ screenshots/LoginPage/pc-success.png
✓ screenshots/LoginPage/mobile-success.png
✓ screenshots/LoginPage/pc-error.png
✓ screenshots/LoginPage/mobile-error.png

✓ LoginPage 생성 완료! (tests/pages/LoginPage.ts)

--- DashboardPage 생성 (동일한 프로세스) ---

✓ DashboardPage 생성 완료! (tests/pages/DashboardPage.ts)

--- 테스트 시나리오 구성 ---

💡 생성된 테스트:
```typescript
test.describe('로그인 테스트', () => {
  test('성공적인 로그인', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const dashboardPage = new DashboardPage(page);
    
    await loginPage.goto();
    await loginPage.login('test@example.com', 'Test1234!');
    await expect(dashboardPage.welcomeMessage).toBeVisible();
  });
  
  test('잘못된 자격증명으로 로그인 실패', async ({ page }) => {
    const loginPage = new LoginPage(page);
    
    await loginPage.goto();
    await loginPage.login('wrong@example.com', 'wrong');
    await expect(loginPage.errorMessage).toContainText('인증 실패');
  });
});
```

? 테스트가 적절합니까? (Y/n): y

✓ 테스트 파일 생성: tests/login.spec.ts

🧪 테스트 검증 중...
✓ 테스트 실행 성공!

📚 문서 업데이트 중...
✓ docs/e2e-domain.md 업데이트

✅ 완료!

생성된 파일:
- tests/pages/LoginPage.ts
- tests/pages/DashboardPage.ts
- tests/login.spec.ts
- screenshots/LoginPage/ (4개 파일)
- screenshots/DashboardPage/ (4개 파일)

다음 명령어로 테스트를 실행하세요:
npx playwright test tests/login.spec.ts
```

### 검증 포인트

✅ **잘 작동하는 부분:**
1. 도메인 지식 문서 로드
2. 페이지 경로 추론 및 확인
3. 선택자 자동 결정 및 사용자 확인
4. Mocking 설정 생성 및 확인
5. 스크린샷 자동 생성
6. 테스트 코드 생성

❓ **검토 필요:**
1. 브라우저가 이미 실행 중이면? → MCP 세션 재사용?
2. 선택자 검증 실패 시 재시도 로직?
3. 스크린샷 생성 실패 시 처리?

---

## 시나리오 2: 기존 프로젝트에 새 테스트 추가

### 배경
- 이미 LoginPage, DashboardPage가 존재
- 상품 목록 페이지 테스트 추가 필요

### 사용자 행동

```bash
e2e-agent generate
```

**Agent 대화:**
```
🤖 Playwright E2E Agent

? 어떤 테스트를 생성하시겠습니까?: 상품 목록 조회 테스트

✓ 도메인 지식 문서 로드 중...
✓ 기존 페이지 객체 로드 중... (LoginPage, DashboardPage)
✓ 시나리오 분석 중...

📋 분석 결과:
- 필요한 페이지: ProductListPage (새로 생성), LoginPage (재사용)
- 테스트 플로우: 로그인 → 상품 목록 페이지 이동 → 상품 확인

? 계속 진행하시겠습니까? (Y/n): y

--- 페이지 객체 생성 ---

📄 ProductListPage (새로 생성)
- 추론된 경로: /products
? 경로가 맞습니까? (Y/n): y

🌐 브라우저 실행 중...

⚠️  페이지 접근을 위해 로그인이 필요합니다.
? LoginPage의 기존 mocking을 사용하시겠습니까? (Y/n): y

✓ 로그인 mocking 적용
✓ /products 페이지 로드

🔍 요소 선택자 분석 중...

발견된 요소:
1. 상품 카드:
   - 추천: page.getByRole('article')
   
2. 상품 제목:
   - 추천: page.getByRole('heading', { level: 2 })
   
3. 가격:
   - 추천: page.getByTestId('product-price')

? 선택자가 적절합니까? (Y/n/수정): y

📸 스크린샷 생성 준비 중...

🔍 페이지 의존성 분석 중...
- API: GET /api/products
- LocalStorage: authToken (LoginPage에서 설정됨)

💡 생성된 Mocking 설정:
```typescript
async setupMocks(scenario: 'default' | 'empty' | 'error' = 'default') {
  // 인증 토큰은 LoginPage mocking 재사용
  
  await this.page.route('/api/products', route => {
    if (scenario === 'empty') {
      route.fulfill({
        status: 200,
        body: JSON.stringify({ products: [] })
      });
    } else if (scenario === 'error') {
      route.fulfill({
        status: 500,
        body: JSON.stringify({ error: '서버 오류' })
      });
    } else {
      route.fulfill({
        status: 200,
        body: JSON.stringify({
          products: [
            { id: 1, name: '상품 1', price: 10000 },
            { id: 2, name: '상품 2', price: 20000 }
          ]
        })
      });
    }
  });
}
```

? Mocking 설정이 적절합니까? (Y/n/수정): y

📸 스크린샷 생성 중...
✓ screenshots/ProductListPage/pc-default.png
✓ screenshots/ProductListPage/mobile-default.png
✓ screenshots/ProductListPage/pc-empty.png
✓ screenshots/ProductListPage/mobile-empty.png

✓ ProductListPage 생성 완료!

--- 테스트 시나리오 구성 ---

💡 생성된 테스트:
```typescript
test.describe('상품 목록 테스트', () => {
  test.beforeEach(async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.setupMocks('success');
    await loginPage.login('test@example.com', 'Test1234!');
  });
  
  test('상품 목록 표시', async ({ page }) => {
    const productListPage = new ProductListPage(page);
    
    await productListPage.goto();
    await productListPage.setupMocks('default');
    
    const products = await productListPage.getProducts();
    expect(products).toHaveLength(2);
  });
  
  test('상품이 없을 때 빈 상태 표시', async ({ page }) => {
    const productListPage = new ProductListPage(page);
    
    await productListPage.goto();
    await productListPage.setupMocks('empty');
    
    await expect(productListPage.emptyMessage).toBeVisible();
  });
});
```

? 테스트가 적절합니까? (Y/n): y

✓ 테스트 파일 생성: tests/product-list.spec.ts

✅ 완료!
```

### 검증 포인트

✅ **잘 작동하는 부분:**
1. 기존 페이지 객체 재사용
2. 페이지 간 의존성 처리 (로그인 필요)
3. 기존 mocking 재사용
4. 여러 시나리오 mocking

❓ **검토 필요:**
1. beforeEach에서 mocking 설정을 어떻게 관리?
2. 페이지 간 의존성을 자동으로 파악할 수 있나?
3. 기존 mocking과 새 mocking의 충돌 방지?

---

## 시나리오 3: 선택자 수정 및 재생성

### 배경
- LoginPage가 이미 생성됨
- UI가 변경되어 선택자가 작동하지 않음

### 사용자 행동

```bash
e2e-agent update --page LoginPage
```

**Agent 대화:**
```
🤖 Playwright E2E Agent - 업데이트 모드

📄 LoginPage 로드 중...
✓ tests/pages/LoginPage.ts

🌐 브라우저 실행 중... (http://localhost:3000/login)

🔍 기존 선택자 검증 중...

⚠️  문제 발견:
1. ❌ page.getByPlaceholder('이메일') - 요소를 찾을 수 없음
2. ✅ page.getByPlaceholder('비밀번호') - 정상
3. ✅ page.getByRole('button', { name: '로그인' }) - 정상

🔍 대체 선택자 분석 중...

이메일 입력 필드:
- 새 추천: page.getByLabel('이메일 주소')
- 이유: placeholder가 제거되고 label이 추가됨

? 선택자를 업데이트하시겠습니까? (Y/n): y

✓ LoginPage 업데이트 완료!

📸 스크린샷 재생성 중...
✓ screenshots/LoginPage/pc-success.png (업데이트)
✓ screenshots/LoginPage/mobile-success.png (업데이트)

🧪 테스트 검증 중...
✓ tests/login.spec.ts 실행 성공!

✅ 완료!
```

### 검증 포인트

✅ **잘 작동하는 부분:**
1. 기존 선택자 검증
2. 문제 있는 선택자 자동 감지
3. 대체 선택자 제안
4. 스크린샷 재생성

❓ **검토 필요:**
1. 여러 페이지를 한번에 업데이트?
2. 선택자 변경이 다른 테스트에 미치는 영향?

---

## 시나리오 4: 스크린샷만 재생성

### 배경
- UI 스타일만 변경됨 (기능은 동일)
- 스크린샷만 업데이트 필요

### 사용자 행동

```bash
e2e-agent screenshot --page LoginPage --devices pc,mobile
```

**Agent 대화:**
```
🤖 Playwright E2E Agent - 스크린샷 모드

📄 LoginPage 로드 중...
✓ Mocking 설정 확인

📸 스크린샷 생성 중...

시나리오: success
✓ screenshots/LoginPage/pc-success.png
✓ screenshots/LoginPage/mobile-success.png

시나리오: error
✓ screenshots/LoginPage/pc-error.png
✓ screenshots/LoginPage/mobile-error.png

✅ 완료! 4개 스크린샷 생성
```

### 검증 포인트

✅ **잘 작동하는 부분:**
1. 독립적인 스크린샷 생성 명령
2. 디바이스 선택 가능

❓ **검토 필요:**
1. 모든 페이지의 스크린샷을 한번에?
2. 특정 시나리오만 선택?

---

## 발견된 이슈 및 개선 사항

### 1. 페이지 간 의존성 관리

**문제:** ProductListPage가 로그인이 필요한데, 이를 어떻게 자동으로 파악?

**해결 방안:**
- 도메인 지식 문서에 명시
- 또는 401 응답을 받으면 자동으로 로그인 필요 판단
- beforeEach에 자동으로 로그인 추가

### 2. Mocking 재사용 및 조합

**문제:** 여러 페이지가 같은 API를 사용할 때 mocking 중복

**해결 방안:**
- 공통 mocking을 별도 파일로 분리
- `tests/mocks/auth.mock.ts`, `tests/mocks/products.mock.ts`
- 페이지 객체에서 import하여 사용

### 3. 테스트 실행 전 Mocking 설정

**문제:** 테스트에서 mocking을 언제 호출해야 하는지 불명확

**해결 방안:**
- 테스트 생성 시 자동으로 적절한 위치에 `setupMocks()` 호출 추가
- beforeEach 또는 각 테스트 시작 부분

### 4. 선택자 변경 영향 분석

**문제:** 한 페이지의 선택자 변경이 다른 테스트에 영향

**해결 방안:**
- 선택자 업데이트 시 영향받는 테스트 파일 목록 표시
- 모든 관련 테스트 재실행 제안

### 5. 대화형 모드 vs 배치 모드

**문제:** CI/CD에서는 대화형 확인 불가

**해결 방안:**
- `--yes` 플래그로 모든 확인 자동 승인
- `--config` 파일로 선택자 전략 등 미리 설정

### 6. 스크린샷 비교 기능

**추가 기능:**
- 이전 스크린샷과 비교하여 변경 사항 표시
- 시각적 회귀 테스트 지원

---

## 추가 필요 기능

### 1. 업데이트 명령어
```bash
e2e-agent update --page <PageName>
```

### 2. 스크린샷 전용 명령어
```bash
e2e-agent screenshot [options]
  --page <PageName>      특정 페이지만
  --all                  모든 페이지
  --devices <list>       pc,mobile,tablet
  --scenarios <list>     success,error,loading
```

### 3. 검증 명령어
```bash
e2e-agent verify [options]
  --page <PageName>      특정 페이지 선택자 검증
  --all                  모든 페이지 검증
  --fix                  문제 발견 시 자동 수정
```

### 4. 설정 파일 확장

```json
{
  "baseUrl": "http://localhost:3000",
  "paths": {
    "pages": "tests/pages",
    "tests": "tests",
    "screenshots": "screenshots",
    "mocks": "tests/mocks"
  },
  "auth": {
    "enabled": true,
    "emailEnvVar": "TEST_USER_EMAIL",
    "passwordEnvVar": "TEST_USER_PASSWORD",
    "loginPath": "/login"
  },
  "llm": {
    "provider": "anthropic",
    "model": "claude-3-5-sonnet-20241022",
    "apiKey": "sk-ant-..."
  },
  "selectors": {
    "priority": ["role", "label", "placeholder", "text", "testId"],
    "autoFix": false
  },
  "screenshots": {
    "devices": ["pc", "mobile"],
    "scenarios": ["default"]
  },
  "mocking": {
    "enabled": true,
    "sharedMocks": "tests/mocks"
  }
}
```

---

## 결론

### 설계가 잘 된 부분
✅ 단계별 사용자 확인
✅ 도메인 지식 활용
✅ MCP 통합으로 브라우저 제어
✅ Mocking 설정 자동 생성
✅ 스크린샷 자동 생성

### 보완 필요 부분
⚠️ 페이지 간 의존성 자동 파악
⚠️ Mocking 재사용 및 공통화
⚠️ 선택자 업데이트 명령어
⚠️ 배치 모드 지원
⚠️ 영향 분석 기능

### 추가 고려 사항
💡 공통 mocking 파일 관리
💡 테스트 실행 전 mocking 자동 설정
💡 선택자 변경 영향 분석
💡 스크린샷 비교 기능
