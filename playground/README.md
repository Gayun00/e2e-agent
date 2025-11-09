# Playground - E2E Agent 테스트 환경

이 디렉토리는 E2E Agent를 테스트하기 위한 샘플 프로젝트입니다.

## 구조

```
playground/
├── src/
│   ├── pages/          # 페이지 컴포넌트
│   │   ├── login.tsx   # 로그인 페이지
│   │   └── products.tsx # 상품 목록 페이지
│   └── components/     # 공통 컴포넌트
│       └── Header.tsx  # 헤더 컴포넌트
├── .e2e-agent.config.json  # E2E Agent 설정
└── .env                # 환경 변수
```

## 테스트 시나리오

### 1. 로그인 페이지 (login.tsx)
- 이메일 입력 필드
- 비밀번호 입력 필드
- 로그인 버튼
- data-testid 속성 포함

### 2. 상품 목록 페이지 (products.tsx)
- 상품 카드 목록
- 각 상품별 "장바구니 담기" 버튼
- data-testid 속성 포함

### 3. 헤더 컴포넌트 (Header.tsx)
- 네비게이션 링크
- data-testid 속성 포함

## 사용 방법

1. E2E Agent 실행:
```bash
npm start
```

2. 페이지 객체 생성 테스트:
```bash
# playground 디렉토리에서
e2e-agent generate
```

3. 에이전트가 src/ 디렉토리의 코드를 분석하여:
   - 페이지 구조 파악
   - data-testid 추출
   - Page Object 생성
   - 테스트 코드 생성

## 기대 결과

에이전트가 다음을 자동으로 생성해야 합니다:

1. `tests/pages/LoginPage.ts` - 로그인 페이지 객체
2. `tests/pages/ProductsPage.ts` - 상품 페이지 객체
3. `tests/login.spec.ts` - 로그인 테스트
4. `tests/products.spec.ts` - 상품 목록 테스트
