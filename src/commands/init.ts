import fs from 'fs/promises';
import path from 'path';
import { existsSync } from 'fs';

/**
 * 프로젝트 초기화 명령어
 * - 필요한 디렉토리 생성
 * - 시나리오 템플릿 파일 생성
 * - 설정 파일 생성
 */
export async function initProject(options: {
  force?: boolean;
  scenarioName?: string;
}): Promise<void> {
  const { force = false, scenarioName = 'my-test' } = options;

  console.log('🚀 Playwright E2E Agent 프로젝트 초기화 중...\n');

  // 1. 디렉토리 생성
  const directories = [
    'tests',
    'tests/pages',
    'tests/mocks',
    'tests/scenarios',
  ];

  for (const dir of directories) {
    if (!existsSync(dir)) {
      await fs.mkdir(dir, { recursive: true });
      console.log(`✓ 디렉토리 생성: ${dir}`);
    } else {
      console.log(`  디렉토리 존재: ${dir}`);
    }
  }

  // 2. 시나리오 템플릿 파일 생성
  const scenarioPath = path.join('tests', 'scenarios', `${scenarioName}.example.md`);
  
  if (!existsSync(scenarioPath) || force) {
    try {
      const templateContent = getScenarioTemplate();
      await fs.writeFile(scenarioPath, templateContent, 'utf-8');
      
      // 파일이 실제로 생성되었는지 확인
      if (existsSync(scenarioPath)) {
        console.log(`✓ 시나리오 템플릿 생성: ${scenarioPath}`);
      } else {
        console.log(`❌ 시나리오 파일 생성 실패: ${scenarioPath}`);
      }
    } catch (error) {
      console.error(`❌ 시나리오 파일 쓰기 에러:`, error);
    }
  } else {
    console.log(`  시나리오 파일 존재: ${scenarioPath} (--force로 덮어쓰기 가능)`);
  }

  // 3. 설정 파일 생성
  const configPath = '.e2e-agent.config.json';
  
  if (!existsSync(configPath) || force) {
    const configContent = getDefaultConfig();
    await fs.writeFile(configPath, JSON.stringify(configContent, null, 2), 'utf-8');
    console.log(`✓ 설정 파일 생성: ${configPath}`);
  } else {
    console.log(`  설정 파일 존재: ${configPath}`);
  }

  // 4. .env.example 파일 생성
  const envExamplePath = '.env.example';
  
  if (!existsSync(envExamplePath) || force) {
    const envContent = getEnvTemplate();
    await fs.writeFile(envExamplePath, envContent, 'utf-8');
    console.log(`✓ 환경변수 템플릿 생성: ${envExamplePath}`);
  } else {
    console.log(`  환경변수 템플릿 존재: ${envExamplePath}`);
  }

  // 5. .gitignore 업데이트
  await updateGitignore();

  console.log('\n✅ 초기화 완료!\n');
  console.log('다음 단계:');
  console.log(`1. tests/scenarios/ 디렉토리에 시나리오 .md 파일 작성`);
  console.log('2. .env 파일 생성 및 ANTHROPIC_API_KEY 설정');
  console.log('3. 대화형 모드에서 @ 입력으로 시나리오 파일 선택');
  console.log('');
}

function getScenarioTemplate(): string {
  return `# E2E 테스트 시나리오: 로그인 플로우

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
}

function getDefaultConfig() {
  return {
    pagesDirectory: 'tests/pages',
    testsDirectory: 'tests',
    mocksDirectory: 'tests/mocks',
    baseUrl: 'http://localhost:3000',
    selectorPriority: ['testId', 'role', 'placeholder', 'label', 'text', 'css'],
  };
}

function getEnvTemplate(): string {
  return `# Anthropic API Key (필수)
ANTHROPIC_API_KEY=your_api_key_here

# 테스트 계정 정보 (선택)
TEST_USER_EMAIL=test@example.com
TEST_USER_PASSWORD=password123

# Langfuse 설정 (선택)
# LANGFUSE_PUBLIC_KEY=
# LANGFUSE_SECRET_KEY=
# LANGFUSE_BASE_URL=https://cloud.langfuse.com
`;
}

async function updateGitignore(): Promise<void> {
  const gitignorePath = '.gitignore';
  const entriesToAdd = [
    '',
    '# E2E Agent',
    '.env',
    'tests/',
    '!tests/scenarios/*.example.md',
  ];

  let content = '';
  
  if (existsSync(gitignorePath)) {
    content = await fs.readFile(gitignorePath, 'utf-8');
  }

  // 이미 추가되어 있는지 확인
  if (content.includes('# E2E Agent')) {
    console.log('  .gitignore 이미 업데이트됨');
    return;
  }

  // 추가
  const newContent = content + '\n' + entriesToAdd.join('\n') + '\n';
  await fs.writeFile(gitignorePath, newContent, 'utf-8');
  console.log('✓ .gitignore 업데이트');
}
