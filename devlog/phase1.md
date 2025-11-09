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
**완료 날짜**: 2025-11-09

**구현 내용**:
- 키워드 매칭 방식의 간단한 파서 구현
- Union Type으로 의도 분류
- 테스트 생성, 초기화, 도움말 등 기본 의도 파악

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

- [x] 2.2 간단한 명령 파서 (완료)
- [x] 3.1 Anthropic 클라이언트 구현 (완료)
- [ ] 3.2 시나리오 분석 기능 (진행 중)


---

## 3. LLM 기본 통합

### 3.1 Anthropic 클라이언트 구현
**완료 날짜**: 2025-11-09

**구현 내용**:
- Anthropic SDK 초기화 및 래핑
- 기본 chat 메서드 구현
- 에러 처리 및 타입 정의

**핵심 개념**:

#### 1. LLM(Large Language Model)이란?
대규모 텍스트 데이터로 학습된 AI 모델. 자연어를 이해하고 생성할 수 있음.

#### 2. Anthropic Claude
- Anthropic 회사에서 만든 LLM
- Claude 3.5 Sonnet: 코드 생성에 강한 모델
- API를 통해 프로그래밍 방식으로 사용 가능

#### 3. SDK(Software Development Kit)
특정 서비스를 쉽게 사용하기 위한 라이브러리 모음
```typescript
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: 'your-key' });
```

#### 4. 메시지 기반 대화
LLM과의 대화는 메시지 배열로 구성:
```typescript
[
  { role: 'user', content: '안녕' },
  { role: 'assistant', content: '안녕하세요!' },
  { role: 'user', content: '테스트 만들어줘' }
]
```

#### 5. 토큰(Token)
- LLM이 텍스트를 처리하는 단위
- 대략 단어의 일부 또는 전체
- 비용은 토큰 수로 계산됨
- **inputTokens**: 입력한 텍스트의 토큰 수
- **outputTokens**: 생성된 텍스트의 토큰 수

#### 6. 서비스 클래스 패턴
복잡한 로직을 클래스로 캡슐화:
```typescript
class AnthropicLLMService {
  private client: Anthropic;  // 내부 상태
  
  constructor(apiKey: string) {
    this.client = new Anthropic({ apiKey });
  }
  
  async chat(messages: Message[]): Promise<ChatResponse> {
    // 로직
  }
}
```

**장점**:
- 재사용 가능
- 테스트 용이
- 의존성 주입 가능

#### 7. 에러 처리
API 호출은 실패할 수 있으므로 에러 처리 필수:
```typescript
try {
  const response = await this.client.messages.create({...});
} catch (error) {
  if (error instanceof Anthropic.APIError) {
    // API 에러 처리
  }
  throw error;
}
```

**주요 학습 포인트**:
- LLM은 메시지 배열로 대화 컨텍스트 유지
- SDK를 사용하면 복잡한 API 호출을 간단하게 처리
- 서비스 클래스로 LLM 로직을 캡슐화
- 토큰 사용량을 추적하여 비용 관리

---

### 3.2 시나리오 분석 기능
**완료 날짜**: 2025-11-09

**구현 내용**:
- 사용자 입력에서 필요한 페이지 추출
- JSON 형식으로 구조화된 응답 받기
- 프롬프트 엔지니어링 기초

**핵심 개념**:

#### 1. 프롬프트 엔지니어링
LLM에게 원하는 결과를 얻기 위해 질문을 잘 작성하는 기술

**좋은 프롬프트의 요소**:
- **명확한 지시**: "페이지 이름을 추출해주세요"
- **형식 지정**: "JSON 형식으로만 응답해주세요"
- **예시 제공**: "로그인 테스트 → LoginPage"
- **제약 조건**: "PascalCase로 작성, Page 접미사 붙이기"

#### 2. Few-Shot Learning
예시를 제공하여 LLM이 패턴을 학습하게 하는 방법:
```
예시:
- "로그인 테스트" → ["LoginPage"]
- "상품 검색 후 장바구니" → ["SearchPage", "ProductPage", "CartPage"]
```

#### 3. 구조화된 출력
LLM 응답을 JSON으로 받으면 파싱이 쉬움:
```typescript
const response = await llm.chat([...]);
const parsed = JSON.parse(response.content);
// { "pages": ["LoginPage", "ProductPage"] }
```

#### 4. 시나리오 분석의 역할
사용자의 자연어 요청 → 구체적인 구현 계획
```
"로그인 후 상품 검색" 
  ↓ 분석
["LoginPage", "SearchPage", "ProductPage"]
  ↓
각 페이지 객체 생성
```

**주요 학습 포인트**:
- 프롬프트는 명확하고 구체적일수록 좋음
- 예시를 제공하면 LLM이 패턴을 더 잘 이해
- JSON 형식으로 응답받으면 프로그래밍적 처리 용이
- 시나리오 분석은 자연어 → 구조화된 계획 변환

## 3. LLM 기본 통합

### 3.1 Anthropic 클라이언트 구현
**완료 날짜**: 2025-11-09

**구현 내용**:
- Anthropic SDK를 사용한 LLM 서비스 클래스 구현
- 기본 chat 메서드 구현
- 에러 처리 및 응답 파싱
- 토큰 사용량 추적

**핵심 개념**:

#### 1. Anthropic SDK란?
Anthropic의 Claude AI 모델과 통신하기 위한 공식 JavaScript/TypeScript SDK입니다.

**주요 기능**:
- Messages API를 통한 대화형 AI 호출
- 스트리밍 응답 지원
- 토큰 사용량 추적
- 에러 처리

#### 2. Messages API 구조
```typescript
await client.messages.create({
  model: 'claude-3-5-sonnet-20241022',  // 사용할 모델
  max_tokens: 4096,                      // 최대 출력 토큰
  messages: [                            // 대화 메시지 배열
    { role: 'user', content: '질문' },
    { role: 'assistant', content: '답변' }
  ]
});
```

**역할(Role)**:
- `user`: 사용자 메시지
- `assistant`: AI 응답 (대화 히스토리용)
- `system`: 시스템 프롬프트 (별도 파라미터)

#### 3. 응답 구조
```typescript
{
  content: [                    // 응답 내용 (배열)
    { type: 'text', text: '...' }
  ],
  usage: {                      // 토큰 사용량
    input_tokens: 100,
    output_tokens: 50,
    cache_read_input_tokens: 0,      // 캐시에서 읽은 토큰
    cache_creation_input_tokens: 0   // 캐시 생성 토큰
  }
}
```

#### 4. 에러 처리
Anthropic SDK는 `Anthropic.APIError` 타입의 에러를 발생시킵니다:
```typescript
try {
  await client.messages.create({...});
} catch (error) {
  if (error instanceof Anthropic.APIError) {
    // API 에러 (인증, 요청 제한 등)
    console.error(error.status, error.message);
  }
  // 기타 에러 (네트워크 등)
}
```

**코드 구조 및 설계 결정사항**:

1. **서비스 클래스 패턴**
   - `AnthropicLLMService` 클래스로 캡슐화
   - 생성자에서 API 키 받아 클라이언트 초기화
   - 모델 이름을 클래스 속성으로 관리

2. **인터페이스 정의**
   - `Message`: 대화 메시지 타입
   - `ChatResponse`: 응답 타입 (토큰 사용량 포함)
   - 타입 안전성 확보

3. **응답 정규화**
   - Anthropic API 응답을 간단한 형태로 변환
   - `content[0].text`를 직접 추출
   - 토큰 사용량을 camelCase로 변환

4. **에러 처리 전략**
   - Anthropic.APIError는 명확한 메시지로 변환
   - 기타 에러는 그대로 전파
   - 예상치 못한 응답 타입 체크

**주요 학습 포인트**:

1. **Claude 3.5 Sonnet 모델**
   - 모델 ID: `claude-3-5-sonnet-20241022`
   - 최대 컨텍스트: 200K 토큰
   - 코드 생성에 최적화

2. **토큰 사용량 추적의 중요성**
   - 비용 관리를 위해 필수
   - 캐시 사용량도 별도 추적
   - 향후 Langfuse 통합 준비

3. **비동기 처리**
   - LLM 호출은 항상 비동기 (`async/await`)
   - 응답 시간이 길 수 있음 (수 초)
   - 에러 처리 필수

4. **타입 안전성**
   - TypeScript로 API 응답 타입 정의
   - 런타임 타입 체크 (`content.type !== 'text'`)
   - 예상치 못한 응답 방어

---

### 3.2 시나리오 분석 기능
**완료 날짜**: 2025-11-09

**구현 내용**:
- 사용자 입력에서 필요한 페이지 추출
- 프롬프트 엔지니어링으로 JSON 응답 유도
- JSON 파싱 및 에러 처리

**핵심 개념**:

#### 1. 프롬프트 엔지니어링이란?
LLM에게 원하는 형태의 응답을 받기 위해 질문(프롬프트)을 설계하는 기술입니다.

**좋은 프롬프트의 요소**:
- **명확한 지시**: "페이지 이름을 추출해주세요"
- **형식 지정**: "JSON 형식으로만 응답해주세요"
- **예시 제공**: "로그인 테스트 → LoginPage"
- **제약 조건**: "PascalCase로 작성하고 Page 접미사 붙이기"

#### 2. Few-Shot Learning
예시를 제공하여 LLM이 패턴을 학습하도록 하는 기법:
```
예시:
- "로그인 테스트" → ["LoginPage"]
- "상품 검색 후 장바구니 담기" → ["SearchPage", "ProductPage", "CartPage"]
```

이렇게 하면 LLM이:
- 입력 형식 이해
- 출력 형식 이해
- 명명 규칙 학습

#### 3. Structured Output (구조화된 출력)
LLM에게 특정 형식(JSON, XML 등)으로 응답하도록 요청:
```typescript
// 요청: "JSON 형식으로만 응답해주세요"
// 응답: { "pages": ["LoginPage"] }
```

**장점**:
- 파싱 쉬움
- 타입 안전성
- 에러 감소

**단점**:
- LLM이 형식을 지키지 않을 수 있음
- 파싱 에러 처리 필요

#### 4. JSON 파싱 전략
```typescript
try {
  const parsed = JSON.parse(response.content);
  return parsed;
} catch (error) {
  throw new Error('Failed to parse...');
}
```

**왜 try-catch가 필요한가?**
- LLM이 가끔 설명을 추가할 수 있음
- 형식을 완벽히 지키지 않을 수 있음
- 네트워크 문제로 응답이 잘릴 수 있음

**코드 구조 및 설계 결정사항**:

1. **메서드 분리**
   - `chat()`: 범용 LLM 호출
   - `analyzeScenario()`: 특정 작업 (시나리오 분석)
   - 각 작업마다 전용 메서드 생성 예정

2. **프롬프트 템플릿**
   - 프롬프트를 문자열 템플릿으로 작성
   - 사용자 입력을 템플릿에 삽입
   - 향후 별도 파일로 분리 가능

3. **응답 검증**
   - JSON 파싱 성공 여부 확인
   - 필요한 필드 존재 여부 체크 (향후 Zod 사용 예정)
   - 실패 시 명확한 에러 메시지

4. **타입 정의**
   - 반환 타입: `{ pages: string[] }`
   - TypeScript로 타입 안전성 확보
   - 호출하는 쪽에서 타입 체크 가능

**주요 학습 포인트**:

1. **프롬프트는 코드다**
   - 프롬프트도 버전 관리 필요
   - 테스트 및 개선 반복
   - 예시를 통해 품질 향상

2. **LLM은 완벽하지 않다**
   - 항상 응답 검증 필요
   - 파싱 에러 대비
   - 재시도 로직 고려 (향후)

3. **점진적 개선**
   - 처음엔 간단한 프롬프트
   - 문제 발견 시 개선
   - 예시 추가로 정확도 향상

4. **비용 고려**
   - 프롬프트가 길수록 비용 증가
   - 불필요한 설명 제거
   - 향후 Prompt Caching 활용

---

### 3.3 CLI에 LLM 통합
**완료 날짜**: 2025-11-09

**구현 내용**:
- CLI에서 LLM 서비스 import 및 사용 준비
- AgentConfig 타입 import로 타입 안전성 확보
- 향후 실제 LLM 호출을 위한 기반 마련

**핵심 개념**:

#### 1. 모듈 통합의 중요성
각 모듈을 독립적으로 개발한 후, 실제 사용하는 곳에서 통합하는 과정:
```typescript
import { AnthropicLLMService } from './services/llm';
import type { AgentConfig } from './types/config';
```

**왜 중요한가?**
- 모듈 간 의존성 확인
- 타입 호환성 검증
- 실제 사용 가능 여부 확인

#### 2. Type-only Import
```typescript
import type { AgentConfig } from './types/config';
```

`type` 키워드를 사용하면:
- 컴파일 시에만 사용되고 런타임에는 제거됨
- 번들 크기 감소
- 타입만 필요할 때 명시적으로 표현

#### 3. 점진적 통합 전략
한 번에 모든 기능을 연결하지 않고 단계적으로:
1. Import 추가 (현재 단계)
2. 인스턴스 생성
3. 메서드 호출
4. 에러 처리
5. 사용자 피드백

**장점**:
- 각 단계마다 검증 가능
- 문제 발생 시 범위가 좁음
- 점진적으로 기능 추가

**코드 구조 및 설계 결정사항**:

1. **Import 위치**
   - 파일 상단에 모든 import 모아두기
   - 외부 라이브러리 → 내부 모듈 순서
   - 타입 import는 `type` 키워드 사용

2. **향후 사용 계획**
   ```typescript
   // 설정 로드 후
   const llm = new AnthropicLLMService(config.anthropicApiKey);
   
   // 사용자 입력 처리 시
   const analysis = await llm.analyzeScenario(userInput);
   ```

3. **에러 처리 준비**
   - LLM 호출 실패 시 사용자에게 안내
   - API 키 누락 시 명확한 메시지
   - 네트워크 에러 대응

**주요 학습 포인트**:

1. **모듈 통합은 점진적으로**
   - Import만 추가하고 컴파일 확인
   - 타입 에러 없는지 검증
   - 실제 사용은 다음 단계에서

2. **타입 안전성 유지**
   - `AgentConfig` 타입으로 설정 구조 명확화
   - LLM 서비스 인터페이스 활용
   - 컴파일 타임에 에러 발견

3. **의존성 관리**
   - 각 모듈이 독립적으로 동작
   - CLI는 서비스를 조합하여 사용
   - 테스트 시 Mock으로 대체 가능

---
