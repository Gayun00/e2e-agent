#!/usr/bin/env node

import { Command } from 'commander';
import inquirer from 'inquirer';
import { loadConfig, createDefaultConfig } from './config/loader';
import { parseCommand } from './parser/command-parser';
import { AnthropicLLMService } from './services/llm';
import { PageGeneratorService } from './services/page-generator';
import type { AgentConfig } from './types/config';
import * as fs from 'fs';

const program = new Command();

program
  .name('e2e-agent')
  .description('AI-powered Playwright E2E test generator')
  .version('0.1.0');

program
  .command('init')
  .description('프로젝트 초기화 및 시나리오 템플릿 생성')
  .option('-f, --force', '기존 파일 덮어쓰기')
  .option('-n, --name <name>', '시나리오 파일 이름', 'my-test')
  .action(async (options) => {
    const { initProject } = await import('./commands/init.js');
    try {
      await initProject({
        force: options.force,
        scenarioName: options.name,
      });
    } catch (error) {
      console.error('❌ 초기화 실패:', error);
      process.exit(1);
    }
  });

program
  .command('generate')
  .description('시나리오 문서로부터 테스트 코드 생성')
  .requiredOption('-s, --scenario <path>', '시나리오 파일 경로 (예: scenarios/login-flow.md)')
  .action(async (options) => {
    const { generateFromScenario } = await import('./commands/generate.js');
    try {
      await generateFromScenario(options.scenario);
    } catch (error) {
      console.error('❌ 테스트 생성 실패:', error);
      process.exit(1);
    }
  });

program
  .command('crew <action>')
  .description('CrewAI 에이전트 런타임 명령어 (Phase 3)')
  .option('-s, --scenario <path>', '시나리오 파일 경로')
  .option('-m, --method <name>', '대상 메서드 이름 (미래 작업용 옵션)')
  .action(async (action, options) => {
    const { runCrewCommand } = await import('./commands/crew.js');
    try {
      await runCrewCommand(action, options);
    } catch (error) {
      console.error('❌ Crew 명령 실행 실패:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

program
  .action(async () => {
    await startInteractiveMode();
  });

async function startInteractiveMode() {
  console.log('🤖 Playwright E2E Agent');
  console.log('Version 0.1.0');
  console.log('대화형 모드를 시작합니다. 종료하려면 /exit를 입력하세요.\n');
  console.log('💡 Tip: @를 입력하면 시나리오 파일 자동완성이 활성화됩니다.\n');

  // 설정 파일 로드 시도 (없으면 나중에 처리)
  let config;
  try {
    config = loadConfig();
    console.log(`✓ 설정 로드 완료: ${config.baseUrl}\n`);
  } catch (error) {
    console.log('⚠️  설정 파일을 찾을 수 없습니다.');
    console.log('   나중에 "프로젝트 초기화해줘" 명령으로 설정할 수 있습니다.\n');
  }

  // 대화 루프
  while (true) {
    const { input } = await inquirer.prompt({
      type: 'input',
      name: 'input',
      message: '>',
    });

    let trimmedInput = input.trim();

    // @ 입력 시 파일 자동완성 트리거
    if (trimmedInput === '@' || trimmedInput.startsWith('@')) {
      const { promptForScenarioFile, getScenarioFiles } = await import('./utils/file-autocomplete.js');

      // 파일이 있는지 확인
      const files = getScenarioFiles();
      console.log(`\n📁 발견된 시나리오 파일: ${files.length}개`);

      if (files.length === 0) {
        console.log('❌ tests/scenarios 디렉토리에 .md 파일이 없습니다.\n');
        continue;
      }

      try {
        console.log('🔍 파일 선택 프롬프트 표시 중...\n');
        const selectedFile = await promptForScenarioFile();

        // 선택된 파일로 명령 재구성
        trimmedInput = `@${selectedFile} 읽고 테스트 작성해줘`;
        console.log(`\n📝 명령: ${trimmedInput}\n`);
      } catch (error) {
        // 사용자가 취소한 경우 (Ctrl+C)
        console.log('\n취소됨\n');
        continue;
      }
    }

    // 종료 명령
    if (trimmedInput === '/exit' || trimmedInput === '/quit') {
      console.log('👋 안녕히 가세요!');
      process.exit(0);
    }

    // 빈 입력 무시
    if (!trimmedInput) {
      continue;
    }

    // 도움말
    if (trimmedInput === '/help' || trimmedInput === '도움말') {
      showHelp();
      continue;
    }

    // 사용자 입력 처리
    await handleUserInput(trimmedInput, config);
  }
}

function showHelp() {
  console.log('\n사용 가능한 명령어:');
  console.log('  /help, 도움말     - 이 도움말 표시');
  console.log('  /exit, /quit      - 프로그램 종료');
  console.log('\n예시:');
  console.log('  > 프로젝트 초기화해줘');
  console.log('  > @scenarios/login-flow.md 읽고 테스트 작성해줘');
  console.log('  > @{scenarios/my-test.md}로 테스트 생성해줘');
  console.log('  > 로그인 테스트 만들어줘 (Phase 1 방식)\n');
  console.log('파일 참조:');
  console.log('  @{파일경로} 또는 @파일경로.md 형식으로 시나리오 파일 참조\n');
}

async function handleUserInput(input: string, config: AgentConfig | undefined) {
  // 명령 파싱
  const intent = parseCommand(input);

  console.log(`\n📝 입력 받음: "${input}"`);
  console.log(`🔍 의도 파악: ${intent.type}`);

  // 의도에 따라 처리
  switch (intent.type) {
    case 'init_project':
      await handleInitProject();
      break;

    case 'generate_from_scenario':
      if (!config) {
        console.log('❌ 설정 파일이 필요합니다. 먼저 "프로젝트 초기화해줘"를 실행하세요.\n');
        break;
      }
      await handleGenerateFromScenario(intent.scenarioPath, config);
      break;

    case 'generate_test':
      if (!config) {
        console.log('❌ 설정 파일이 필요합니다. 먼저 "프로젝트 초기화해줘"를 실행하세요.\n');
        break;
      }
      await handleGenerateTest(intent.description, config);
      break;

    case 'help':
      showHelp();
      break;

    case 'unknown':
      console.log('💡 아직 이 명령을 처리할 수 없습니다.');
      console.log('   /help를 입력하여 사용 가능한 명령을 확인하세요.\n');
      break;
  }
}

async function handleGenerateFromScenario(scenarioPath: string, config: AgentConfig) {
  console.log(`\n📖 시나리오 파일 기반 테스트 생성: ${scenarioPath}\n`);

  const { generateFromScenario } = await import('./commands/generate.js');

  try {
    await generateFromScenario(scenarioPath);
  } catch (error) {
    console.error('❌ 테스트 생성 실패:', error instanceof Error ? error.message : error);
    console.log('');
  }
}

async function handleInitProject() {
  console.log('\n🚀 프로젝트 초기화를 시작합니다.\n');

  // 이미 설정 파일이 있는지 확인
  if (fs.existsSync('.e2e-agent.config.json')) {
    const { overwrite } = await inquirer.prompt({
      type: 'confirm',
      name: 'overwrite',
      message: '설정 파일이 이미 존재합니다. 덮어쓰시겠습니까?',
      default: false,
    });

    if (!overwrite) {
      console.log('❌ 초기화를 취소했습니다.\n');
      return;
    }
  }

  // 사용자에게 설정 정보 물어보기
  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'baseUrl',
      message: '테스트할 애플리케이션의 기본 URL을 입력하세요:',
      default: 'http://localhost:3000',
    },
    {
      type: 'input',
      name: 'testsDirectory',
      message: 'Playwright 테스트를 저장할 디렉토리를 입력하세요:',
      default: 'tests',
    },
  ]);

  // 설정 파일 생성
  createDefaultConfig('.', {
    baseUrl: answers.baseUrl,
    testsDirectory: answers.testsDirectory,
  });

  // 디렉토리 생성
  const testsDir = answers.testsDirectory;
  const pagesDir = `${testsDir}/pages`;
  const mocksDir = `${testsDir}/mocks`;
  const scenariosDir = `${testsDir}/scenarios`;

  [testsDir, pagesDir, mocksDir, scenariosDir].forEach((dir) => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`✓ 디렉토리 생성: ${dir}`);
    }
  });

  // BasePage 템플릿 생성
  const basePagePath = `${pagesDir}/BasePage.ts`;
  if (!fs.existsSync(basePagePath)) {
    const basePageTemplate = `import { Page } from '@playwright/test';

/**
 * 모든 Page Object의 기본 클래스
 */
export abstract class BasePage {
  constructor(protected page: Page) {}

  /**
   * 페이지로 이동 (각 페이지에서 구현)
   */
  abstract goto(): Promise<void>;

  /**
   * 현재 페이지인지 확인 (각 페이지에서 구현)
   */
  abstract isOnPage(): Promise<boolean>;

  /**
   * 공통 유틸리티 메서드
   */
  async waitForPageLoad() {
    await this.page.waitForLoadState('networkidle');
  }

  async waitForElement(selector: string) {
    await this.page.waitForSelector(selector);
  }

  async getTitle(): Promise<string> {
    return await this.page.title();
  }

  async getUrl(): Promise<string> {
    return this.page.url();
  }
}
`;
    fs.writeFileSync(basePagePath, basePageTemplate, 'utf-8');
    console.log(`✓ BasePage 템플릿 생성: ${basePagePath}`);
  }

  // 시나리오 예제 파일 생성
  const scenarioExamplePath = `${scenariosDir}/login-flow.example.md`;
  if (!fs.existsSync(scenarioExamplePath)) {
    const exampleContent = `# E2E 테스트 시나리오: 로그인 플로우

---

## 📄 페이지 정의

### LoginPage
- **경로**: \`/login\`
- **설명**: 사용자 로그인 페이지

### DashboardPage
- **경로**: \`/dashboard\`
- **설명**: 로그인 후 메인 대시보드

---

## 🧪 테스트 플로우

### 성공적인 로그인
**목적**: 올바른 계정 정보로 로그인이 정상적으로 동작하는지 확인

1. LoginPage로 이동
2. 이메일 입력 (\`test@example.com\`)
3. 비밀번호 입력 (\`password123\`)
4. 로그인 버튼 클릭
5. DashboardPage로 리다이렉트 확인
6. 환영 메시지 표시 확인 (\`안녕하세요, 테스트님!\`)

### 잘못된 로그인
**목적**: 잘못된 계정 정보로 로그인 시 에러 처리 확인

1. LoginPage로 이동
2. 이메일 입력 (\`wrong@example.com\`)
3. 비밀번호 입력 (\`wrongpassword\`)
4. 로그인 버튼 클릭
5. 에러 메시지 표시 확인 (\`이메일 또는 비밀번호가 올바르지 않습니다\`)
6. LoginPage에 그대로 있는지 확인

### 빈 필드로 로그인 시도
**목적**: 필수 입력 필드 검증 확인

1. LoginPage로 이동
2. 로그인 버튼 클릭
3. 이메일 필드 에러 표시 확인 (\`이메일을 입력해주세요\`)
4. 비밀번호 필드 에러 표시 확인 (\`비밀번호를 입력해주세요\`)
`;
    fs.writeFileSync(scenarioExamplePath, exampleContent, 'utf-8');
    console.log(`✓ 시나리오 예제 파일 생성: ${scenarioExamplePath}`);
  }

  console.log('\n✅ 프로젝트 초기화 완료!');
  console.log('💡 .env 파일에 ANTHROPIC_API_KEY를 추가하세요.\n');
}

async function handleGenerateTest(description: string, config: AgentConfig) {
  try {
    console.log('🤖 LLM으로 시나리오 분석 중...\n');

    // LLM 서비스 초기화
    const llm = new AnthropicLLMService(config.anthropicApiKey);
    const pageGenerator = new PageGeneratorService(llm);

    // 시나리오 분석
    const analysis = await llm.analyzeScenario(description);

    console.log('✅ 분석 완료!');
    console.log(`📄 필요한 페이지: ${analysis.pages.join(', ')}\n`);

    // 각 페이지에 대해 경로 추론 및 확인
    const pageInfos: Array<{ name: string; path: string }> = [];

    for (const pageName of analysis.pages) {
      console.log(`\n📍 ${pageName} 경로 추론 중...`);

      // LLM으로 경로 추론
      const inferredPath = await pageGenerator.inferPagePath(pageName);
      console.log(`   추론된 경로: ${inferredPath}`);

      // 사용자 확인
      const { pathConfirmation } = await inquirer.prompt({
        type: 'input',
        name: 'pathConfirmation',
        message: '경로가 맞나요? (Enter=확인, 또는 올바른 경로 입력)',
        default: inferredPath,
      });

      const finalPath = pathConfirmation.trim() || inferredPath;
      pageInfos.push({ name: pageName, path: finalPath });

      console.log(`   ✓ 확정된 경로: ${finalPath}`);
    }

    console.log('\n✅ 모든 페이지 경로 확정 완료!');
    console.log('\n📋 페이지 목록:');
    pageInfos.forEach(({ name, path }) => {
      console.log(`   - ${name}: ${path}`);
    });

    // 페이지 객체 코드 생성 및 파일 저장
    console.log('\n🔨 페이지 객체 생성 중...\n');

    const pagesDirectory = config.pagesDirectory || './tests/pages';

    for (const { name, path } of pageInfos) {
      try {
        console.log(`📝 ${name} 코드 생성 중...`);

        const code = await pageGenerator.generatePageObject(name, path);

        console.log(`✓ ${name} 코드 생성 완료`);

        // 파일 저장
        console.log(`💾 저장 시도: ${pagesDirectory}`);
        const filePath = await pageGenerator.savePageObject(name, code, pagesDirectory);
        console.log(`✅ 파일 저장 완료: ${filePath}`);

        // 파일이 실제로 존재하는지 확인
        if (fs.existsSync(filePath)) {
          console.log(`✓ 파일 존재 확인됨: ${filePath}`);
        } else {
          console.log(`❌ 파일이 생성되지 않음: ${filePath}`);
        }

        console.log(`\n생성된 코드 미리보기:\n`);
        console.log('─'.repeat(50));
        console.log(code.split('\n').slice(0, 15).join('\n'));
        console.log('...');
        console.log('─'.repeat(50));
        console.log('');
      } catch (error) {
        console.error(`❌ ${name} 저장 중 에러:`, error);
      }
    }

    console.log(`\n✅ 모든 페이지 객체가 ${pagesDirectory}에 저장되었습니다!\n`);

    // 5. 테스트 파일 생성
    console.log('📝 테스트 파일 생성 중...\n');

    const testCode = await pageGenerator.generateTestFile(description, pageInfos);

    console.log('✓ 테스트 코드 생성 완료\n');

    // 테스트 파일 저장
    const testsDirectory = config.testsDirectory || './tests';
    const testName = pageInfos.length === 1
      ? pageInfos[0].name.replace('Page', '').toLowerCase()
      : 'scenario';

    console.log(`💾 테스트 파일 저장 중: ${testsDirectory}/${testName}.spec.ts`);
    const testFilePath = await pageGenerator.saveTestFile(testName, testCode, testsDirectory);
    console.log(`✅ 테스트 파일 저장 완료: ${testFilePath}\n`);

    // 생성된 테스트 코드 미리보기
    console.log('생성된 테스트 코드 미리보기:\n');
    console.log('─'.repeat(50));
    console.log(testCode.split('\n').slice(0, 20).join('\n'));
    if (testCode.split('\n').length > 20) {
      console.log('...');
    }
    console.log('─'.repeat(50));
    console.log('');

    console.log('🎉 테스트 생성 완료!\n');
    console.log('다음 명령어로 테스트를 실행할 수 있습니다:');
    console.log(`  npx playwright test ${testFilePath}\n`);
  } catch (error) {
    console.error('❌ 에러 발생:', error instanceof Error ? error.message : error);
    console.log('');
  }
}

export function startCLI() {
  program.parse(process.argv);
}

// Run CLI if executed directly
if (require.main === module) {
  startCLI();
}
