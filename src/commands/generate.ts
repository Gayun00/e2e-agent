import { existsSync } from 'fs';
import { loadConfig } from '../config/loader';
import { ScenarioParser } from '../services/scenario-parser';
import type { AgentConfig } from '../types/config';
import type { PageObjectSpec, ElementSpec } from '../types/scenario';
import { ElementType } from '../types/scenario';
import type { PageObjectSkeletonCode } from '../types/skeleton';
import type { SelectorMatch } from '../types/mcp';

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

  // 7. MCP 자동 채우기 (선택자)
  if (shouldAutoFillSelectors()) {
    console.log('🧠 MCP로 선택자 채우기 시도 중...\n');
    skeletons.pageObjects = await fillSelectorsWithMCP(document, skeletons.pageObjects, config);
  } else {
    console.log('⚙️ MCP 자동 채우기가 비활성화되었습니다 (MCP_AUTO_FILL=false)\n');
  }

  // 8. MCP 기반 메서드 자동 구현
  if (shouldAutoImplementMethods()) {
    console.log('🛠️  MCP 선택자로 메서드 구현 생성 중...\n');
    skeletons.pageObjects = await fillMethodsWithLLM(document, skeletons.pageObjects, llm);
  } else {
    console.log('⚙️ 메서드 자동 구현이 비활성화되었습니다 (MCP_AUTO_METHODS=false)\n');
  }

  // 9. 생성된 코드 미리보기
  console.log('📄 생성된 Page Objects:');
  skeletons.pageObjects.forEach((po) => {
    console.log(`   - ${po.pageName}.ts`);
  });
  console.log(`\n📄 생성된 테스트 파일: ${skeletons.testFile.testName}.spec.ts\n`);

  // 10. 파일 저장
  console.log('💾 파일 저장 중...\n');
  
  const fs = await import('fs/promises');
  const path = await import('path');
  
  const pagesDir = path.join(config.testsDirectory, 'pages');
  const testsDir = config.testsDirectory;
  
  // 디렉토리 생성
  await fs.mkdir(pagesDir, { recursive: true });
  await fs.mkdir(testsDir, { recursive: true });
  
  // BasePage 생성 (템플릿)
  const basePagePath = path.join(pagesDir, 'BasePage.ts');
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

function shouldAutoFillSelectors(): boolean {
  return process.env.MCP_AUTO_FILL !== 'false';
}

async function fillSelectorsWithMCP(
  document: ReturnType<ScenarioParser['parse']>,
  pageObjects: PageObjectSkeletonCode[],
  config: AgentConfig
) {
  try {
    const [{ PlaywrightMCPService }, { SelectorFiller }] = await Promise.all([
      import('../services/playwright-mcp.js'),
      import('../services/selector-filler.js'),
    ]);
    const { FlowExecutor } = await import('../services/flow-executor.js');

    const mcpService = new PlaywrightMCPService(config.baseUrl);
    await mcpService.startSession();

    try {
      const selectorFiller = new SelectorFiller(mcpService);
      const flowExecutor = new FlowExecutor(selectorFiller);
      const pageSpecs = buildPageSpecsFromSkeletons(document, pageObjects);

      const result = await flowExecutor.execute(pageSpecs);

      result.pages.forEach((page) => {
        if (page.success) {
          console.log(`   ✓ ${page.pageName}: ${page.selectors.length}개 요소 채움`);
        } else {
          console.log(`   ⚠️ ${page.pageName}: ${page.missingElements.length}개 요소 미채움`);
        }
      });

      if (result.hasFailures) {
        console.log('\n⚠️ 일부 요소는 PLACEHOLDER로 남아 있습니다. 나중에 수동으로 채워주세요.\n');
      } else {
        console.log('\n✓ MCP 자동 채우기 완료!\n');
      }

      return pageObjects.map((po) => {
        const matches =
          result.pages.find((page) => page.pageName === po.pageName)?.selectors || [];
        return {
          ...po,
          code: applySelectorMatches(po.code, matches),
          selectors: matches,
        };
      });
    } finally {
      await mcpService.close();
    }
  } catch (error) {
    console.warn('⚠️ MCP 자동 채우기 실패. PLACEHOLDER를 그대로 유지합니다.', error);
    return pageObjects;
  }
}

function buildPageSpecsFromSkeletons(
  document: ReturnType<ScenarioParser['parse']>,
  pageObjects: PageObjectSkeletonCode[]
): PageObjectSpec[] {
  return document.pages.map((page) => {
    const skeleton = pageObjects.find((po) => po.pageName === page.name);
    const requiredElements = skeleton ? extractElementsFromSkeleton(skeleton.code) : [];
    return {
      name: page.name,
      path: page.path,
      description: page.description,
      requiredElements,
      requiredMethods: [],
    };
  });
}

function extractElementsFromSkeleton(code: string): ElementSpec[] {
  const matches: ElementSpec[] = [];
  const getterRegex =
    /get\s+([a-zA-Z0-9_]+)\s*\(\)\s*:\s*Locator\s*\{[\s\S]*?return\s+this\.page\.locator\('PLACEHOLDER_([^']+)'\);[\s\S]*?\}/g;

  let match;
  while ((match = getterRegex.exec(code)) !== null) {
    const propertyName = match[1];
    const placeholderName = match[2];
    const name = placeholderName || propertyName;

    matches.push({
      name,
      purpose: humanizeElementName(propertyName),
      type: inferElementType(propertyName),
      usedInSteps: [],
    });
  }

  return matches;
}

function inferElementType(propertyName: string): ElementType {
  const lower = propertyName.toLowerCase();
  if (lower.includes('button') || lower.includes('submit')) {
    return ElementType.BUTTON;
  }
  if (
    lower.includes('input') ||
    lower.includes('field') ||
    lower.includes('email') ||
    lower.includes('password') ||
    lower.includes('username')
  ) {
    return ElementType.INPUT;
  }
  if (lower.includes('link')) {
    return ElementType.LINK;
  }
  if (lower.includes('select') || lower.includes('dropdown')) {
    return ElementType.SELECT;
  }
  if (lower.includes('checkbox')) {
    return ElementType.CHECKBOX;
  }
  if (lower.includes('radio')) {
    return ElementType.RADIO;
  }
  return ElementType.TEXT;
}

function humanizeElementName(name: string): string {
  return name
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[_-]/g, ' ')
    .trim();
}

function applySelectorMatches(code: string, matches: SelectorMatch[]): string {
  let updated = code;

  matches.forEach((match) => {
    if (!match.selector) {
      return;
    }

    const placeholder = `PLACEHOLDER_${match.elementName}`;
    const regex = new RegExp(
      `return\\s+this\\.page\\.locator\\('${escapeRegExp(placeholder)}'\\);`,
      'g'
    );
    updated = updated.replace(regex, `return ${match.selector};`);
  });

  return updated;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function shouldAutoImplementMethods(): boolean {
  return process.env.MCP_AUTO_METHODS !== 'false';
}

async function fillMethodsWithLLM(
  document: ReturnType<ScenarioParser['parse']>,
  pageObjects: PageObjectSkeletonCode[],
  llm: import('../services/llm.js').AnthropicLLMService
): Promise<PageObjectSkeletonCode[]> {
  const { MethodSynthesizer } = await import('../services/method-synthesizer.js');
  const synthesizer = new MethodSynthesizer(llm);
  const results: PageObjectSkeletonCode[] = [];

  for (const po of pageObjects) {
    if (!po.code.includes('// TODO: MCP로 검증')) {
      results.push(po);
      continue;
    }

    try {
      const scenarioContext = buildPageScenarioContext(document, po.pageName);
      const updatedCode = await synthesizer.synthesize({
        pageName: po.pageName,
        code: po.code,
        selectors: po.selectors || [],
        scenarioContext,
      });
      console.log(`   ✓ ${po.pageName}: 메서드 구현 완료`);
      results.push({ ...po, code: updatedCode });
    } catch (error) {
      console.warn(
        `   ⚠️ ${po.pageName}: 메서드 구현 실패 -`,
        error instanceof Error ? error.message : error
      );
      results.push(po);
    }
  }

  return results;
}

function buildPageScenarioContext(
  document: ReturnType<ScenarioParser['parse']>,
  pageName: string
): string {
  const flows = document.flows
    .filter((flow) =>
      flow.steps.some(
        (step) => (step.page && step.page === pageName) || step.raw.includes(pageName)
      )
    )
    .slice(0, 3);

  if (flows.length === 0) {
    return '';
  }

  return flows
    .map(
      (flow) =>
        `${flow.name}\n${flow.steps
          .map((step) => `- ${step.order}. ${step.raw}`)
          .join('\n')}`
    )
    .join('\n\n');
}
