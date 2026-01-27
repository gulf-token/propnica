/**
 * Secrets Management
 *
 * Helper functions for retrieving secrets from environment variables
 * or AWS Systems Manager Parameter Store (SSM).
 */

import { SSMClient, GetParameterCommand } from '@aws-sdk/client-ssm';

// Cache for secrets to avoid repeated SSM calls
const secretsCache: Map<string, { value: string; expiresAt: number }> = new Map();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

// SSM client singleton
let ssmClient: SSMClient | null = null;

function getSSMClient(): SSMClient {
  if (!ssmClient) {
    ssmClient = new SSMClient({
      region: process.env.AWS_REGION || 'eu-central-1',
    });
  }
  return ssmClient;
}

/**
 * Get a secret from environment variable or SSM Parameter Store.
 *
 * @param envVarName - The environment variable name to check first
 * @param ssmParameterName - The SSM parameter name to fall back to
 * @returns The secret value or null if not found
 */
export async function getSecret(
  envVarName: string,
  ssmParameterName?: string
): Promise<string | null> {
  // First, try environment variable
  const envValue = process.env[envVarName];
  if (envValue) {
    return envValue;
  }

  // If no SSM parameter name provided, return null
  if (!ssmParameterName) {
    return null;
  }

  // Check cache
  const cached = secretsCache.get(ssmParameterName);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.value;
  }

  // Try to get from SSM
  try {
    const client = getSSMClient();
    const command = new GetParameterCommand({
      Name: ssmParameterName,
      WithDecryption: true,
    });

    const response = await client.send(command);
    const value = response.Parameter?.Value;

    if (value) {
      // Cache the value
      secretsCache.set(ssmParameterName, {
        value,
        expiresAt: Date.now() + CACHE_TTL_MS,
      });
      return value;
    }
  } catch (error) {
    console.error(`Failed to get secret from SSM (${ssmParameterName}):`, error);
  }

  return null;
}

/**
 * Get the Anthropic API key from environment or SSM.
 */
export async function getAnthropicApiKey(): Promise<string | null> {
  return getSecret(
    'ANTHROPIC_API_KEY',
    '/propnica/production/anthropic/api_key'
  );
}
