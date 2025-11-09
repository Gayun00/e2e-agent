---
inclusion: always
---

# 기술 스택

## 핵심 기술

- **언어**: TypeScript (ES2022 타겟)
- **런타임**: Node.js
- **빌드 시스템**: TypeScript Compiler (tsc)
- **테스팅 프레임워크**: Vitest
- **AI 통합**: Anthropic SDK (@anthropic-ai/sdk)

## 주요 의존성

- `commander`: CLI 프레임워크
- `inquirer`: 대화형 CLI 프롬프트
- `zod`: 스키마 검증 및 타입 안전성
- `dotenv`: 환경 변수 관리

## 개발 도구

- TypeScript 5.6+
- Prettier (코드 포맷팅)
- ESLint (린팅)

## 자주 사용하는 명령어

```bash
# 프로젝트 빌드
npm run build

# watch 모드로 개발
npm run dev

# CLI 실행
npm start

# 테스트 실행 (단일 실행)
npm test

# watch 모드로 테스트 실행
npm run test:watch
```

## 설정

- 환경 변수는 `.env` 파일에 저장 (커밋하지 않음)
- 프로젝트 설정은 `.e2e-agent.config.json` 파일에 저장 (init 명령으로 생성)
- TypeScript 설정은 strict 모드와 CommonJS 모듈 사용
- 출력 디렉토리: `dist/`
- 소스 디렉토리: `src/`

## API 키

AI 기능을 위해 `.env` 파일에 `ANTHROPIC_API_KEY`가 필요합니다.
