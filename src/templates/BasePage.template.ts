import { Page } from '@playwright/test';

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
