import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { loadConfig, createDefaultConfig, loadAuthCredentials } from './loader';

describe('Config Loader', () => {
  const testConfigPath = '.test-config.json';
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset environment
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    // Cleanup
    if (fs.existsSync(testConfigPath)) {
      fs.unlinkSync(testConfigPath);
    }
    process.env = originalEnv;
  });

  test('loadConfig - should load valid configuration', () => {
    // Create test config
    const testConfig = {
      baseUrl: 'http://localhost:3000',
      pagesDirectory: 'tests/pages',
      testsDirectory: 'tests',
      mocksDirectory: 'tests/mocks',
    };

    fs.writeFileSync(testConfigPath, JSON.stringify(testConfig), 'utf-8');

    // Set API key
    process.env.ANTHROPIC_API_KEY = 'test-api-key';

    // Load config
    const config = loadConfig(testConfigPath);

    expect(config.baseUrl).toBe('http://localhost:3000');
    expect(config.anthropicApiKey).toBe('test-api-key');
    expect(config.pagesDirectory).toBe('tests/pages');
  });

  test('loadConfig - should throw error if config file not found', () => {
    expect(() => loadConfig('non-existent.json')).toThrow('Configuration file not found');
  });

  test('loadConfig - should throw error if API key not set', () => {
    const testConfig = {
      baseUrl: 'http://localhost:3000',
    };

    fs.writeFileSync(testConfigPath, JSON.stringify(testConfig), 'utf-8');

    delete process.env.ANTHROPIC_API_KEY;

    expect(() => loadConfig(testConfigPath)).toThrow('ANTHROPIC_API_KEY not found');
  });

  test('loadAuthCredentials - should load credentials from env', () => {
    process.env.TEST_USER_EMAIL = 'test@example.com';
    process.env.TEST_USER_PASSWORD = 'password123';

    const creds = loadAuthCredentials();

    expect(creds).toEqual({
      email: 'test@example.com',
      password: 'password123',
    });
  });

  test('loadAuthCredentials - should return null if not set', () => {
    delete process.env.TEST_USER_EMAIL;
    delete process.env.TEST_USER_PASSWORD;

    const creds = loadAuthCredentials();

    expect(creds).toBeNull();
  });

  test('createDefaultConfig - should create config file', () => {
    const testDir = '.';
    const configPath = '.e2e-agent.config.json';

    // Clean up if exists
    if (fs.existsSync(configPath)) {
      fs.unlinkSync(configPath);
    }

    createDefaultConfig(testDir);

    expect(fs.existsSync(configPath)).toBe(true);

    const content = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    expect(content.baseUrl).toBe('http://localhost:3000');

    // Cleanup
    fs.unlinkSync(configPath);
  });
});
