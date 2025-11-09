/**
 * MCP 클라이언트 테스트 스크립트
 * 
 * 사용법:
 * 1. 프로젝트 빌드: npm run build (루트에서)
 * 2. 테스트 앱 실행: cd playground && npm run dev (별도 터미널)
 * 3. MCP 테스트 실행: cd playground && npx tsx test-mcp.ts
 */

import { PlaywrightMCPService } from '../dist/services/playwright-mcp.js';

async function testMCP() {
  console.log('🧪 MCP 클라이언트 테스트 시작\n');

  const baseUrl = 'http://localhost:3000';
  const mcpService = new PlaywrightMCPService(baseUrl);

  try {
    // 1. 세션 시작
    console.log('1️⃣  MCP 세션 시작...');
    const session = await mcpService.startSession();
    console.log(`   ✓ 세션 ID: ${session.sessionId}`);
    console.log(`   ✓ 연결 상태: ${session.isConnected}`);
    console.log(`   ✓ 사용 가능한 도구: ${session.availableTools.length}개`);
    
    // 도구 상세 정보 출력
    console.log('\n   📋 도구 목록:');
    session.availableTools.forEach((tool, index) => {
      console.log(`      ${index + 1}. ${tool.name}`);
      if (tool.description) {
        console.log(`         ${tool.description}`);
      }
    });
    console.log('');

    // 2. 페이지 이동
    console.log('2️⃣  페이지 이동 테스트...');
    await mcpService.navigate('/login');
    console.log('   ✓ /login 페이지 로드 완료\n');

    // 3. Snapshot 테스트
    console.log('3️⃣  Snapshot 테스트...');
    const snapshot = await mcpService.snapshot();
    console.log('   페이지 구조:');
    console.log(snapshot.split('\n').slice(0, 10).map(line => `   ${line}`).join('\n'));
    console.log('   ...\n');

    console.log('✅ 모든 테스트 완료!');

  } catch (error) {
    console.error('\n❌ 테스트 실패:', error);
    throw error;
  } finally {
    // 4. 세션 종료
    console.log('\n4️⃣  세션 종료...');
    await mcpService.close();
    console.log('   ✓ MCP 세션 종료 완료');
  }
}

// 실행
testMCP().catch((error) => {
  console.error('테스트 실행 중 에러:', error);
  process.exit(1);
});
