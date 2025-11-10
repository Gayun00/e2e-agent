/**
 * Playwright MCP 서버의 사용 가능한 도구 확인
 */

import { MCPClient } from '../dist/services/mcp-client.js';

async function checkMCPTools() {
  console.log('🔍 Playwright MCP 서버 도구 확인\n');

  const mcpClient = new MCPClient();
  const serverConfig = resolveServerConfig();

  try {
    // MCP 서버 연결
    const session = await mcpClient.connect({
      command: serverConfig.command,
      args: serverConfig.args,
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

function resolveServerConfig() {
  const command = process.env.MCP_SERVER_COMMAND?.trim() || 'npx';
  const args =
    parseArgs(process.env.MCP_SERVER_ARGS) || ['-y', '@playwright/mcp-server'];

  return { command, args };
}

function parseArgs(raw?: string): string[] | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;

  if (trimmed.startsWith('[')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed.map((arg) => String(arg));
      }
    } catch (error) {
      console.warn('⚠️  MCP_SERVER_ARGS JSON 파싱 실패, 기본 인자를 사용합니다.', error);
      return null;
    }
  }

  return trimmed.split(/\s+/);
}
