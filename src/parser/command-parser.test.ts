import { describe, test, expect } from 'vitest';
import { parseCommand } from './command-parser';

describe('CommandParser', () => {
  describe('프로젝트 초기화', () => {
    test('초기화 명령 인식', () => {
      const intent = parseCommand('프로젝트 초기화해줘');
      expect(intent.type).toBe('init_project');
    });

    test('init 명령 인식', () => {
      const intent = parseCommand('init');
      expect(intent.type).toBe('init_project');
    });
  });

  describe('테스트 생성', () => {
    test('테스트 만들기 명령 인식', () => {
      const intent = parseCommand('로그인 테스트 만들어줘');
      expect(intent.type).toBe('generate_test');
      if (intent.type === 'generate_test') {
        expect(intent.description).toBe('로그인 테스트 만들어줘');
      }
    });

    test('테스트 생성 명령 인식', () => {
      const intent = parseCommand('상품 페이지 테스트 생성해줘');
      expect(intent.type).toBe('generate_test');
    });

    test('테스트 작성 명령 인식', () => {
      const intent = parseCommand('회원가입 테스트 작성해줘');
      expect(intent.type).toBe('generate_test');
    });
  });

  describe('도움말', () => {
    test('도움말 명령 인식', () => {
      const intent = parseCommand('도움말');
      expect(intent.type).toBe('help');
    });

    test('help 명령 인식', () => {
      const intent = parseCommand('help');
      expect(intent.type).toBe('help');
    });
  });

  describe('알 수 없는 명령', () => {
    test('알 수 없는 입력 처리', () => {
      const intent = parseCommand('안녕하세요');
      expect(intent.type).toBe('unknown');
      if (intent.type === 'unknown') {
        expect(intent.input).toBe('안녕하세요');
      }
    });
  });
});
