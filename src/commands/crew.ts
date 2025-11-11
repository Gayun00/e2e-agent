import { existsSync } from 'node:fs';
import { loadConfig } from '../config/loader';
import { CrewAgentRuntime } from '../agents/crew-runtime';

interface CrewCommandOptions {
  scenario?: string;
  method?: string;
}

export async function runCrewCommand(action: string, options: CrewCommandOptions): Promise<void> {
  const config = loadConfig();
  const runtime = new CrewAgentRuntime(config);

  try {
    switch (action) {
      case 'plan':
        await runPlan(runtime, options);
        break;
      case 'tool-check':
        await runtime.initialize();
        await runtime.checkTools();
        break;
      default:
        console.error(`알 수 없는 crew action: ${action}`);
        console.log('사용 가능한 액션: plan, tool-check');
        process.exit(1);
    }
  } finally {
    await runtime.shutdown();
  }
}

async function runPlan(runtime: CrewAgentRuntime, options: CrewCommandOptions) {
  if (!options.scenario) {
    throw new Error('--scenario 옵션이 필요합니다.');
  }

  if (!existsSync(options.scenario)) {
    throw new Error(`시나리오 파일을 찾을 수 없습니다: ${options.scenario}`);
  }

  console.log(`\n🧠 CrewAI 계획 실행: ${options.scenario}`);
  await runtime.runPlanning(options.scenario);
}
