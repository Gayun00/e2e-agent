# MCP 클라이언트 테스트 가이드

## 준비사항

1. **Playwright MCP 서버 설치**
   ```bash
   npm install -g @playwright/mcp-server
   ```

2. **프로젝트 빌드**
   ```bash
   # 루트 디렉토리에서
   npm run build
   ```

3. **테스트 앱 실행** (선택사항 - 실제 웹앱이 있는 경우)
   ```bash
   cd playground
   npm run dev
   ```

## 테스트 방법

### 방법 1: 테스트 스크립트 실행

```bash
cd playground
npx tsx test-mcp.ts
```

이 스크립트는 다음을 테스트합니다:
- ✅ MCP 세션 시작
- ✅ 페이지 이동
- ✅ 선택자 검증
- ✅ 스크린샷 캡처
- ✅ 입력 및 클릭
- ✅ 세션 종료

### 방법 2: Node REPL에서 직접 테스트

```bash
cd playground
node
```

```javascript
// REPL에서
const { PlaywrightMCPService } = require('../dist/services/playwright-mcp.js');

const mcpService = new PlaywrightMCPService('http://localhost:3000');

// 세션 시작
await mcpService.startSession();

// 페이지 이동
await mcpService.navigate('/login');

// 선택자 검증
await mcpService.verifySelector('getByPlaceholder("이메일")');

// 스크린샷
await mcpService.screenshot();

// 종료
await mcpService.close();
```

### 방법 3: Vitest 통합 테스트

```bash
# 루트 디렉토리에서
npm test -- playwright-mcp.test.ts
```

## 예상 출력

```
🧪 MCP 클라이언트 테스트 시작

1️⃣  MCP 세션 시작...
🔌 MCP 서버 연결 중...
   명령어: npx -y @playwright/mcp-server
✓ MCP 서버 연결 완료
   사용 가능한 도구: 15개
      - playwright_navigate
      - playwright_click
      - playwright_fill
      ...
   ✓ 세션 ID: 1234567890
   ✓ 연결 상태: true
   ✓ 사용 가능한 도구: 15개

2️⃣  페이지 이동 테스트...
🌐 페이지 이동: http://localhost:3000/login
✓ 페이지 로드 완료
   ✓ /login 페이지 로드 완료

3️⃣  선택자 검증 테스트...
🔍 선택자 검증 중... (5개)
   ✓ getByPlaceholder("휴대폰 번호") (1개 발견)
   ✓ getByPlaceholder("비밀번호") (1개 발견)
   ✓ getByRole("button", { name: "로그인" }) (1개 발견)
   ✗ getByTestId("phone-input") (발견 안됨)
   ✗ #phone (발견 안됨)

   검증 결과:
   ✓ getByPlaceholder("휴대폰 번호") - 1개 발견
   ✓ getByPlaceholder("비밀번호") - 1개 발견
   ✓ getByRole("button", { name: "로그인" }) - 1개 발견
   ✗ getByTestId("phone-input") - 발견 안됨
   ✗ #phone - 발견 안됨

4️⃣  스크린샷 캡처 테스트...
📸 스크린샷 캡처
✓ 스크린샷 캡처 완료
   ✓ 스크린샷 캡처 완료 (12345 bytes)

5️⃣  입력 및 클릭 테스트...
⌨️  입력: getByPlaceholder("휴대폰 번호") = "01012345678"
✓ 입력 완료
   ✓ 휴대폰 번호 입력 완료

✅ 모든 테스트 완료!

6️⃣  세션 종료...
✓ MCP 서버 연결 종료
   ✓ MCP 세션 종료 완료
```

## 트러블슈팅

### 1. MCP 서버 연결 실패

```
❌ MCP 서버 연결 실패: spawn npx ENOENT
```

**해결방법:**
- Node.js와 npm이 설치되어 있는지 확인
- `npx` 명령어가 PATH에 있는지 확인

### 2. Playwright 브라우저 없음

```
❌ Playwright browsers not installed
```

**해결방법:**
```bash
npx playwright install chromium
```

### 3. 포트 충돌

```
❌ 페이지 이동 실패: net::ERR_CONNECTION_REFUSED
```

**해결방법:**
- 테스트 앱이 실행 중인지 확인
- baseUrl이 올바른지 확인 (기본값: http://localhost:3000)

## 다음 단계

MCP 클라이언트가 정상 작동하면:
1. ✅ Task 9.1 완료
2. ✅ Task 9.2 완료
3. 다음: Task 10.1 - 테스트 플로우 실행 엔진 구현
