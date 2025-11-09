import fs from 'fs/promises';
import {
    StepAction,
    type ScenarioDocument,
    type PageDefinition,
    type TestFlow,
    type TestStep,
} from '../types/scenario';

/**
 * 시나리오 문서 파서
 * Markdown 형식의 시나리오 문서를 파싱하여 구조화된 데이터로 변환
 */
export class ScenarioParser {
    /**
     * 파일에서 시나리오 문서 로드 및 파싱
     */
    async parseFile(filePath: string): Promise<ScenarioDocument> {
        const content = await fs.readFile(filePath, 'utf-8');
        return this.parse(content);
    }

    /**
     * 문자열 콘텐츠를 파싱
     */
    parse(content: string): ScenarioDocument {
        const lines = content.split('\n');
        const pages: PageDefinition[] = [];
        const flows: TestFlow[] = [];

        let currentSection: 'none' | 'pages' | 'flows' = 'none';
        let currentPage: Partial<PageDefinition> | null = null;
        let currentFlow: Partial<TestFlow> | null = null;
        let currentSteps: TestStep[] = [];

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();

            // 빈 줄 무시
            if (!line) continue;

            // 섹션 감지
            if (line.includes('## 📄 페이지 정의') || line.includes('## 페이지 정의')) {
                currentSection = 'pages';
                continue;
            }

            if (line.includes('## 🧪 테스트 플로우') || line.includes('## 테스트 플로우')) {
                currentSection = 'flows';
                continue;
            }

            // 페이지 정의 섹션
            if (currentSection === 'pages') {
                // 페이지 이름 (### PageName)
                if (line.startsWith('### ')) {
                    // 이전 페이지 저장
                    if (currentPage && currentPage.name) {
                        pages.push(currentPage as PageDefinition);
                    }

                    currentPage = {
                        name: line.substring(4).trim(),
                    };
                    continue;
                }

                // 페이지 속성
                if (currentPage && line.startsWith('- **경로**:')) {
                    const path = this.extractValue(line);
                    currentPage.path = path;
                    continue;
                }

                if (currentPage && line.startsWith('- **설명**:')) {
                    const description = this.extractValue(line);
                    currentPage.description = description;
                    continue;
                }
            }

            // 테스트 플로우 섹션
            if (currentSection === 'flows') {
                // 플로우 이름 (### FlowName)
                if (line.startsWith('### ')) {
                    // 이전 플로우 저장
                    if (currentFlow && currentFlow.name) {
                        currentFlow.steps = currentSteps;
                        flows.push(currentFlow as TestFlow);
                    }

                    currentFlow = {
                        name: line.substring(4).trim(),
                    };
                    currentSteps = [];
                    continue;
                }

                // 플로우 목적
                if (currentFlow && line.startsWith('**목적**:')) {
                    currentFlow.purpose = line.substring(8).trim();
                    continue;
                }

                // 테스트 단계 (숫자로 시작)
                const stepMatch = line.match(/^(\d+)\.\s+(.+)$/);
                if (stepMatch && currentFlow) {
                    const order = parseInt(stepMatch[1], 10);
                    const raw = stepMatch[2].trim();
                    const step = this.parseStep(order, raw);
                    currentSteps.push(step);
                    continue;
                }
            }
        }

        // 마지막 페이지 저장
        if (currentPage && currentPage.name) {
            pages.push(currentPage as PageDefinition);
        }

        // 마지막 플로우 저장
        if (currentFlow && currentFlow.name) {
            currentFlow.steps = currentSteps;
            flows.push(currentFlow as TestFlow);
        }

        return { pages, flows };
    }

    /**
     * 값 추출 (백틱 제거)
     */
    private extractValue(line: string): string {
        const match = line.match(/:\s*`([^`]+)`/);
        if (match) {
            return match[1];
        }
        // 백틱 없는 경우
        const colonIndex = line.indexOf(':');
        if (colonIndex !== -1) {
            return line.substring(colonIndex + 1).trim();
        }
        return '';
    }

    /**
     * 테스트 단계 파싱
     */
    private parseStep(order: number, raw: string): TestStep {
        const step: TestStep = {
            order,
            raw,
            action: StepAction.CLICK, // 기본값
        };

        // 백틱으로 감싸진 값 추출
        const valueMatch = raw.match(/`([^`]+)`/);
        if (valueMatch) {
            step.value = valueMatch[1];
        }

        // 페이지 이름 추출 (Page로 끝나는 단어)
        const pageMatch = raw.match(/(\w+Page)/);
        if (pageMatch) {
            step.page = pageMatch[1];
        }

        // 동작 타입 결정
        if (raw.includes('이동')) {
            step.action = StepAction.NAVIGATE;
            if (raw.includes('확인')) {
                step.action = StepAction.VERIFY_URL;
            }
        } else if (raw.includes('입력')) {
            step.action = StepAction.INPUT;
            // 입력 대상 추출 (예: "이메일 입력" -> "이메일")
            const targetMatch = raw.match(/(.+?)\s+입력/);
            if (targetMatch) {
                step.target = targetMatch[1].trim();
            }
        } else if (raw.includes('클릭')) {
            step.action = StepAction.CLICK;
            // 클릭 대상 추출
            const targetMatch = raw.match(/(.+?)\s+(버튼\s+)?클릭/);
            if (targetMatch) {
                step.target = targetMatch[1].trim();
            }
        } else if (raw.includes('확인')) {
            if (raw.includes('표시')) {
                step.action = StepAction.VERIFY_TEXT;
                // 확인할 텍스트 추출
                const textMatch = raw.match(/(.+?)\s+표시\s+확인/);
                if (textMatch) {
                    step.target = textMatch[1].trim();
                }
                if (valueMatch) {
                    step.assertion = valueMatch[1];
                }
            } else if (raw.includes('리다이렉트') || raw.includes('이동')) {
                step.action = StepAction.VERIFY_URL;
            } else {
                step.action = StepAction.VERIFY_VISIBLE;
                // 확인할 요소 추출
                const targetMatch = raw.match(/(.+?)\s+확인/);
                if (targetMatch) {
                    step.target = targetMatch[1].trim();
                }
            }
        } else if (raw.includes('대기')) {
            step.action = StepAction.WAIT;
        } else if (raw.includes('선택')) {
            step.action = StepAction.SELECT;
        }

        return step;
    }

    /**
     * 파싱 결과 검증
     */
    validate(document: ScenarioDocument): { valid: boolean; errors: string[] } {
        const errors: string[] = [];

        // 페이지 검증
        if (document.pages.length === 0) {
            errors.push('페이지가 정의되지 않았습니다.');
        }

        document.pages.forEach((page, index) => {
            if (!page.name) {
                errors.push(`페이지 ${index + 1}: 이름이 없습니다.`);
            }
            if (!page.path) {
                errors.push(`페이지 ${page.name || index + 1}: 경로가 없습니다.`);
            }
        });

        // 플로우 검증
        if (document.flows.length === 0) {
            errors.push('테스트 플로우가 정의되지 않았습니다.');
        }

        document.flows.forEach((flow, index) => {
            if (!flow.name) {
                errors.push(`플로우 ${index + 1}: 이름이 없습니다.`);
            }
            if (flow.steps.length === 0) {
                errors.push(`플로우 ${flow.name || index + 1}: 단계가 없습니다.`);
            }
        });

        return {
            valid: errors.length === 0,
            errors,
        };
    }
}
