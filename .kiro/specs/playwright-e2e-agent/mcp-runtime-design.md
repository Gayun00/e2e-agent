# MCP & Open API Integration Design

## 목적

- Phase 3(Tasks.md 9~13)에서 요구하는 "브라우저 자동 검증" 경로를 구체화한다.
- Playwright MCP와 외부 Open API 기반 브라우저 실행(예: Anthropic Computer Use, OpenAI Realtime/Browser Tool) 중 어떤 것을 언제 사용할지 결정한다.
- Skeleton → 실 브라우저 → 완성 코드까지의 흐름을 팀이 공통으로 이해할 수 있도록 한다.

## 런타임 옵션 비교

| 구분             | Playwright MCP 서버                                                | Open API 기반(Anthropic Computer Use, OpenAI Realtime 등)                    |
| ---------------- | ------------------------------------------------------------------ | ---------------------------------------------------------------------------- |
| 연결 형태        | 로컬/원격 MCP 서버와 WebSocket RPC                                 | HTTPS API (스트리밍/멀티파트)                                                |
| 브라우저 제어권  | Playwright context 직접 제어 (세션 KeepAlive 가능)                 | LLM이 중개 → 명령 지연 및 추상화                                             |
| Latency/Cost     | 낮음, 로컬 실행 시 무료                                            | 높음, 사용량 과금                                                            |
| 선택자 검증      | `locator.count`, DOM snapshot 등 세밀 제어 가능                    | 제한적, 스크린샷/텍스트 응답 위주                                            |
| Mocking/스토리지 | Playwright API 그대로 사용 가능 → Route mocking, storageState 가능 | 서비스별 지원 여부 상이, 제약 큼                                             |
| 최적 Use Case    | Dev 환경에서 반복 실험, 빠른 피드백                                | 사용자가 Playwright MCP를 띄울 수 없는 환경, 혹은 원격 실제 브라우저 필요 시 |

**정책:**

1. 기본값은 Playwright MCP. CLI 플래그 `--runtime=openapi`일 때만 Open API 경로로 전환.
2. MCP 연결 실패 시 자동으로 Open API fallback을 제안하지만, 사용자 확인 후 진행.

## 아키텍처 개요

```
            +----------------+
            |  CLI / Agent   |
            +--------+-------+
                     |
             Scenario & Skeleton
                     |
             +-------v-------+
             | FlowExecutor  |
             +-------+-------+
                     |
        +------------+-------------+
        |                          |
+-------v-------+          +-------v-------+
| MCP Transport |          | OpenAPI Proxy |
+-------+-------+          +-------+-------+
        |                          |
   Playwright MCP            External Browser API
```

### 공통 인터페이스

```ts
interface BrowserRuntime {
  startSession(opts): Promise<SessionHandle>;
  navigate(url: string): Promise<void>;
  find(selector: SelectorCandidate): Promise<SelectorProbeResult>;
  click(target: VerifiedSelector): Promise<ActionResult>;
  fill(target: VerifiedSelector, value: string): Promise<ActionResult>;
  screenshot(stepId: string): Promise<ScreenshotArtifact>;
  dispose(): Promise<void>;
}
```

- `SelectorCandidate`: purpose/type/meta 정보를 포함해 후보를 표현.
- `SelectorProbeResult`: 성공 여부, DOM 스냅샷, 스크린샷, 실패 사유 코드 포함.
- 두 구현(MCP, OpenAPI)은 이 인터페이스를 만족해야 하며, 상위 모듈은 런타임 차이를 의식하지 않는다.

## Playwright MCP 설계

1. **SessionManager**
   - `@modelcontextprotocol/sdk`로 WebSocket 연결.
   - `playwright.launch` tool 호출 → contextId 관리.
   - keep-alive ping, 재연결 로직 내장.
2. **Tool Wrappers**
   - `navigate`, `locatorEvaluate`, `click`, `fill`, `expectVisible` 등 tool을 래핑.
   - 선택자 검증: `mcp invoke playwright_locate { selector }` → DOM serialization을 받아 `SelectorProbeResult`로 변환.
3. **Artifacts**
   - 실패 시 `playwright_screenshot` tool 호출 → `runArtifacts/<timestamp>/<step>.png` 저장.
   - DOM snapshot은 JSON으로 함께 저장해 LLM 프롬프트에 첨부.
4. **Mocking/스토리지 확장**
   - Playwright route mocking을 MCP tool로 노출 (`playwright_route_add`).
   - `storageState` 저장/로드 tool을 추가해 로그인 세션 재사용.

## Open API 설계

1. **Target Providers**
   - Anthropic Computer Use API (허용 시) : `computer.use` 명령으로 브라우저 조작.
   - OpenAI Realtime API with Browser tool: `client.responses.create` + tool instructions.
2. **Proxy Layer**
   - `OpenApiProxy`가 provider별 프롬프트/세션을 감싼다.
   - `BrowserRuntime` 메서드 호출 시, 해당 명령을 structured prompt로 전달하여 실행.
3. **상태 동기화**
   - API 응답에서 받은 natural language 보고를 파싱 → `ActionResult`로 변환.
   - 선택자 검증은 스크린샷/DOM 텍스트 기반으로 휴리스틱하게 판정 → 신뢰도 점수 포함.
4. **제약 대응**
   - latency가 길기 때문에 FlowExecutor는 단계 병렬 실행을 금지하고, 사용자에게 예상 시간을 안내.
   - Mocking/스토리지 미지원 시 관련 기능을 자동으로 disable.

## 런타임 선택 로직

1. CLI 인자, 설정 파일, 환경변수(예: `E2E_AGENT_RUNTIME`) 순으로 우선순위를 둔다.
2. MCP 선택 시:
   - 로컬에서 `npx playwright mcp`가 떠 있는지 health-check.
   - 실패하면 `--runtime=openapi` 안내 메시지 출력.
3. Open API 선택 시:
   - API 키/모델 지원 여부 검증.
   - 필요한 권한(스크린샷, 브라우저 제어) 명시.

## 플로우 실행 시나리오

1. Skeleton 로드 → `FlowExecutor` 초기화.
2. `RuntimeFactory.create()`로 런타임 인스턴스 획득.
3. 각 step에서 `SelectorPlanner`가 후보 생성 → `runtime.find()`로 검증 → 성공 시 skeleton에 selector 기록.
4. 액션 실행 후 로그/스크린샷 저장.
5. 전체 플로우 완료 후 `CodeSynthesizer`가 최종 POM/테스트 파일 생성.
6. 런타임 dispose.

## 테스트 전략

- **Unit**: `SelectorPlanner`, `RuntimeFactory`를 Mock runtime으로 검증.
- **Integration**: MCP 서버를 띄운 뒤 `npm run test:mcp`로 기본 navigate/selector 검증.
- **Fallback**: OpenAPI mock server를 두고 latency/실패 시나리오를 시뮬레이션.

## 향후 고려사항

- 브라우저 리소스 절약을 위한 session pooling.
- 멀티 페이지 플로우 동시 실행을 위한 context sharding.
- Security: Open API 사용 시 PII mask 적용 및 로그 필터링.

## 선택한 Playwright MCP 서버

- **패키지**: `@playwright/mcp-server` (Microsoft Playwright 팀에서 제공하는 MCP 서버)
- **이유**
  - Tasks.md 9.1~9.2가 요구하는 navigate/click/fill/screenshot 기능 세트가 기본 도구로 제공됨.
  - Playwright 자체가 관리하는 브라우저 런타임을 사용하므로 mocking, storageState 등 기존 Playwright 기능을 그대로 승인 없이 사용할 수 있음.
  - `@modelcontextprotocol/sdk`와 1:1 호환되며, 프로젝트가 이미 해당 SDK를 의존성에 포함하고 있어 추가 런타임 의존성이 거의 없음.
  - 커뮤니티에서 활발히 사용되고 있어 유지보수 및 업데이트 리스크가 가장 낮음.

## MCP 도구 사용 전략 (Tasks.md 9.x)

| Task 참조         | Tool                                                                                                      | 사용 목적                                 | 호출 패턴                                                                |
| ----------------- | --------------------------------------------------------------------------------------------------------- | ----------------------------------------- | ------------------------------------------------------------------------ |
| 9.1 세션 초기화   | `playwright_launch`, `playwright_close`                                                                   | 브라우저 컨텍스트 생성/종료               | `SessionManager.startSession()`이 launch → contextId 보관, 종료 시 close |
| 9.2 기본 상호작용 | `playwright_navigate`                                                                                     | 페이지 진입 및 URL 확인                   | Skeleton 경로 검증, 각 step 시작 시 호출                                 |
| 9.2 요소 상호작용 | `playwright_click`, `playwright_fill`, `playwright_press`, `playwright_select_option`, `playwright_hover` | 동작 메서드 검증 및 선택자 테스트         | `FlowExecutor`가 VerifiedSelector를 받아 적절한 tool 호출                |
| 9.2 선택자 검증   | `playwright_locate`, `playwright_get_attribute`, `playwright_get_text`, `playwright_evaluate`             | 후보 selector 존재 여부와 메타데이터 확보 | `SelectorProber`가 후보마다 locate → 실패 시 evaluate로 DOM 정보 수집    |
| 9.2 시각 피드백   | `playwright_screenshot`                                                                                   | 단계 실패/성공 시 스크린샷 저장           | `FailureHandler`가 실패 시 자동 캡처, 사용자 리뷰 단계에 첨부            |
| 9.2 로깅/디버깅   | `playwright_console`, `playwright_network_events` (옵션)                                                  | 콘솔 에러, 네트워크 상태 수집             | Mocking/실패 분석 시 on-demand 호출                                      |

### Tool 사용 절차

1. **세션 부팅**: `mcp invoke playwright_launch { headless, device }` → `contextId` 저장. 실패 시 재시도 후 3회 이상 실패하면 Open API fallback 제안.
2. **도구 카탈로그 확인**: `session.listTools()` 결과에 필수 도구가 포함되어 있는지 확인. 누락 시 사용자에게 MCP 버전 업데이트 안내.
3. **선택자 검증 루프**:
   - `playwright_locate`로 후보 locator 검증 (`{ selector, timeout }`).
   - 존재하면 `SelectorProbeResult`에 DOM snapshot(`playwright_evaluate`)과 텍스트(`playwright_get_text`)를 추가로 수집해 메서드 작성 근거 확보.
   - 실패하면 `playwright_screenshot`으로 화면 상태 기록 후 다음 후보로 넘어감.
4. **액션 실행**: 검증된 selector를 사용해 `playwright_click/fill/...`를 실행하고 성공/실패 로그와 아티팩트 저장.
5. **세션 종료**: 모든 step 완료 후 `playwright_close` 호출. 실패나 예기치 않은 종료가 감지되면 `SessionManager`가 새 세션을 자동으로 띄우고 남은 step을 재시작.

이 전략은 Tasks.md 9.1~9.2의 성공 기준(세션 관리, 도구 래퍼, 선택자 검증)을 충족하며, Phase 10~11의 FlowExecutor·FailureHandler 설계와도 그대로 연계된다.
