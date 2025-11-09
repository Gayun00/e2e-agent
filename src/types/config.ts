import { z } from 'zod';

// Auth configuration schema
export const AuthConfigSchema = z.object({
  enabled: z.boolean().default(false),
  emailEnvVar: z.string().default('TEST_USER_EMAIL'),
  passwordEnvVar: z.string().default('TEST_USER_PASSWORD'),
  loginPath: z.string().default('/login'),
});

// Langfuse configuration schema
export const LangfuseConfigSchema = z.object({
  publicKey: z.string().optional(),
  secretKey: z.string().optional(),
  baseUrl: z.string().optional(),
}).optional();

// Main agent configuration schema
export const AgentConfigSchema = z.object({
  baseUrl: z.string().url(),
  pagesDirectory: z.string().default('tests/pages'),
  testsDirectory: z.string().default('tests'),
  mocksDirectory: z.string().default('tests/mocks'),
  anthropicApiKey: z.string(),
  auth: AuthConfigSchema.optional(),
  langfuseConfig: LangfuseConfigSchema,
});

// Export types
export type AuthConfig = z.infer<typeof AuthConfigSchema>;
export type LangfuseConfig = z.infer<typeof LangfuseConfigSchema>;
export type AgentConfig = z.infer<typeof AgentConfigSchema>;
