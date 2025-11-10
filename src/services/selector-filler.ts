import type { ElementSpec } from '../types/scenario';
import { ElementType } from '../types/scenario';
import type { ElementMetadata, SelectorMatch, SnapshotElement } from '../types/mcp';
import { SelectorStrategy } from '../types/mcp';
import { PlaywrightMCPService } from './playwright-mcp';

interface FillSelectorsOptions {
  snapshot?: string;
}

const ROLE_MAP: Record<ElementType, string[]> = {
  [ElementType.INPUT]: ['textbox', 'combobox', 'searchbox'],
  [ElementType.BUTTON]: ['button'],
  [ElementType.LINK]: ['link'],
  [ElementType.TEXT]: ['generic', 'text'],
  [ElementType.SELECT]: ['combobox'],
  [ElementType.CHECKBOX]: ['checkbox'],
  [ElementType.RADIO]: ['radio'],
};

const TAG_MAP: Record<ElementType, string[]> = {
  [ElementType.INPUT]: ['input', 'textarea'],
  [ElementType.BUTTON]: ['button'],
  [ElementType.LINK]: ['a', 'button'],
  [ElementType.TEXT]: ['p', 'span', 'div'],
  [ElementType.SELECT]: ['select'],
  [ElementType.CHECKBOX]: ['input'],
  [ElementType.RADIO]: ['input'],
};

/**
 * MCP snapshot + evaluate 결과를 바탕으로 선택자를 채우는 서비스
 */
export class SelectorFiller {
  constructor(private mcpService: PlaywrightMCPService) {}

  /**
   * 페이지 경로와 요소 목록을 받아 선택자 채우기
   */
  async fillPageSelectors(
    pagePath: string,
    elements: ElementSpec[]
  ): Promise<SelectorMatch[]> {
    await this.mcpService.navigate(pagePath);
    const snapshot = await this.mcpService.snapshot();
    return this.fillSelectorsFromSnapshot(elements, snapshot);
  }

  /**
   * 이미 캡처한 snapshot이 있을 때 선택자 채우기
   */
  async fillSelectorsFromSnapshot(
    elements: ElementSpec[],
    snapshot: string,
    options: FillSelectorsOptions = {}
  ): Promise<SelectorMatch[]> {
    const snapshotElements = this.parseSnapshot(snapshot);
    const matches: SelectorMatch[] = [];

    for (const element of elements) {
      const match = await this.matchElement(element, snapshotElements);
      matches.push(match);
    }

    return matches;
  }

  private parseSnapshot(snapshot: string): SnapshotElement[] {
    const lines = snapshot.split('\n');
    const regex = /-\s+([a-zA-Z ]+)(?:\s+"([^"]+)")?[^[]*\[ref=(e\d+)\]/;
    const entries: SnapshotElement[] = [];

    for (const line of lines) {
      const match = line.match(regex);
      if (!match) {
        continue;
      }

      const role = match[1].trim().toLowerCase();
      const name = match[2]?.trim();
      const ref = match[3];

      entries.push({
        role,
        name,
        ref,
        raw: line.trim(),
      });
    }

    return entries;
  }

  private async matchElement(
    element: ElementSpec,
    snapshotElements: SnapshotElement[]
  ): Promise<SelectorMatch> {
    const tokens = this.buildTokens(element);
    const candidates = this.filterCandidates(element, snapshotElements);

    if (candidates.length === 0) {
      return {
        elementName: element.name,
        selector: null,
        strategy: null,
        confidence: 0,
        reason: 'snapshot에서 후보를 찾지 못했습니다',
      };
    }

    const scored = candidates
      .map((candidate) => ({
        candidate,
        score: this.scoreCandidate(candidate, tokens),
      }))
      .sort((a, b) => b.score - a.score);

    const best = scored[0];
    if (!best || best.score === 0) {
      return {
        elementName: element.name,
        selector: null,
        strategy: null,
        confidence: 0,
        ref: best?.candidate.ref,
        snapshot: best?.candidate,
        reason: '후보와의 유사도를 계산할 수 없습니다',
      };
    }

    const metadata =
      (await this.mcpService.evaluateElement<ElementMetadata>(
        `${element.name} candidate`,
        best.candidate.ref,
        `element => ({
          tag: element.tagName?.toLowerCase(),
          type: element.getAttribute('type'),
          id: element.id,
          name: element.getAttribute('name'),
          placeholder: element.getAttribute('placeholder'),
          dataTest: element.getAttribute('data-test'),
          text: element.textContent?.trim(),
          label: element.labels?.[0]?.textContent?.trim(),
          ariaLabel: element.getAttribute('aria-label'),
          className: element.className,
          role: element.getAttribute('role')
        })`
      )) || undefined;

    const selectorInfo = this.buildSelector(metadata, best.candidate, element.type);

    return {
      elementName: element.name,
      selector: selectorInfo.selector,
      strategy: selectorInfo.strategy,
      confidence: Math.min(1, best.score / 10),
      ref: best.candidate.ref,
      snapshot: best.candidate,
      metadata: metadata || undefined,
      reason: selectorInfo.reason,
    };
  }

  private buildTokens(element: ElementSpec): string[] {
    const tokens = new Set<string>();

    // camelCase -> token
    element.name
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .split(/[\s_-]+/)
      .forEach((token) => tokens.add(token.toLowerCase()));

    if (element.purpose) {
      element.purpose
        .split(/[\s,]+/)
        .filter(Boolean)
        .forEach((token) => tokens.add(token.toLowerCase()));
    }

    return Array.from(tokens).filter(Boolean);
  }

  private filterCandidates(
    element: ElementSpec,
    snapshotElements: SnapshotElement[]
  ): SnapshotElement[] {
    const roles = ROLE_MAP[element.type] || [];
    if (roles.length === 0) {
      return snapshotElements;
    }
    return snapshotElements.filter((item) => roles.includes(item.role));
  }

  private scoreCandidate(candidate: SnapshotElement, tokens: string[]): number {
    let score = 0;
    if (!tokens.length) {
      return 1; // 최소 점수
    }

    const accessibleName = candidate.name?.toLowerCase() || '';
    tokens.forEach((token) => {
      if (!token) return;
      if (accessibleName.includes(token)) {
        score += 3;
      }
    });

    // role 자체로 가산점 (textbox/button 등)
    if (candidate.role) {
      score += 1;
    }

    return score;
  }

  private buildSelector(
    metadata: ElementMetadata | undefined,
    candidate: SnapshotElement,
    elementType: ElementType
  ): { selector: string | null; strategy: SelectorStrategy | null; reason?: string } {
    if (!metadata) {
      return {
        selector: candidate.name
          ? `this.page.getByRole('${candidate.role}', { name: '${escapeQuotes(candidate.name)}' })`
          : null,
        strategy: candidate.name ? SelectorStrategy.ROLE : null,
        reason: candidate.name ? 'accessible name 기반' : '메타데이터 없음',
      };
    }

    if (metadata.dataTest) {
      return {
        selector: `this.page.getByTestId('${escapeQuotes(metadata.dataTest)}')`,
        strategy: SelectorStrategy.TEST_ID,
        reason: 'data-test 속성 사용',
      };
    }

    if (metadata.placeholder) {
      return {
        selector: `this.page.getByPlaceholder('${escapeQuotes(metadata.placeholder)}')`,
        strategy: SelectorStrategy.PLACEHOLDER,
        reason: 'placeholder 기반',
      };
    }

    if (metadata.name) {
      return {
        selector: `this.page.locator('[name="${escapeAttribute(metadata.name)}"]')`,
        strategy: SelectorStrategy.CSS,
        reason: 'name 속성 기반',
      };
    }

    if (metadata.id) {
      return {
        selector: `this.page.locator('#${escapeAttribute(metadata.id)}')`,
        strategy: SelectorStrategy.CSS,
        reason: 'id 속성 기반',
      };
    }

    if (candidate.name) {
      return {
        selector: `this.page.getByRole('${candidate.role}', { name: '${escapeQuotes(
          candidate.name
        )}' })`,
        strategy: SelectorStrategy.ROLE,
        reason: 'accessible name 기반',
      };
    }

    return {
      selector: this.buildTagSelector(metadata, elementType),
      strategy: SelectorStrategy.CSS,
      reason: '태그 기반 fallback',
    };
  }

  private buildTagSelector(metadata: ElementMetadata, elementType: ElementType): string | null {
    const tags = TAG_MAP[elementType] || [];
    const tag = metadata.tag || tags[0];
    if (!tag) {
      return null;
    }

    const parts = [tag];
    if (metadata.className) {
      const firstClass = metadata.className.split(/\s+/)[0];
      if (firstClass) {
        parts.push(`.${firstClass.replace(/[^a-zA-Z0-9_-]/g, '')}`);
      }
    }

    return `this.page.locator('${parts.join('')}')`;
  }
}

function escapeQuotes(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

function escapeAttribute(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}
