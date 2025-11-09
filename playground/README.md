# Playground

이 디렉토리는 e2e-agent를 수동으로 테스트하기 위한 공간입니다.

## 사용 방법

1. `.env.example`을 복사하여 `.env` 파일 생성:
   ```bash
   cp .env.example .env
   ```

2. `.env` 파일에 실제 API 키 입력:
   ```
   ANTHROPIC_API_KEY=sk-ant-...
   ```

2. 프로젝트 빌드 (루트에서):
   ```bash
   npm run build
   ```

3. playground 디렉토리로 이동:
   ```bash
   cd playground
   ```

4. Agent 실행:
   ```bash
   npm start
   ```

4. 테스트 명령어 입력:
   ```
   > 로그인 테스트 만들어줘
   ```

## 생성되는 파일들

- `tests/pages/` - 페이지 객체 파일
- `tests/` - 테스트 파일
- `tests/mocks/` - Mocking 파일
- `screenshots/` - 스크린샷

모든 생성 파일은 `.gitignore`에 포함되어 있어 커밋되지 않습니다.
