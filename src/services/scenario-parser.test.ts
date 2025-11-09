import { describe, it, expect } from 'vitest';
import { ScenarioParser } from './scenario-parser';
import { StepAction } from '../types/scenario';

describe('ScenarioParser', () => {
  const parser = new ScenarioParser();

  describe('parse', () => {
    it('should parse page definitions', () => {
      const content = `
# 테스트 시나리오

## 📄 페이지 정의

### LoginPage
- **경로**: \`/login\`
- **설명**: 사용자 로그인 페이지

### DashboardPage
- **경로**: \`/dashboard\`
- **설명**: 메인 대시보드
`;

      const result = parser.parse(content);

      expect(result.pages).toHaveLength(2);
      expect(result.pages[0]).toEqual({
        name: 'LoginPage',
        path: '/login',
        description: '사용자 로그인 페이지',
      });
      expect(result.pages[1]).toEqual({
        name: 'DashboardPage',
        path: '/dashboard',
        description: '메인 대시보드',
      });
    });

    it('should parse test flows', () => {
      const content = `
## 🧪 테스트 플로우

### 성공적인 로그인
**목적**: 올바른 계정 정보로 로그인 확인

1. LoginPage로 이동
2. 이메일 입력 (\`test@example.com\`)
3. 비밀번호 입력 (\`password123\`)
4. 로그인 버튼 클릭
5. DashboardPage로 리다이렉트 확인
`;

      const result = parser.parse(content);

      expect(result.flows).toHaveLength(1);
      expect(result.flows[0].name).toBe('성공적인 로그인');
      expect(result.flows[0].purpose).toBe('올바른 계정 정보로 로그인 확인');
      expect(result.flows[0].steps).toHaveLength(5);
    });

    it('should parse navigate action', () => {
      const content = `
## 🧪 테스트 플로우

### Test
1. LoginPage로 이동
`;

      const result = parser.parse(content);
      const step = result.flows[0].steps[0];

      expect(step.action).toBe(StepAction.NAVIGATE);
      expect(step.page).toBe('LoginPage');
    });

    it('should parse input action with value', () => {
      const content = `
## 🧪 테스트 플로우

### Test
1. 이메일 입력 (\`test@example.com\`)
`;

      const result = parser.parse(content);
      const step = result.flows[0].steps[0];

      expect(step.action).toBe(StepAction.INPUT);
      expect(step.target).toBe('이메일');
      expect(step.value).toBe('test@example.com');
    });

    it('should parse click action', () => {
      const content = `
## 🧪 테스트 플로우

### Test
1. 로그인 버튼 클릭
`;

      const result = parser.parse(content);
      const step = result.flows[0].steps[0];

      expect(step.action).toBe(StepAction.CLICK);
      expect(step.target).toBe('로그인');
    });

    it('should parse verify text action', () => {
      const content = `
## 🧪 테스트 플로우

### Test
1. 환영 메시지 표시 확인 (\`안녕하세요\`)
`;

      const result = parser.parse(content);
      const step = result.flows[0].steps[0];

      expect(step.action).toBe(StepAction.VERIFY_TEXT);
      expect(step.target).toBe('환영 메시지');
      expect(step.assertion).toBe('안녕하세요');
    });

    it('should parse verify URL action', () => {
      const content = `
## 🧪 테스트 플로우

### Test
1. DashboardPage로 리다이렉트 확인
`;

      const result = parser.parse(content);
      const step = result.flows[0].steps[0];

      expect(step.action).toBe(StepAction.VERIFY_URL);
      expect(step.page).toBe('DashboardPage');
    });

    it('should parse complete scenario document', () => {
      const content = `
# E2E 테스트 시나리오

## 📄 페이지 정의

### LoginPage
- **경로**: \`/login\`
- **설명**: 로그인 페이지

## 🧪 테스트 플로우

### 로그인 테스트
**목적**: 로그인 기능 확인

1. LoginPage로 이동
2. 이메일 입력 (\`test@example.com\`)
3. 비밀번호 입력 (\`password123\`)
4. 로그인 버튼 클릭
`;

      const result = parser.parse(content);

      expect(result.pages).toHaveLength(1);
      expect(result.flows).toHaveLength(1);
      expect(result.flows[0].steps).toHaveLength(4);
    });
  });

  describe('validate', () => {
    it('should validate valid document', () => {
      const document = {
        pages: [
          { name: 'LoginPage', path: '/login' },
        ],
        flows: [
          {
            name: 'Test',
            steps: [
              { order: 1, raw: 'test', action: StepAction.NAVIGATE },
            ],
          },
        ],
      };

      const result = parser.validate(document);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect missing pages', () => {
      const document = {
        pages: [],
        flows: [
          {
            name: 'Test',
            steps: [
              { order: 1, raw: 'test', action: StepAction.NAVIGATE },
            ],
          },
        ],
      };

      const result = parser.validate(document);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('페이지가 정의되지 않았습니다.');
    });

    it('should detect missing flows', () => {
      const document = {
        pages: [
          { name: 'LoginPage', path: '/login' },
        ],
        flows: [],
      };

      const result = parser.validate(document);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('테스트 플로우가 정의되지 않았습니다.');
    });

    it('should detect page without path', () => {
      const document = {
        pages: [
          { name: 'LoginPage', path: '' },
        ],
        flows: [
          {
            name: 'Test',
            steps: [
              { order: 1, raw: 'test', action: StepAction.NAVIGATE },
            ],
          },
        ],
      };

      const result = parser.validate(document);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('페이지 LoginPage: 경로가 없습니다.');
    });
  });
});
