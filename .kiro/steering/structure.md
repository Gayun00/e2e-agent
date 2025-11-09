---
inclusion: always
---

# 프로젝트 구조

## 디렉토리 레이아웃

```
src/
├── cli.ts              # commander 설정이 포함된 CLI 진입점
├── index.ts            # 메인 export 파일
├── config/             # 설정 로딩 및 검증
│   ├── loader.ts       # 설정 파일 및 환경 변수 로딩
│   └── loader.test.ts  # 설정 로더 테스트
└── types/              # TypeScript 타입 정의
    └── config.ts       # Zod 스키마 및 설정 타입

dist/                   # 컴파일된 JavaScript 출력 (gitignored)
tests/                  # 생성된 테스트 파일 (gitignored)
node_modules/           # 의존성 (gitignored)
```

## 코드 구성 패턴

### 설정 관리

- 검증을 위해 Zod 스키마 사용 (`src/types/config.ts`)
- `.e2e-agent.config.json` 파일에서 설정 로드
- dotenv를 통해 환경 변수 로드
- 인증 자격 증명 로딩 함수 분리

### 타입 안전성

- Zod 스키마를 먼저 정의한 후 TypeScript 타입 추론
- 타입 추출을 위해 `z.infer<typeof Schema>` 사용
- Strict TypeScript 모드 활성화

### 테스팅

- 테스트 파일은 소스와 함께 배치: `*.test.ts`
- 단위 테스트에 Vitest 사용
- 테스트는 빌드 출력에서 제외

### CLI 구조

- 바이너리 진입점: `dist/cli.js`
- CLI 명령어: `e2e-agent`
- 명령어 파싱에 commander 사용
- 대화형 프롬프트에 inquirer 사용

## 파일 명명 규칙

- 소스 파일: 하이픈을 사용한 소문자 (예: `config-loader.ts`)
- 테스트 파일: `*.test.ts` 접미사
- 타입 정의 파일: `types/` 디렉토리에 설명적인 이름 사용

## 생성된 파일 (저장소에 없음)

- `tests/pages/`: Page Object Model 클래스
- `tests/`: 생성된 테스트 파일
- `tests/mocks/`: 모킹 데이터 및 스크린샷
- `dist/`: 컴파일된 출력
