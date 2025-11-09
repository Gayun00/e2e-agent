# E2E Agent 사용 시나리오 (대화형)

## 시나리오 1: 새 프로젝트에서 로그인 테스트 생성

### 배경
- 새로운 웹 애플리케이션 프로젝트
- Playwright가 이미 설치되어 있음
- 로그인 기능에 대한 E2E 테스트 필요

### 사용자 대화

```bash
# 1. Agent 시작
$ e2e-agent

🤖 Playwright E2E Agent
대화를 시작하세요. 도움이 필요하면 /help를 입력하세요.

# 2. 프로젝트 초기화
> 프로젝트 초기화해줘

✓ 프로젝트 초기화 중...
✓ 설정 파일 생성: .e2e-agent.config.json
✓ .env 템플릿 생성
✓ .gitignore 업데이트
✓ Playwright MCP 서버 설치 중...

📝 다음 파일들을 확인하고 설정해주세요:
- .e2e-agent.config.json (baseUrl, API keys 등)
- .env (TEST_USER_EMAIL, TEST_USER_PASSWORD)

설정이 완료되면 테스트 생성을 시작할 수 있습니다.

# 3. 도메인 지식 문서 작성 (선택 사항)
> 도메인 지식 문서를 만들어줘

✓ docs/e2e-domain.md 생성

📝 다음 정보를 추가해주세요:
- 페이지 정보 (경로, 설명)
- 테스트 플로우
- 도메인 특화 정보

문서 작성이 완료되면 알려주세요.

> 작성 완료했어

✓ 도메인 지식 문서 로드 완료

# 4. 테스트 생성
> 로그인 테스트 만들어줘

✓ 도메인 지식 로드 중...
✓ 시나리오 분석 중...

📋 분석 결과:
- 필요한 페이지: LoginPage, DashboardPage
- 테스트 플로우: 로그인 → 대시보드 확인

계속 진행할까요?
1. yes
2. no
3. tell differently

> 1

--- 페이지 객체 생성: LoginPage ---

📄 LoginPage
- 추론된 경로: /login

경로가 맞나요?
1. yes
2. no
3. tell differently

> 1

🌐 브라우저 실행 중... (http://localhost:3000/login)

🔍 요소 선택자 분석 중...

발견된 요소:
1. 이메일 입력
   - 추천: page.getByPlaceholder('이메일')
   
2. 비밀번호 입력
   - 추천: page.getByPlaceholder('비밀번호')
   
3. 로그인 버튼
   - 추천: page.getByRole('button', { name: '로그인' })

선택자가 적절한가요?
1. yes
2. no
3. tell differently

> 1

📸 스크린샷 생성 준비 중...

🔍 페이지 의존성 분석 중...
- API: POST /api/auth/login
- LocalStorage: authToken

Mocking 설정을 생성할까요?
1. yes
2. no

> 1

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

Mocking 설정이 적절한가요?
1. yes
2. no
3. tell differently

> 1

✓ LoginPage 생성 완료! (tests/pages/LoginPage.ts)

--- 페이지 객체 생성: DashboardPage ---

(동일한 프로세스 반복...)

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

테스트가 적절한가요?
1. yes
2. no
3. tell differently

> 1

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

다음 명령어로 테스트를 실행하세요:
npx playwright test tests/login.spec.ts

# 5. 스크린샷 생성 (선택 사항)
> @LoginPage의 pc, mobile 스크린샷 찍어줘

✓ LoginPage 로드 중...
✓ Mocking 설정 확인

📸 스크린샷 생성 중...

시나리오: success
✓ screenshots/LoginPage/pc-success.png
✓ screenshots/LoginPage/mobile-success.png

시나리오: error
✓ screenshots/LoginPage/pc-error.png
✓ screenshots/LoginPage/mobile-error.png

✅ 완료! 4개 스크린샷 생성

# 6. 계속 작업
> 이제 상품 목록 페이지 테스트 만들어줘

✓ 기존 페이지 객체 로드 중... (LoginPage, DashboardPage)
✓ 시나리오 분석 중...

(새로운 테스트 생성 프로세스 시작...)
```

---

## 시나리오 2: 기존 프로젝트에 새 테스트 추가

### 사용자 대화

```bash
$ e2e-agent

🤖 Playwright E2E Agent

> 상품 목록 조회 테스트 만들어줘

✓ 도메인 지식 로드 중...
✓ 기존 페이지 객체 로드 중... (LoginPage, DashboardPage)
✓ 시나리오 분석 중...

📋 분석 결과:
- 필요한 페이지: ProductListPage (새로 생성), LoginPage (재사용)
- 테스트 플로우: 로그인 → 상품 목록 페이지 이동 → 상품 확인

계속 진행할까요?
1. yes
2. no
3. tell differently

> 1

--- 페이지 객체 생성: ProductListPage ---

📄 ProductListPage
- 추론된 경로: /products

경로가 맞나요?
1. yes
2. no
3. tell differently

> 1

🌐 브라우저 실행 중... (http://localhost:3000/products)

⚠️  /login으로 리다이렉트 감지!

📚 도메인 문서에서 로그인 정보 확인...
✓ 로그인 계정 발견
✓ 로그인 플로우 발견

🔐 자동 로그인 수행 중...
✓ 로그인 완료

🔄 /products 페이지 재시도...
✓ 접근 성공!

💡 테스트에 로그인 beforeEach가 추가됩니다.

🔍 요소 선택자 분석 중...

발견된 요소:
1. 상품 카드
   - 추천: page.getByRole('article')
   
2. 상품 제목
   - 추천: page.getByRole('heading', { level: 2 })
   
3. 가격
   - 추천: page.getByTestId('product-price')

선택자가 적절한가요?
1. yes
2. no
3. tell differently

> 1

🔍 페이지 의존성 분석 중...
- API: GET /api/products
- LocalStorage: authToken (LoginPage에서 설정됨)

🔍 기존 mocking 검색 중...
⚠️  동일한 API 엔드포인트가 없습니다.

Mocking 설정을 생성할까요?
1. yes
2. no

> 1

💡 생성된 Mocking 설정:
```typescript
async setupMocks(scenario: 'default' | 'empty' | 'error' = 'default') {
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

Mocking 설정이 적절한가요?
1. yes
2. no
3. tell differently

> 1

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

테스트가 적절한가요?
1. yes
2. no
3. tell differently

> 1

✓ 테스트 파일 생성: tests/product-list.spec.ts

✅ 완료!
```

---

## 시나리오 3: 에러 처리 및 해결

### 사용자 대화

```bash
> @LoginPage 업데이트해줘

✓ LoginPage 로드 중...
✓ 브라우저 실행 중... (http://localhost:3000/login)

🔍 기존 선택자 검증 중...

⚠️  문제 발견:
1. ❌ page.getByPlaceholder('이메일') - 요소를 찾을 수 없음
2. ✅ page.getByPlaceholder('비밀번호') - 정상
3. ✅ page.getByRole('button', { name: '로그인' }) - 정상

💡 해결 방법:
이메일 입력 필드의 선택자를 다음으로 변경:
- 새 추천: page.getByLabel('이메일 주소')
- 이유: placeholder가 제거되고 label이 추가됨

해결 방법을 적용할까요?
1. approve
2. tell differently

> 1

✓ LoginPage 업데이트 완료!

🧪 테스트 검증 중...
✓ tests/login.spec.ts 실행 성공!

✅ 완료!
```

---

## 시나리오 4: 여러 작업 연속 수행

### 사용자 대화

```bash
> 로그인 테스트 만들고 스크린샷도 찍어줘

✓ 작업 분석 중...
- 작업 1: 로그인 테스트 생성
- 작업 2: 스크린샷 생성

각 작업을 순차적으로 진행합니다.

--- 작업 1: 로그인 테스트 생성 ---

(테스트 생성 프로세스...)

✓ 로그인 테스트 생성 완료!

--- 작업 2: 스크린샷 생성 ---

어떤 페이지의 스크린샷을 생성할까요?
- LoginPage
- DashboardPage

> LoginPage

어떤 디바이스로 생성할까요?
1. PC만
2. Mobile만
3. 둘 다

> 3

📸 스크린샷 생성 중...
✓ screenshots/LoginPage/pc-success.png
✓ screenshots/LoginPage/mobile-success.png
✓ screenshots/LoginPage/pc-error.png
✓ screenshots/LoginPage/mobile-error.png

✅ 모든 작업 완료!
```

---

## 시나리오 5: 세션 관리

### 사용자 대화

```bash
> 로그인 테스트 만들어줘

(테스트 생성...)

✅ 완료!

> 상품 페이지 테스트도 만들어줘

(이전 컨텍스트 유지하며 새 테스트 생성...)

✅ 완료!

> /clear

✓ 세션 초기화 완료
대화 기록이 삭제되었습니다.

> 안녕

🤖 안녕하세요! 무엇을 도와드릴까요?
```

---

## 명령어 참조

### 특수 명령어
- `/help` - 도움말 표시
- `/clear` - 세션 초기화
- `/exit` - Agent 종료

### 파일 참조
- `@PageName` - 페이지 객체 참조 (자동완성 지원)
- 예: `@LoginPage`, `@ProductListPage`

### 자연어 명령 예시
- "로그인 테스트 만들어줘"
- "@LoginPage 스크린샷 찍어줘"
- "상��� 목록 페이지 테스트 추가해줘"
- "@LoginPage 업데이트해줘"
- "프로젝트 초기화해줘"
- "도메인 지식 문서 만들어줘"

---

## 확인 응답 패턴

### Yes/No 질문
```
1. yes
2. no
3. tell differently
```

### 에러 해결
```
1. approve
2. tell differently
```

### 자연어 응답
간단한 자연어로도 응답 가능:
- "응", "네", "좋아", "맞아" → yes
- "아니", "아니야", "틀려" → no
- 구체적인 수정 사항 → tell differently

---

## 주요 특징

✅ **지속적인 대화 세션**
- 한 번 시작하면 여러 작업 연속 수행
- 이전 컨텍스트 유지
- `/clear`로 세션 초기화

✅ **자동완성 지원**
- `@` 입력 시 페이지 객체 목록 표시
- 파일 경로 자동 완성

✅ **자동 로그인**
- 로그인 필요 페이지 자동 감지
- 도메인 문서 기반 자동 로그인
- 테스트에 자동으로 로그인 단계 추가

✅ **Mocking 공통화**
- 중복 API mocking 자동 감지
- 공통 mocking 파일 제안
- 재사용 가능한 mocking 관리

✅ **단계별 확인**
- 각 단계마다 사용자 확인
- 명확한 선택지 제공
- 자연어 입력 지원
