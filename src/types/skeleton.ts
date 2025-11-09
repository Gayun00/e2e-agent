/**
 * Page Object와 Test File의 Skeleton 타입 정의
 * Phase 2에서 LLM이 생성하는 코드 구조
 */

/**
 * POM Skeleton 생성 요청
 */
export interface SkeletonGenerationRequest {
  scenarioContent: string;  // 시나리오 문서 전체 내용
  pages: PageInfo[];        // 파싱된 페이지 정보
}

export interface PageInfo {
  name: string;
  path: string;
  description?: string;
}

/**
 * LLM이 생성한 POM Skeleton 코드
 */
export interface PageObjectSkeletonCode {
  pageName: string;
  code: string;  // TypeScript 코드 (PLACEHOLDER 포함)
}

/**
 * LLM이 생성한 Test File Skeleton 코드
 */
export interface TestFileSkeletonCode {
  testName: string;
  code: string;  // TypeScript 코드 (TODO 주석 포함)
}

/**
 * Skeleton 생성 결과
 */
export interface SkeletonGenerationResult {
  pageObjects: PageObjectSkeletonCode[];
  testFile: TestFileSkeletonCode;
}
