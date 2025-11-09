#!/usr/bin/env node

import { Command } from 'commander';
import inquirer from 'inquirer';
import { loadConfig } from './config/loader';
import { parseCommand } from './parser/command-parser';

const program = new Command();

program
  .name('e2e-agent')
  .description('AI-powered Playwright E2E test generator')
  .version('0.1.0');

program
  .action(async () => {
    await startInteractiveMode();
  });

async function startInteractiveMode() {
  console.log('🤖 Playwright E2E Agent');
  console.log('Version 0.1.0');
  console.log('대화형 모드를 시작합니다. 종료하려면 /exit를 입력하세요.\n');

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

    const trimmedInput = input.trim();

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
  console.log('  > 로그인 테스트 만들어줘');
  console.log('  > 상품 페이지 테스트 생성해줘');
  console.log('  > 프로젝트 초기화해줘\n');
}

async function handleUserInput(input: string, config: any) {
  // 명령 파싱
  const intent = parseCommand(input);

  console.log(`\n📝 입력 받음: "${input}"`);
  console.log(`🔍 의도 파악: ${intent.type}`);

  // 의도에 따라 처리
  switch (intent.type) {
    case 'init_project':
      console.log('💡 프로젝트 초기화 기능은 곧 구현될 예정입니다.\n');
      break;

    case 'generate_test':
      console.log('💡 테스트 생성 기능은 곧 구현될 예정입니다.');
      console.log('   다음 단계에서 LLM을 통합하여 실제로 테스트를 생성할 수 있습니다.\n');
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

export function startCLI() {
  program.parse(process.argv);
}

// Run CLI if executed directly
if (require.main === module) {
  startCLI();
}
