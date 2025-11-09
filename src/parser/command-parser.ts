/**
 * 명령 파서 - 사용자 입력에서 의도를 파악
 */

export type CommandIntent = 
  | { type: 'generate_from_scenario'; scenarioPath: string; description: string }
  | { type: 'generate_test'; description: string }
  | { type: 'init_project' }
  | { type: 'help' }
  | { type: 'unknown'; input: string };

/**
 * 입력에서 파일 경로 추출 (@{경로} 형식)
 */
export function extractFilePath(input: string): string | null {
  const match = input.match(/@\{([^}]+)\}|@(\S+\.md)/);
  if (match) {
    return match[1] || match[2];
  }
  return null;
}

/**
 * 사용자 입력을 파싱하여 의도를 파악
 */
export function parseCommand(input: string): CommandIntent {
  const normalized = input.toLowerCase().trim();

  // 프로젝트 초기화
  if (normalized.includes('초기화') || normalized.includes('init')) {
    return { type: 'init_project' };
  }

  // 시나리오 파일 기반 테스트 생성
  const filePath = extractFilePath(input);
  if (filePath && 
      (normalized.includes('테스트') || normalized.includes('생성') || normalized.includes('작성'))) {
    return { 
      type: 'generate_from_scenario', 
      scenarioPath: filePath,
      description: input 
    };
  }

  // 일반 테스트 생성 (자연어 설명)
  if (normalized.includes('테스트') && 
      (normalized.includes('만들') || 
       normalized.includes('생성') || 
       normalized.includes('작성'))) {
    return { type: 'generate_test', description: input };
  }

  // 도움말
  if (normalized === 'help' || normalized === '도움말') {
    return { type: 'help' };
  }

  // 알 수 없는 명령
  return { type: 'unknown', input };
}
