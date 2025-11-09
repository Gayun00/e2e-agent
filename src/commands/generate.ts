import { existsSync } from 'fs';
import { loadConfig } from '../config/loader';
import { ScenarioParser } from '../services/scenario-parser';
import type { AgentConfig } from '../types/config';

/**
 * 시나리오 문서로부터 테스트 코드 생성
 */
export async function generateFromScenario(scenarioPath: string): Promise<void> {
  console.log('🚀 Playwright E2E Agent - 테스트 생성\n');

  // 1. 시나리오 파일 존재 확인
  if (!existsSync(scenarioPath)) {
    console.error(`❌ 시나리오 파일을 찾을 수 없습니다: ${scenarioPath}`);
    console.log('\n💡 먼저 시나리오 파일을 작성하세요:');
    console.log(`   e2e-agent init --name my-scenario`);
    console.log(`   그 다음 scenarios/my-scenario.md 파일을 편집하세요.\n`);
    process.exit(1);
  }

  // 2. 설정 로드
  let config: AgentConfig;
  try {
    config = loadConfig();
    console.log(`✓ 설정 로드 완료: ${config.baseUrl}\n`);
  } catch (error) {
    console.error('❌ 설정 파일을 찾을 수 없습니다.');
    console.log('💡 먼저 프로젝트를 초기화하세요: e2e-agent init\n');
    process.exit(1);
  }

  // 3. 시나리오 문서 파싱
  console.log(`📖 시나리오 문서 파싱 중: ${scenarioPath}`);
  const parser = new ScenarioParser();
  
  let document;
  try {
    document = await parser.parseFile(scenarioPath);
    console.log(`✓ 파싱 완료\n`);
  } catch (error) {
    console.error('❌ 시나리오 파싱 실패:', error);
    process.exit(1);
  }

  // 4. 파싱 결과 검증
  const validation = parser.validate(document);
  if (!validation.valid) {
    console.error('❌ 시나리오 문서에 오류가 있습니다:\n');
    validation.errors.forEach((error) => {
      console.error(`   - ${error}`);
    });
    console.log('\n💡 시나리오 문서를 수정한 후 다시 시도하세요.\n');
    process.exit(1);
  }

  // 5. 파싱 결과 출력
  console.log('📋 파싱 결과:');
  console.log(`   페이지: ${document.pages.length}개`);
  document.pages.forEach((page) => {
    console.log(`      - ${page.name} (${page.path})`);
  });
  console.log(`   테스트 플로우: ${document.flows.length}개`);
  document.flows.forEach((flow) => {
    console.log(`      - ${flow.name} (${flow.steps.length}단계)`);
  });
  console.log('');

  // 6. Skeleton 생성
  console.log('🔨 Skeleton 생성 중...\n');
  
  const { AnthropicLLMService } = await import('../services/llm.js');
  const { SkeletonGenerator } = await import('../services/skeleton-generator.js');
  
  const llm = new AnthropicLLMService(config.anthropicApiKey);
  const skeletonGenerator = new SkeletonGenerator(llm);
  
  let skeletons;
  try {
    skeletons = await skeletonGenerator.generateSkeletons(document);
    console.log('\n✓ Skeleton 생성 완료\n');
  } catch (error) {
    console.error('❌ Skeleton 생성 실패:', error);
    process.exit(1);
  }

  // 7. 생성된 코드 미리보기
  console.log('📄 생성된 Page Objects:');
  skeletons.pageObjects.forEach((po) => {
    console.log(`   - ${po.pageName}.ts`);
  });
  console.log(`\n📄 생성된 테스트 파일: ${skeletons.testFile.testName}.spec.ts\n`);

  // 8. 파일 저장
  console.log('💾 파일 저장 중...\n');
  
  const fs = await import('fs/promises');
  const path = await import('path');
  
  const pagesDir = path.join(config.testsDirectory, 'pages');
  const testsDir = config.testsDirectory;
  
  // 디렉토리 생성
  await fs.mkdir(pagesDir, { recursive: true });
  await fs.mkdir(testsDir, { recursive: true });
  
  // BasePage 생성 (템플릿 사용)
  const basePagePath = path.join(pagesDir, 'BasePage.ts');
  const basePageTemplate = await fs.readFile(
    path.join(process.cwd(), 'src', 'templates', 'BasePage.template.ts'),
    'utf-8'
  );
  await fs.writeFile(basePagePath, basePageTemplate, 'utf-8');
  console.log(`✓ ${basePagePath} (템플릿)`);
  
  // Page Objects 저장
  for (const po of skeletons.pageObjects) {
    const filePath = path.join(pagesDir, `${po.pageName}.ts`);
    await fs.writeFile(filePath, po.code, 'utf-8');
    console.log(`✓ ${filePath}`);
  }
  
  // 테스트 파일 저장
  const testFilePath = path.join(testsDir, `${skeletons.testFile.testName}.spec.ts`);
  await fs.writeFile(testFilePath, skeletons.testFile.code, 'utf-8');
  console.log(`✓ ${testFilePath}\n`);

  console.log('✅ 테스트 생성 완료!\n');
  console.log('📝 생성된 파일:');
  console.log(`   - Page Objects: ${skeletons.pageObjects.length}개`);
  console.log(`   - 테스트 파일: 1개\n`);
  console.log('💡 다음 단계: Phase 3 - MCP로 PLACEHOLDER 선택자 찾기\n');
}
