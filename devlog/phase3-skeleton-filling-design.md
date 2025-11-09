# Phase 3: MCP 기반 Skeleton 채우기 설계 (수정본)

## 개요

Phase 2에서 생성된 PLACEHOLDER 선택자를 포함한 Skeleton 코드를 Playwright MCP를 통해 실제 브라우저에서 검증하면서 실제 Playwright 선택자로 채워넣는 프로세스 설계.

## MCP의 역할

- **MCP는 검증 도구**: accessibility tree 기반으로 페이지 구조 분석 및 요소 상호작용 테스트
- **최종 코드는 Playwright 표준 문법**: `getByRole()`, `getByPlaceholder()` 등

## 현재 상태

### Phase 2 출력물 (Skeleton)

```typescript
// LoginPage.ts
export class LoginPage extends BasePage {
  get emailInput(): Locator {
    return this.page.locator('PLACEHOLDER_emailInput');  // ← 채워야 함
  }
  
  get passwordInput(): Locator {
    return this.page.locator('PLACEHOLDER_passwordInput');  // ← 채워야 함
  }
  
  async fillEmail(email: string) {
    await this.emailInput.fill(email);  // ← 선택자 검증 필요
  }
}
```

### 목표 (Phase 3 출력물)

```typescript
// LoginPage.ts
export class LoginPage extends BasePage {
  get emailInput(): Locator {
    return this.page.getByPlaceholder('이메일');  // ✓ 실제 선택자
  }
  
  get passwordInput(): Locator {
    return this.page.getByPlaceholder('비밀번호');  // ✓ 실제 선택자
  }
  
  async fillEmail(email: string) {
    await this.emailInput.fill(email);  // ✓ 검증 완료
  }
}
```

---

## 전체 워크플로우

```
1. POM Skeleton 파싱
   ├─ PLACEHOLDER 요소 목록 추출
   └─ 각 요소의 이름과 목적 파악
   ↓
2. MCP 세션 시작
   ↓
3. 페이지별로 처리
   ├─ MCP로 페이지 이동
   ├─ MCP snapshot으로 실제 페이지 구조 확인
   ├─ LLM이 Skeleton 요소 ↔ Snapshot 요소 매칭
   │  └─ Playwright 선택자 추론
   ├─ MCP ref로 실제 작동 검증
   ├─ 검증 성공 → 선택자 기록
   └─ 검증 실패 → 사용자 개입
   ↓
4. 채워진 Playwright 선택자로 코드 생성
   ↓
5. 파일 저장
```

---

## 핵심 컴포넌트

### 1. SkeletonFiller (오케스트레이터)

**책임**: 전체 프로세스 조율

```typescript
interface SkeletonFillerOptions {
  scenarioPath: string;      // 시나리오 문서 경로
  baseUrl: string;           // 테스트 대상 URL
  pagesDir: string;          // 페이지 객체 디렉토리
  testsDir: string;          // 테스트 파일 디렉토리
}

class SkeletonFiller {
  private mcpService: PlaywrightMCPService;
  private selectorFinder: SelectorFinder;
  private codeGenerator: CodeGenerator;
  
  async fill(options: SkeletonFillerOptions): Promise<FillingResult> {
    // 1. Skeleton 파일 읽기
    const skeletons = await this.loadSkeletons(options.pagesDir);
    
    // 2. 시나리오 문서 파싱
    const scenario = await this.parseScenario(options.scenarioPath);
    
    // 3. MCP 세션 시작
    await this.mcpService.startSession();
    
    // 4. 테스트 플로우 실행하며 채우기
    const filledSkeletons = await this.executeAndFill(scenario, skeletons);
    
    // 5. 코드 생성 및 저장
    await this.generateAndSave(filledSkeletons, options.pagesDir);
    
    // 6. MCP 세션 종료
    await this.mcpService.close();
    
    return { success: true, filledPages: filledSkeletons };
  }
}
```

---

### 2. SelectorMatcher (선택자 매칭)

**책임**: Skeleton 요소와 MCP Snapshot 요소를 매칭하여 Playwright 선택자 생성

```typescript
interface ElementToMatch {
  name: string;              // 'emailInput'
  placeholder: string;       // 'PLACEHOLDER_emailInput'
}

interface SnapshotElement {
  type: string;              // 'textbox', 'button', 'link'
  text: string;              // 'Email', 'Login'
  ref: string;               // 'e10'
  attributes?: Record<string, string>;
}

interface MatchResult {
  elementName: string;       // 'emailInput'
  ref: string;               // 'e10' (MCP 검증용)
  selector: string;          // 'getByRole("textbox", { name: "Email" })'
  confidence: number;        // 0-1
  verified: boolean;
}

class SelectorMatcher {
  private llmService: LLMService;
  private mcpService: PlaywrightMCPService;
  
  /**
   * Skeleton 요소와 Snapshot 매칭
   */
  async matchElement(
    element: ElementToMatch,
    snapshot: string
  ): Promise<MatchResult> {
    // 1. LLM에게 매칭 요청
    const match = await this.llmService.matchElementToSnapshot({
      elementName: element.name,
      snapshot: snapshot,
    });
    
    // LLM 응답:
    // {
    //   ref: 'e10',
    //   selector: 'getByRole("textbox", { name: "Email" })',
    //   reasoning: '...'
    // }
    
    // 2. MCP ref로 실제 작동 검증
    const verified = await this.verifyWithMCP(match.ref);
    
    if (verified) {
      return {
        elementName: element.name,
        ref: match.ref,
        selector: match.selector,
        confidence: 0.95,
        verified: true,
      };
    }
    
    // 3. 실패 시 사용자 개입
    return await this.requestUserInput(element, snapshot);
  }
  
  /**
   * MCP ref로 요소 검증
   */
  private async verifyWithMCP(ref: string): Promise<boolean> {
    try {
      // ref로 실제 상호작용 시도
      await this.mcpService.click({ ref, element: 'test element' });
      return true;
    } catch (error) {
      return false;
    }
  }
  
  /**
   * 사용자 개입 요청
   */
  private async requestUserInput(
    element: ElementToMatch,
    snapshot: string
  ): Promise<MatchResult> {
    console.log(`\n❓ 요소를 찾을 수 없습니다: ${element.name}`);
    console.log(`\n페이지 구조:\n${snapshot}\n`);
    
    // 사용자에게 선택지 제공
    const choice = await prompt({
      message: '선택하세요:',
      choices: [
        '1. 수동으로 ref 입력',
        '2. 이 요소 건너뛰기',
        '3. 스크린샷 보기'
      ]
    });
    
    // ... 처리 로직
  }
}
```

---

### 3. FlowExecutor (플로우 실행)

**책임**: 테스트 플로우를 순서대로 실행하며 선택자 채우기

```typescript
interface TestFlow {
  name: string;
  steps: FlowStep[];
}

interface FlowStep {
  description: string;       // "1. 로그인 페이지로 이동"
  page: string;              // "LoginPage"
  action: string;            // "goto" | "fillEmail" | "clickLoginButton"
  params?: any[];            // ["test@example.com"]
}

interface FilledElement {
  name: string;              // 'emailInput'
  originalSelector: string;  // 'PLACEHOLDER_emailInput'
  actualSelector: string;    // 'getByPlaceholder("이메일")'
  verified: boolean;
}

class FlowExecutor {
  private mcpService: PlaywrightMCPService;
  private selectorFinder: SelectorFinder;
  
  /**
   * 테스트 플로우 실행하며 선택자 채우기
   */
  async executeAndFill(
    flow: TestFlow,
    skeletons: Map<string, PageSkeleton>
  ): Promise<Map<string, FilledPage>> {
    
    const filledPages = new Map<string, FilledPage>();
    
    console.log(`\n🎬 테스트 플로우 실행: ${flow.name}\n`);
    
    for (const step of flow.steps) {
      console.log(`📍 ${step.description}`);
      
      // 1. 해당 페이지의 skeleton 가져오기
      const skeleton = skeletons.get(step.page);
      if (!skeleton) {
        throw new Error(`페이지를 찾을 수 없습니다: ${step.page}`);
      }
      
      // 2. 액션 실행 전 필요한 요소 확인
      const requiredElements = this.getRequiredElements(step.action, skeleton);
      
      // 3. 각 요소의 선택자 찾기
      for (const element of requiredElements) {
        if (element.selector.startsWith('PLACEHOLDER_')) {
          console.log(`   🔍 선택자 찾는 중: ${element.name}`);
          
          const result = await this.selectorFinder.findSelector({
            name: element.name,
            purpose: element.purpose,
            type: element.type,
            pagePath: skeleton.path,
          });
          
          if (result.verified) {
            console.log(`   ✓ 발견: ${result.selector}`);
            
            // 채워진 요소 기록
            this.recordFilledElement(filledPages, step.page, {
              name: element.name,
              originalSelector: element.selector,
              actualSelector: result.selector,
              verified: true,
            });
          } else {
            console.log(`   ✗ 실패: ${element.name}`);
            // 사용자 개입 필요
          }
        }
      }
      
      // 4. 실제 액션 실행 (검증용)
      await this.executeAction(step, filledPages);
      
      console.log(`   ✓ 단계 완료\n`);
    }
    
    return filledPages;
  }
  
  /**
   * 액션에 필요한 요소 추출
   */
  private getRequiredElements(
    action: string,
    skeleton: PageSkeleton
  ): ElementInfo[] {
    // 예: 'fillEmail' → ['emailInput']
    // 예: 'login' → ['emailInput', 'passwordInput', 'loginButton']
    
    const actionMap: Record<string, string[]> = {
      'fillEmail': ['emailInput'],
      'fillPassword': ['passwordInput'],
      'clickLoginButton': ['loginButton'],
      'login': ['emailInput', 'passwordInput', 'loginButton'],
    };
    
    const elementNames = actionMap[action] || [];
    return elementNames.map(name => skeleton.elements.find(e => e.name === name)!);
  }
  
  /**
   * 실제 액션 실행 (MCP 통해)
   */
  private async executeAction(
    step: FlowStep,
    filledPages: Map<string, FilledPage>
  ): Promise<void> {
    const page = filledPages.get(step.page);
    if (!page) return;
    
    switch (step.action) {
      case 'goto':
        await this.mcpService.navigate(page.path);
        break;
        
      case 'fillEmail':
        const emailElement = page.elements.find(e => e.name === 'emailInput');
        if (emailElement && step.params?.[0]) {
          await this.mcpService.fill(emailElement.actualSelector, step.params[0]);
        }
        break;
        
      case 'clickLoginButton':
        const buttonElement = page.elements.find(e => e.name === 'loginButton');
        if (buttonElement) {
          await this.mcpService.click(buttonElement.actualSelector);
        }
        break;
        
      // ... 다른 액션들
    }
  }
}
```

---

### 4. CodeGenerator (코드 생성)

**책임**: 채워진 정보로 최종 TypeScript 코드 생성

```typescript
class CodeGenerator {
  /**
   * 채워진 페이지 객체 코드 생성
   */
  generatePageObject(filledPage: FilledPage): string {
    let code = `import { Page, Locator } from '@playwright/test';\n`;
    code += `import { BasePage } from './BasePage';\n\n`;
    code += `export class ${filledPage.name} extends BasePage {\n`;
    code += `  constructor(page: Page) {\n`;
    code += `    super(page);\n`;
    code += `  }\n\n`;
    
    // 요소 getter 생성
    code += `  // 요소 getter\n`;
    for (const element of filledPage.elements) {
      if (element.verified) {
        code += `  get ${element.name}(): Locator {\n`;
        code += `    return this.page.${element.actualSelector};\n`;
        code += `  }\n\n`;
      } else {
        // 검증 실패한 요소는 주석 처리
        code += `  // TODO: 선택자를 찾지 못함\n`;
        code += `  // get ${element.name}(): Locator {\n`;
        code += `  //   return this.page.locator('${element.originalSelector}');\n`;
        code += `  // }\n\n`;
      }
    }
    
    // 메서드는 그대로 유지 (선택자만 변경됨)
    code += `  // 필수 메서드\n`;
    code += `  async goto() {\n`;
    code += `    await this.page.goto('${filledPage.path}');\n`;
    code += `  }\n\n`;
    
    // ... 나머지 메서드들
    
    code += `}\n`;
    return code;
  }
}
```

---

## 실행 예시

### 입력

**POM Skeleton** (`tests/pages/LoginPage.ts`):
```typescript
export class LoginPage extends BasePage {
  get emailInput(): Locator {
    return this.page.locator('PLACEHOLDER_emailInput');
  }
  
  get passwordInput(): Locator {
    return this.page.locator('PLACEHOLDER_passwordInput');
  }
  
  get loginButton(): Locator {
    return this.page.locator('PLACEHOLDER_loginButton');
  }
  
  async goto() {
    await this.page.goto('/login');
  }
  
  async fillEmail(email: string) {
    await this.emailInput.fill(email);
  }
  
  async fillPassword(password: string) {
    await this.passwordInput.fill(password);
  }
  
  async clickLoginButton() {
    await this.loginButton.click();
  }
}
```

### 실행 과정

```bash
$ npm start -- fill tests/pages/LoginPage.ts

🎬 Skeleton 채우기 시작

📂 Skeleton 파싱 중...
   ✓ LoginPage.ts 로드
   ✓ 3개 PLACEHOLDER 요소 발견:
      - emailInput
      - passwordInput
      - loginButton

🔌 MCP 세션 시작...
   ✓ Playwright 브라우저 연결 완료

📍 LoginPage 처리 중...
   🌐 페이지 이동: http://localhost:3000/login
   ✓ 페이지 로드 완료
   
   📸 페이지 구조 분석 중...
   ✓ Snapshot 캡처 완료
   
   페이지 구조:
   - textbox "Email" [ref=e10]
   - textbox "Password" [ref=e12]
   - button "Login" [ref=e14]

🔍 요소 매칭 중...

   1️⃣  emailInput
      🤖 LLM 분석 중...
      ✓ 매칭: textbox "Email" [ref=e10]
      ✓ 선택자: getByRole("textbox", { name: "Email" })
      🧪 MCP 검증 중...
      ⌨️  입력 테스트: ref=e10
      ✓ 검증 완료!

   2️⃣  passwordInput
      🤖 LLM 분석 중...
      ✓ 매칭: textbox "Password" [ref=e12]
      ✓ 선택자: getByRole("textbox", { name: "Password" })
      🧪 MCP 검증 중...
      ⌨️  입력 테스트: ref=e12
      ✓ 검증 완료!

   3️⃣  loginButton
      🤖 LLM 분석 중...
      ✓ 매칭: button "Login" [ref=e14]
      ✓ 선택자: getByRole("button", { name: "Login" })
      🧪 MCP 검증 중...
      🖱️  클릭 테스트: ref=e14
      ✓ 검증 완료!

✅ 모든 요소 매칭 완료! (3/3)

📝 코드 생성 중...
   ✓ tests/pages/LoginPage.ts 업데이트

🎉 완료!
```

### 출력

**채워진 코드** (`tests/pages/LoginPage.ts`):
```typescript
export class LoginPage extends BasePage {
  get emailInput(): Locator {
    return this.page.getByRole('textbox', { name: 'Email' });  // ✅ 채워짐
  }
  
  get passwordInput(): Locator {
    return this.page.getByRole('textbox', { name: 'Password' });  // ✅ 채워짐
  }
  
  get loginButton(): Locator {
    return this.page.getByRole('button', { name: 'Login' });  // ✅ 채워짐
  }
  
  async goto() {
    await this.page.goto('/login');  // ✅ 메서드는 그대로
  }
  
  async fillEmail(email: string) {
    await this.emailInput.fill(email);  // ✅ 메서드는 그대로
  }
  
  async fillPassword(password: string) {
    await this.passwordInput.fill(password);  // ✅ 메서드는 그대로
  }
  
  async clickLoginButton() {
    await this.loginButton.click();  // ✅ 메서드는 그대로
  }
}
```

---

## 실패 처리

### 선택자를 찾지 못한 경우

```bash
📍 3. 에러 메시지 확인
   🔍 선택자 찾는 중: errorMessage
      시도 1: getByTestId("errorMessage") ✗
      시도 2: getByRole("alert") ✗
      시도 3: getByText("에러 메시지") ✗
   ✗ 모든 후보 실패

❓ 선택자를 찾을 수 없습니다: errorMessage
   
   옵션:
   1. 다른 선택자 시도 (수동 입력)
   2. 이 요소 건너뛰기
   3. 스크린샷 보기
   
   선택: _
```

사용자가 "1" 선택:
```bash
   선택: 1
   
   수동 선택자 입력: getByText("로그인 실패")
   
   🔍 검증 중...
   ✓ 선택자 작동 확인!
   ✓ 발견: getByText("로그인 실패")
```

---

## 데이터 구조

### PageSkeleton (입력)

```typescript
interface PageSkeleton {
  name: string;              // 'LoginPage'
  path: string;              // '/login'
  filePath: string;          // 'tests/pages/LoginPage.ts'
  elements: ElementInfo[];
  methods: MethodInfo[];
}

interface ElementInfo {
  name: string;              // 'emailInput'
  selector: string;          // 'PLACEHOLDER_emailInput'
  type: 'input' | 'button' | 'text' | 'link';
  purpose: string;           // '이메일 입력'
}
```

### FilledPage (출력)

```typescript
interface FilledPage {
  name: string;
  path: string;
  filePath: string;
  elements: FilledElement[];
  methods: MethodInfo[];
}

interface FilledElement {
  name: string;              // 'emailInput'
  originalSelector: string;  // 'PLACEHOLDER_emailInput'
  actualSelector: string;    // 'getByPlaceholder("이메일")'
  strategy: SelectorStrategy;
  verified: boolean;
  confidence: number;
}
```

---

## 구현 순서

1. **SelectorFinder 구현** (Task 10.2)
   - 선택자 후보 생성 로직
   - MCP 검증 로직
   - 사용자 입력 처리

2. **FlowExecutor 구현** (Task 10.1)
   - 테스트 플로우 파싱
   - 순서대로 실행
   - 선택자 채우기

3. **CodeGenerator 구현** (Task 12.1, 12.2)
   - 채워진 정보로 코드 생성
   - 파일 저장

4. **SkeletonFiller 통합** (Task 13.1)
   - 전체 프로세스 조율
   - CLI 명령어 추가

---

## 다음 단계

이 설계를 바탕으로:
1. ✅ 설계 문서 작성 완료
2. ⏳ SelectorFinder 구현
3. ⏳ FlowExecutor 구현
4. ⏳ 통합 테스트

구현을 시작할까요?
