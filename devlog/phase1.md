# Phase 1: 핵심 MVP 개발 로그

## 1. 프로젝트 초기 설정 (완료)

### 1.1 프로젝트 초기화
**완료 날짜**: 2025-11-09

**구현 내용**:
- TypeScript 프로젝트 기본 구조 설정
- 필수 패키지 설치 및 설정
- 빌드 시스템 구성

**핵심 개념**:
- **TypeScript**: JavaScript에 타입 시스템을 추가한 언어. 컴파일 타임에 에러를 잡을 수 있어 안정성 향상
- **tsconfig.json**: TypeScript 컴파일러 설정 파일. target, module, outDir 등을 지정
- **package.json**: Node.js 프로젝트의 메타데이터와 의존성 관리

---

### 1.2 설정 파일 시스템
**완료 날짜**: 2025-11-09

**구현 내용**:
- Zod를 사용한 설정 스키마 정의
- 환경 변수 로딩 (dotenv)
- 설정 검증 및 에러 처리

**핵심 개념**:
- **Zod**: TypeScript 우선 스키마 검증 라이브러리. 런타임에 데이터 검증 + 타입 추론
- **dotenv**: .env 파일에서 환경 변수를 로드하는 라이브러리. 민감한 정보(API 키 등)를 코드에서 분리
- **타입 안전성**: `z.infer<typeof Schema>`로 스키마에서 TypeScript 타입을 자동 생성

**주요 학습 포인트**:
```typescript
// Zod 스키마 정의
const ConfigSchema = z.object({
  baseUrl: z.string().url(),
  outputDir: z.string()
});

// 타입 추론
type Config = z.infer<typeof ConfigSchema>;

// 검증
const config = ConfigSchema.parse(data); // 실패 시 에러 발생
```

---

## 2. 기본 CLI 인터페이스

### 2.1 CLI 진입점 구현
**완료 날짜**: 2025-11-09

**구현 내용**:
- Commander.js로 CLI 프레임워크 구축
- Inquirer.js로 대화형 인터페이스 구현
- 기본 명령어 처리 루프

**핵심 개념**:

#### 1. CLI(Command Line Interface)란?
터미널에서 텍스트 명령으로 프로그램을 제어하는 인터페이스. GUI 대신 명령어로 작업을 수행.

#### 2. CLI 진입점이 필요한 이유
- **사용자 인터페이스**: 사용자가 프로그램과 상호작용하는 시작점
- **명령어 파싱**: 사용자 입력을 해석하고 적절한 동작 실행
- **대화형 모드**: 연속적인 명령 입력과 응답 처리

#### 3. Commander.js
Node.js CLI 프로그램을 만들기 위한 프레임워크
```typescript
const program = new Command();
program
  .name('e2e-agent')           // 명령어 이름
  .description('설명')          // 설명
  .version('0.1.0')            // 버전
  .action(async () => {        // 실행될 함수
    // 메인 로직
  });
```

#### 4. Inquirer.js
대화형 CLI 프롬프트를 만드는 라이브러리
```typescript
const { input } = await inquirer.prompt({
  type: 'input',      // 입력 타입 (input, list, confirm 등)
  name: 'input',      // 결과 객체의 키 이름
  message: '>',       // 사용자에게 보여줄 메시지
});
```

#### 5. Shebang (`#!/usr/bin/env node`)
파일 첫 줄에 작성하는 특수 주석. Unix 계열 시스템에서 이 파일을 Node.js로 실행하도록 지정.

**구조 설계**:
```
CLI 진입점 (cli.ts)
  ↓
대화형 모드 시작
  ↓
무한 루프 (사용자 입력 대기)
  ↓
입력 받기 (Inquirer)
  ↓
명령 파싱 (Parser)
  ↓
의도에 따라 처리
  ↓
다시 입력 대기
```

**주요 학습 포인트**:
- CLI는 **진입점 → 파싱 → 처리 → 응답**의 반복 구조
- `while(true)` 루프로 대화형 모드 구현
- 종료 명령(`/exit`)으로 루프 탈출
- 빈 입력이나 특수 명령은 별도 처리

---

### 2.2 간단한 명령 파서

**핵심 개념**:

#### 1. 파서(Parser)가 필요한 이유
사용자가 입력한 자연어 텍스트를 프로그램이 이해할 수 있는 구조화된 데이터로 변환하기 위해.

**예시**:
```
입력: "로그인 테스트 만들어줘"
  ↓ 파싱
출력: { type: 'generate_test', description: '로그인 테스트 만들어줘' }
```

#### 2. 파서의 역할
- **의도 파악**: 사용자가 무엇을 원하는지 분류
- **데이터 추출**: 필요한 정보 추출 (예: 테스트 이름, 페이지 이름)
- **정규화**: 다양한 표현을 하나의 의도로 통일

#### 3. 간단한 파서 구현 방법
**키워드 매칭 방식** (현재 구현):
```typescript
// 1. 입력 정규화 (소문자, 공백 제거)
const normalized = input.toLowerCase().trim();

// 2. 키워드 포함 여부 확인
if (normalized.includes('테스트') && normalized.includes('만들')) {
  return { type: 'generate_test', description: input };
}
```

**장점**: 간단하고 빠름
**단점**: 복잡한 문장 처리 어려움

#### 4. 파서의 발전 단계
1. **Phase 1 (현재)**: 키워드 매칭
   - "테스트 만들어줘" → generate_test
   
2. **Phase 2 (향후)**: 정규표현식
   - 패턴 매칭으로 더 정교한 파싱
   
3. **Phase 3 (향후)**: LLM 기반 파싱
   - AI가 자연어를 이해하고 의도 파악

#### 5. CommandIntent 타입
TypeScript의 **Union Type**을 사용하여 가능한 모든 의도를 타입으로 정의:
```typescript
type CommandIntent = 
  | { type: 'generate_test'; description: string }
  | { type: 'init_project' }
  | { type: 'help' }
  | { type: 'unknown'; input: string };
```

**장점**:
- 타입 안전성: 잘못된 의도 타입 사용 시 컴파일 에러
- 자동완성: IDE에서 가능한 타입 제안
- 패턴 매칭: switch 문에서 모든 케이스 처리 강제

**주요 학습 포인트**:
- 파서는 **비구조화된 입력 → 구조화된 데이터** 변환
- 간단한 파서는 키워드 매칭으로 시작
- Union Type으로 가능한 모든 의도를 타입으로 표현
- 나중에 LLM으로 더 똑똑한 파싱 가능

---

## 다음 단계

- [ ] 2.2 간단한 명령 파서 (진행 중)
- [ ] 3.1 Anthropic 클라이언트 구현
- [ ] 3.2 시나리오 분석 기능
