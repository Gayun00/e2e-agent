import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { AgentConfig, AgentConfigSchema } from '../types/config';

// Load environment variables
dotenv.config();

/**
 * Load agent configuration from file
 */
export function loadConfig(configPath: string = '.e2e-agent.config.json'): AgentConfig {
  try {
    // Check if config file exists
    if (!fs.existsSync(configPath)) {
      throw new Error(
        `Configuration file not found: ${configPath}\n` +
        `Please run 'e2e-agent init' to create a configuration file.`
      );
    }

    // Read and parse config file
    const configContent = fs.readFileSync(configPath, 'utf-8');
    const rawConfig = JSON.parse(configContent);

    // Get API key from environment variable
    const anthropicApiKey = process.env.ANTHROPIC_API_KEY;
    if (!anthropicApiKey) {
      throw new Error(
        'ANTHROPIC_API_KEY not found in environment variables.\n' +
        'Please add it to your .env file.'
      );
    }

    // Merge with environment variables
    const configWithEnv = {
      ...rawConfig,
      anthropicApiKey,
    };

    // Validate configuration
    const validatedConfig = AgentConfigSchema.parse(configWithEnv);

    return validatedConfig;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to load configuration: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Load authentication credentials from environment variables
 */
export function loadAuthCredentials(): { email: string; password: string } | null {
  const emailVar = process.env.TEST_USER_EMAIL;
  const passwordVar = process.env.TEST_USER_PASSWORD;

  if (!emailVar || !passwordVar) {
    return null;
  }

  return {
    email: emailVar,
    password: passwordVar,
  };
}

/**
 * Create default configuration file
 */
export function createDefaultConfig(projectPath: string = '.'): void {
  const configPath = path.join(projectPath, '.e2e-agent.config.json');

  const defaultConfig = {
    baseUrl: 'http://localhost:3000',
    pagesDirectory: 'tests/pages',
    testsDirectory: 'tests',
    mocksDirectory: 'tests/mocks',
    auth: {
      enabled: false,
      emailEnvVar: 'TEST_USER_EMAIL',
      passwordEnvVar: 'TEST_USER_PASSWORD',
      loginPath: '/login',
    },
  };

  fs.writeFileSync(
    configPath,
    JSON.stringify(defaultConfig, null, 2),
    'utf-8'
  );

  console.log(`✓ Created configuration file: ${configPath}`);
}
