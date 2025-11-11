import { randomUUID } from 'node:crypto';
import { AgentConfig } from '../types/config';
import { ScenarioParser } from '../services/scenario-parser';
import { AnthropicLLMService } from '../services/llm';
import { PlaywrightMCPService } from '../services/playwright-mcp';
import type { PageDefinition, TestFlow } from '../types/scenario';
import type { MCPTool } from '../types/mcp';
import type {
  CrewPlan,
  CrewPlanResult,
  CrewPlanPhase,
  CrewSessionState,
  CrewTaskDefinition,
  CrewToolBinding,
  CrewToolContext,
  CrewToolInvocationLog,
  CrewToolInvocationResult,
} from '../types/crew';

interface CrewRuntimeOptions {
  autoStartMCP?: boolean;
}

export class CrewAgentRuntime {
  private readonly llm: AnthropicLLMService;
  private readonly parser = new ScenarioParser();
  private readonly mcpService: PlaywrightMCPService;
  private readonly tools = new Map<string, CrewToolBinding>();
  private readonly state: CrewSessionState;
  private initialized = false;
  private readonly options: CrewRuntimeOptions;

  constructor(private readonly config: AgentConfig, options: CrewRuntimeOptions = {}) {
    this.llm = new AnthropicLLMService(config.anthropicApiKey);
    this.mcpService = new PlaywrightMCPService(config.baseUrl);
    this.options = options;
    this.state = {
      sessionId: randomUUID(),
      selectorsByPage: {},
      approvals: [],
      toolInvocations: [],
      plan: null,
      mcpSession: null,
    };
  }

  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }
    this.registerDefaultTools();
    this.initialized = true;

    if (this.options.autoStartMCP) {
      await this.ensureMCPSession();
    }
  }

  getSessionState(): CrewSessionState {
    return this.state;
  }

  listRegisteredTools(): CrewToolBinding[] {
    return Array.from(this.tools.values());
  }

  async runPlanning(scenarioPath: string): Promise<CrewPlanResult> {
    await this.initialize();
    const scenario = await this.parser.parseFile(scenarioPath);
    this.state.scenario = scenario;
    this.state.scenarioPath = scenarioPath;

    const fallbackPlan = this.buildFallbackPlan(scenario);

    let plan = fallbackPlan;
    let rawResponse = '';

    try {
      const prompt = this.buildPlanPrompt(scenario, scenarioPath);
      const response = await this.llm.chat([{ role: 'user', content: prompt }]);
      rawResponse = response.content;
      plan = this.parsePlanResponse(response.content, fallbackPlan);
    } catch (error) {
      console.warn('⚠️  Crew plan 생성 중 오류가 발생했습니다. 기본 플랜을 사용합니다.');
      if (error instanceof Error) {
        console.warn(`   원인: ${error.message}`);
      }
    }

    this.state.plan = plan;

    this.printPlanSummary(plan, scenarioPath);

    return {
      plan,
      scenario,
      rawPlanText: rawResponse || plan.rawResponse,
    };
  }

  async checkTools(): Promise<MCPTool[]> {
    await this.ensureMCPSession();
    const tools = this.mcpService.getAvailableTools();
    console.log('\n🧰 Playwright MCP 도구 목록');
    tools.forEach((tool) => {
      console.log(`   - ${tool.name}: ${tool.description}`);
    });
    return tools;
  }

  async invokeTool(toolName: string, params: Record<string, unknown> = {}): Promise<CrewToolInvocationResult> {
    const binding = this.tools.get(toolName);
    if (!binding) {
      throw new Error(`등록되지 않은 도구입니다: ${toolName}`);
    }

    if (binding.requiresSession) {
      await this.ensureMCPSession();
    }

    const context: CrewToolContext = {
      scenario: this.state.scenario,
      sessionState: this.state,
    };

    const timestamp = new Date().toISOString();
    let result: CrewToolInvocationResult;

    try {
      result = await binding.handler(params, context);
    } catch (error) {
      result = {
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }

    this.recordToolInvocation({
      id: randomUUID(),
      toolName,
      params,
      status: result.ok ? 'success' : 'error',
      message: result.ok ? result.output : result.error,
      timestamp,
    });

    return result;
  }

  async shutdown(): Promise<void> {
    if (this.state.mcpSession) {
      await this.mcpService.close();
      this.state.mcpSession = null;
    }
  }

  private registerDefaultTools(): void {
    this.addTool({
      name: 'browser_navigate',
      description: 'Playwright MCP를 사용해 특정 URL로 이동합니다.',
      requiresSession: true,
      handler: async (params) => {
        const target = (params.url as string) || (params.path as string);
        if (!target) {
          throw new Error('url 또는 path 파라미터가 필요합니다.');
        }
        await this.mcpService.navigate(target);
        return { ok: true, output: `Navigated to ${target}` };
      },
    });

    this.addTool({
      name: 'browser_snapshot',
      description: '현재 페이지의 접근성 트리를 스냅샷으로 가져옵니다.',
      requiresSession: true,
      handler: async () => {
        const snapshot = await this.mcpService.snapshot();
        return { ok: true, output: snapshot };
      },
    });

    this.addTool({
      name: 'browser_click',
      description: '액세스 가능한 요소 ref를 사용해 클릭합니다.',
      requiresSession: true,
      handler: async (params) => {
        const element = params.element as string;
        const ref = params.ref as string;
        if (!element || !ref) {
          throw new Error('element와 ref 파라미터가 필요합니다.');
        }
        await this.mcpService.click(element, ref);
        return { ok: true, output: `Clicked ${element}` };
      },
    });

    this.addTool({
      name: 'browser_type',
      description: '요소 ref에 텍스트를 입력합니다.',
      requiresSession: true,
      handler: async (params) => {
        const element = params.element as string;
        const ref = params.ref as string;
        const text = params.text as string;
        if (!element || !ref) {
          throw new Error('element와 ref 파라미터가 필요합니다.');
        }
        await this.mcpService.type(element, ref, text ?? '');
        return { ok: true, output: `Typed into ${element}` };
      },
    });

    this.addTool({
      name: 'browser_evaluate',
      description: '페이지 또는 특정 요소 컨텍스트에서 자바스크립트를 실행합니다.',
      requiresSession: true,
      handler: async (params) => {
        const fn = params.function as string;
        if (!fn) {
          throw new Error('function 파라미터가 필요합니다.');
        }

        let data: unknown;
        if (params.element && params.ref) {
          data = await this.mcpService.evaluateElement(
            params.element as string,
            params.ref as string,
            fn
          );
        } else {
          data = await this.mcpService.evaluatePage(fn);
        }

        return {
          ok: true,
          output: 'Evaluation completed',
          data,
        };
      },
    });

    this.addTool({
      name: 'browser_take_screenshot',
      description: '현재 페이지 또는 특정 요소의 스크린샷을 촬영합니다.',
      requiresSession: true,
      handler: async (params) => {
        const screenshot = await this.mcpService.takeScreenshot({
          element: params.element as string | undefined,
          ref: params.ref as string | undefined,
        });

        return {
          ok: Boolean(screenshot),
          output: screenshot ? 'Screenshot captured' : 'Screenshot not available',
          data: screenshot,
        };
      },
    });
  }

  private addTool(binding: CrewToolBinding): void {
    this.tools.set(binding.name, binding);
  }

  private async ensureMCPSession(): Promise<void> {
    if (!this.state.mcpSession) {
      this.state.mcpSession = await this.mcpService.startSession();
    }
  }

  private recordToolInvocation(entry: CrewToolInvocationLog): void {
    this.state.toolInvocations.push(entry);
  }

  private buildPlanPrompt(scenario: { pages: PageDefinition[]; flows: TestFlow[] }, scenarioPath: string): string {
    const scenarioJson = JSON.stringify(scenario, null, 2);
    return `You are the planning agent for a CrewAI-based Playwright E2E assistant.
Scenario file: ${scenarioPath}
Scenario JSON:
${scenarioJson}

Return a strict JSON object with this shape:
{
  "goal": string,
  "phases": [{"id": string, "title": string, "focus": string, "entryCriteria": string, "exitCriteria": string}],
  "roles": [{"name": string, "role": string, "goal": string, "backstory": string}],
  "tasks": [{"id": string, "description": string, "successCriteria": string, "targetPage": string, "relatedFlows": string[]}],
  "reviewCheckpoints": string[]
}

Each task should map to a single Page Object or test method and highlight where MCP tools must be used. Respond with JSON only.`;
  }

  private parsePlanResponse(response: string, fallback: CrewPlan): CrewPlan {
    const jsonBlock = this.extractJson(response);
    if (!jsonBlock) {
      return fallback;
    }

    try {
      const parsed = JSON.parse(jsonBlock);
      return {
        goal: parsed.goal ?? fallback.goal,
        phases: this.normalizePhases(parsed.phases, fallback.phases),
        roles: parsed.roles ?? fallback.roles,
        tasks: this.normalizeTasks(parsed.tasks, fallback.tasks),
        reviewCheckpoints: parsed.reviewCheckpoints ?? fallback.reviewCheckpoints,
        rawResponse: response.trim(),
      };
    } catch (error) {
      console.warn('⚠️  Crew plan JSON 파싱 실패, 기본 플랜 사용');
      if (error instanceof Error) {
        console.warn(`   원인: ${error.message}`);
      }
      return fallback;
    }
  }

  private extractJson(text: string): string | null {
    const codeBlockMatch = text.match(/```(?:json)?\n([\s\S]*?)```/);
    if (codeBlockMatch) {
      return codeBlockMatch[1].trim();
    }
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    return jsonMatch ? jsonMatch[0] : null;
  }

  private normalizePhases(input: any, fallback: CrewPlanPhase[]): CrewPlanPhase[] {
    if (!Array.isArray(input)) {
      return fallback;
    }
    return input
      .map((item) => ({
        id: item.id || randomUUID(),
        title: item.title || 'Unnamed Phase',
        focus: item.focus || 'exploration',
        entryCriteria: item.entryCriteria || 'scenario_ready',
        exitCriteria: item.exitCriteria || 'approval_recorded',
      }))
      .filter((phase): phase is CrewPlanPhase => Boolean(phase.id));
  }

  private normalizeTasks(input: any, fallback: CrewTaskDefinition[]): CrewTaskDefinition[] {
    if (!Array.isArray(input)) {
      return fallback;
    }
    return input
      .map((task) => ({
        id: task.id || randomUUID(),
        description: task.description || 'Fill selectors via MCP',
        successCriteria: task.successCriteria || 'Selectors verified using MCP tools',
        targetPage: task.targetPage,
        relatedFlows: task.relatedFlows || [],
      }))
      .filter((task) => Boolean(task.id)) as CrewTaskDefinition[];
  }

  private buildFallbackPlan(scenario: { pages: PageDefinition[]; flows: TestFlow[] }): CrewPlan {
    const phases: CrewPlanPhase[] = [
      {
        id: 'doc-analysis',
        title: '시나리오 분석',
        focus: '문서를 Crew 메모리로 전환',
        entryCriteria: 'scenario_loaded',
        exitCriteria: 'pages_and_flows_enumerated',
      },
      {
        id: 'selector-harvest',
        title: 'MCP 선택자 탐색',
        focus: 'Playwright MCP로 요소 탐색',
        entryCriteria: 'page_object_ready',
        exitCriteria: 'selectors_verified',
      },
      {
        id: 'method-review',
        title: '메서드 승인 루프',
        focus: '사용자와 함께 메서드 구현 검증',
        entryCriteria: 'selectors_ready',
        exitCriteria: 'review_signoff',
      },
    ];

    const tasks = this.deriveTasksFromScenario(scenario.pages, scenario.flows);

    return {
      goal: '시나리오 문서를 기반으로 POM/테스트를 생성하고 MCP로 검증합니다.',
      phases,
      roles: [
        {
          name: 'Planner',
          role: '문서 분석',
          goal: '시나리오 → Crew 작업 정의',
          backstory: '테스트 계획과 승인 지점을 정의하는 아키텍트',
        },
        {
          name: 'MCP Operator',
          role: '브라우저 자동화',
          goal: 'Playwright MCP 도구 호출 관리',
          backstory: '선택자 안정성을 검증하는 현장 요원',
        },
        {
          name: 'Reviewer',
          role: '승인 루프',
          goal: '개발자 피드백 수집 및 상태 기록',
          backstory: '각 메서드별 승인 여부를 기록하는 담당자',
        },
      ],
      tasks,
      reviewCheckpoints: scenario.flows.map((flow) => `${flow.name} 승인`),
      rawResponse: 'fallback-plan',
    };
  }

  private deriveTasksFromScenario(pages: PageDefinition[], flows: TestFlow[]): CrewTaskDefinition[] {
    return pages.map((page, index) => {
      const relatedFlows = flows
        .filter((flow) => flow.steps.some((step) => step.page === page.name))
        .map((flow) => flow.name);

      return {
        id: `page-${index + 1}`,
        description: `${page.name} 요소 탐색 및 메서드 구현`,
        successCriteria: '모든 필수 요소가 MCP로 검증되고 승인됨',
        targetPage: page.name,
        relatedFlows,
      };
    });
  }

  private printPlanSummary(plan: CrewPlan, scenarioPath: string): void {
    console.log(`\n🧭 CrewAI 계획 수립 완료 (${scenarioPath})`);
    console.log(`🎯 목표: ${plan.goal}`);

    console.log('\n📌 Phase');
    plan.phases.forEach((phase, idx) => {
      console.log(`   ${idx + 1}. ${phase.title} - ${phase.focus}`);
    });

    console.log('\n🛠️  Tasks');
    plan.tasks.forEach((task) => {
      console.log(`   - [${task.id}] ${task.description}`);
      if (task.targetPage) {
        console.log(`       targetPage: ${task.targetPage}`);
      }
      if (task.relatedFlows?.length) {
        console.log(`       flows: ${task.relatedFlows.join(', ')}`);
      }
    });

    if (plan.reviewCheckpoints.length) {
      console.log('\n✅ Review checkpoints');
      plan.reviewCheckpoints.forEach((checkpoint) => {
        console.log(`   - ${checkpoint}`);
      });
    }
    console.log('');
  }
}
