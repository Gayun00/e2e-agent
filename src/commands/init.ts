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
    'scenarios',
    'tests',
    'tests/pages',
    'tests/mocks',
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
  const scenarioPath = path.join('scenarios', `${scenarioName}.md`);
  
  if (!existsSync(scenarioPath) || force) {
    const templateContent = await getScenarioTemplate();
    await fs.writeFile(scenarioPath, templateContent, 'utf-8');
    console.log(`✓ 시나리오 템플릿 생성: ${scenarioPath}`);
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
  console.log(`1. ${scenarioPath} 파일을 열어 테스트 시나리오 작성`);
  console.log('2. .env 파일 생성 및 ANTHROPIC_API_KEY 설정');
  console.log(`3. e2e-agent generate --scenario ${scenarioPath} 실행`);
  console.log('');
}

function getScenarioTemplate(): string {
  return `# E2E 테스트 시나리오

> 이 문서는 Playwright E2E Agent가 자동으로 테스트 코드를 생성하기 위한 시나리오 정의 문서입니다.
> 아래 형식에 맞춰 작성하면 Agent가 자동으로 Page Object와 테스트 파일을 생성합니다.

---

## 📄 페이지 정의

각 페이지의 이름, 경로, 설명을 정의합니다.

### LoginPage
- **경로**: \`/login\`
- **설명**: 사용자 로그인 페이지

### DashboardPage
- **경로**: \`/dashboard\`
- **설명**: 로그인 후 메인 대시보드

---

## 🧪 테스트 플로우

각 테스트 시나리오의 단계를 순서대로 작성합니다.

### 성공적인 로그인
**목적**: 올바른 계정 정보로 로그인이 정상적으로 동작하는지 확인

1. LoginPage로 이동
2. 이메일 입력 (\`test@example.com\`)
3. 비밀번호 입력 (\`password123\`)
4. 로그인 버튼 클릭
5. DashboardPage로 리다이렉트 확인
6. 환영 메시지 표시 확인 (\`안녕하세요\`)

---

## 📝 작성 가이드

### 페이지 정의 규칙
- 페이지 이름은 PascalCase로 작성 (예: \`LoginPage\`, \`UserProfilePage\`)
- 경로는 실제 URL 경로를 정확히 입력
- 설명은 간단명료하게 작성

### 테스트 플로우 규칙
- 각 단계는 명확한 동작 하나만 포함
- 입력 값은 백틱(\\\`)으로 감싸서 표시
- 확인/검증 단계는 "확인"이라는 단어 포함
- 페이지 이동은 "페이지로 이동" 또는 "이동 확인" 형식 사용

### 지원하는 동작 키워드
- **이동**: \`~로 이동\`, \`~로 이동 확인\`
- **입력**: \`~ 입력\`, \`~에 입력\`
- **클릭**: \`~ 클릭\`, \`~ 버튼 클릭\`
- **확인**: \`~ 확인\`, \`~ 표시 확인\`, \`~인지 확인\`
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
    'scenarios/*.md',
    '!scenarios/*.example.md',
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
