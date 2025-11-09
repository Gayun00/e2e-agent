import fs from 'fs';
import path from 'path';
import prompts from 'prompts';
import { loadConfig } from '../config/loader';

/**
 * scenarios 디렉토리의 .md 파일 목록 가져오기
 */
export function getScenarioFiles(): string[] {
  // 설정 파일에서 testsDirectory 가져오기
  let scenariosDir = 'tests/scenarios';
  
  try {
    const config = loadConfig();
    scenariosDir = path.join(config.testsDirectory, 'scenarios');
  } catch {
    // 설정 파일이 없으면 기본값 사용
  }
  
  if (!fs.existsSync(scenariosDir)) {
    return [];
  }

  const files = fs.readdirSync(scenariosDir)
    .filter(file => file.endsWith('.md'))
    .map(file => path.join(scenariosDir, file));

  return files;
}

/**
 * 파일 경로 선택 프롬프트 (자동완성 방식)
 */
export async function promptForScenarioFile(): Promise<string> {
  const files = getScenarioFiles();

  if (files.length === 0) {
    throw new Error('scenarios 디렉토리에 .md 파일이 없습니다.');
  }

  const response = await prompts({
    type: 'autocomplete',
    name: 'file',
    message: '시나리오 파일을 선택하세요:',
    choices: files.map(file => ({
      title: file,
      value: file
    })),
    suggest: async (input, choices) => {
      if (!input) return choices;
      return choices.filter(choice =>
        choice.title.toLowerCase().includes(input.toLowerCase())
      );
    }
  });

  // 사용자가 취소한 경우 (Ctrl+C)
  if (!response.file) {
    throw new Error('파일 선택이 취소되었습니다.');
  }

  return response.file;
}

/**
 * 입력에서 @ 감지하여 자동완성 트리거
 */
export function shouldTriggerAutocomplete(input: string): boolean {
  // @만 입력하거나 @scenarios 등으로 시작하면 자동완성 트리거
  return input.trim() === '@' || input.trim().startsWith('@');
}

/**
 * @ 입력 감지 시 자동완성 프롬프트 표시
 */
export async function handleFileAutocomplete(input: string): Promise<string | null> {
  if (!shouldTriggerAutocomplete(input)) {
    return null;
  }

  console.log('\n📁 파일 자동완성 모드\n');
  
  try {
    const selectedFile = await promptForScenarioFile();
    return selectedFile;
  } catch (error) {
    console.error('❌ 파일 선택 실패:', error instanceof Error ? error.message : error);
    return null;
  }
}
