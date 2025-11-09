/**
 * Playwright MCP 서버의 사용 가능한 도구 확인
 */

import { MCPClient } from '../dist/services/mcp-client.js';

async function checkMCPTools() {
  console.log('🔍 Playwright MCP 서버 도구 확인\n');

  const mcpClient = new MCPClient();

  try {
    // MCP 서버 연결
    const session = await mcpClient.connect({
      command: 'npx',
      args: ['-y', '@playwright/mcp-server'],
      env: process.env as Record<string, string>,
    });

    console.log('✅ MCP 서버 연결 성공\n');
    console.log(`📦 사용 가능한 도구: ${session.availableTools.length}개\n`);

    // 각 도구의 상세 정보 출력
    session.availableTools.forEach((tool, index) => {
      console.log(`${index + 1}. ${tool.name}`);
      console.log(`   설명: ${tool.description}`);
      
      if (tool.inputSchema?.properties) {
        console.log(`   파라미터:`);
        Object.keys(tool.inputSchema.properties).forEach((param) => {
          const paramInfo = tool.inputSchema.properties[param];
          console.log(`      - ${param}: ${paramInfo.type || 'any'} ${paramInfo.description ? `(${paramInfo.description})` : ''}`);
        });
      }
      console.log('');
    });

    await mcpClient.disconnect();
  } catch (error) {
    console.error('❌ 에러:', error);
    process.exit(1);
  }
}

checkMCPTools();
