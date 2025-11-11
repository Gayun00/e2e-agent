# Phase 3 런타임 진행 상황 (CrewAI + MCP)

## 2024-11-24 — 런타임 스캐폴딩 1차 작업

- `CrewAgentRuntime` 추가 (src/agents/crew-runtime.ts)
  - Anthropic 기반 플래너와 Playwright MCP 도구 레지스트리를 묶어 Phase 3의 9.1~9.2 항목을 충족
  - `runPlanning` 플로우, 도구 카탈로그, MCP 세션 수명주기 헬퍼 제공
- CLI에 `e2e-agent crew <action>` 진입점 추가
  - `plan`: 시나리오 파싱 → LLM JSON 플랜 생성 → 파싱 실패 시 폴백 플랜 사용
  - `tool-check`: MCP 세션 기동 후 사용 가능한 도구 목록을 출력해 Phase 2/3 검증 체크리스트 수행
- Crew 전용 타입 정의(`src/types/crew.ts`)로 플랜·도구 호출·승인 로그 상태를 유지
- `npm run build` 통과 확인

### 현재 테스트 상태
- ✅ `npm run build`
- ⏭️ `e2e-agent crew plan --scenario <파일>`: 시나리오 문서와 MCP 서버 준비되면 수동 실행 예정
- ⏭️ `crew tool-check`: MCP 서버 실행 상태에서 드라이런 필요 (Phase 1 체크리스트)

### 다음 단계
1. 일반 `generate`/대화형 흐름이 Crew 런타임을 통해 실행되도록 연결 (tasks 9.3, 10.x)
2. MCP 스트리밍 안정화 후 메서드 단위 승인 루프와 화면 미리보기 명령 구현
3. 요구사항 13.1~13.4에 맞춰 세션 체크포인트/수동 선택자 입력을 영속화
