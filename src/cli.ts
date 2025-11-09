#!/usr/bin/env node

// CLI entry point - will be implemented in next tasks
export function startCLI() {
  console.log('🤖 Playwright E2E Agent');
  console.log('Version 0.1.0');
}

// Run CLI if executed directly
if (require.main === module) {
  startCLI();
}
