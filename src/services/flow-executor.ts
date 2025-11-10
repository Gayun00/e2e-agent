import type { PageObjectSpec } from '../types/scenario';
import type { SelectorMatch } from '../types/mcp';
import { SelectorFiller } from './selector-filler';

export interface PageFillResult {
  pageName: string;
  path: string;
  selectors: SelectorMatch[];
  success: boolean;
  missingElements: string[];
  error?: string;
}

export interface FlowExecutionResult {
  pages: PageFillResult[];
  hasFailures: boolean;
}

/**
 * FlowExecutor
 * - 각 페이지별 필수 요소에 대해 MCP를 사용해 선택자를 채움
 * - 결과를 집계하여 이후 코드 생성 단계에 전달
 */
export class FlowExecutor {
  constructor(private readonly selectorFiller: SelectorFiller) {}

  /**
   * 페이지 객체 정의를 순회하며 선택자 채우기
   */
  async execute(pages: PageObjectSpec[]): Promise<FlowExecutionResult> {
    const results: PageFillResult[] = [];

    for (const page of pages) {
      if (!page.requiredElements || page.requiredElements.length === 0) {
        results.push({
          pageName: page.name,
          path: page.path,
          selectors: [],
          success: true,
          missingElements: [],
        });
        continue;
      }

      try {
        const matches = await this.selectorFiller.fillPageSelectors(
          page.path,
          page.requiredElements
        );

        const missing = matches.filter((match) => !match.selector).map((match) => match.elementName);

        results.push({
          pageName: page.name,
          path: page.path,
          selectors: matches,
          success: missing.length === 0,
          missingElements: missing,
        });
      } catch (error) {
        results.push({
          pageName: page.name,
          path: page.path,
          selectors: [],
          success: false,
          missingElements: page.requiredElements.map((element) => element.name),
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return {
      pages: results,
      hasFailures: results.some((result) => !result.success),
    };
  }
}
