/**
 * 명령 파서 - 사용자 입력에서 의도를 파악
 */

export type CommandIntent = 
  | { type: 'generate_test'; description: string }
  | { type: 'init_project' }
  | { type: 'help' }
  | { type: 'unknown'; input: string };

/**
 * 사용자 입력을 파싱하여 의도를 파악
 */
export function parseCommand(input: string): CommandIntent {
  const normalized = input.toLowerCase().trim();

  // 프로젝트 초기화
  if (normalized.includes('초기화') || normalized.includes('init')) {
    return { type: 'init_project' };
  }

  // 테스트 생성
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
