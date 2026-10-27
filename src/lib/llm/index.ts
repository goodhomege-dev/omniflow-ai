import { LlmProvider } from './types';
import { GeminiProvider } from './gemini';
import { OpenAiProvider } from './openai';
import { AnthropicProvider } from './anthropic';
import { OpenRouterProvider } from './openrouter';
import { MockLlmProvider } from './mock';
import { getEnv } from '../config/env';

let customProvider: LlmProvider | null = null;

export function getLlmProvider(): LlmProvider {
  if (customProvider) return customProvider;

  const env = getEnv();

  if (env.LLM_PROVIDER === 'openrouter' && env.OPENROUTER_API_KEY) {
    return new OpenRouterProvider(env.OPENROUTER_API_KEY, env.OPENROUTER_MODEL);
  }

  if (env.LLM_PROVIDER === 'gemini' && env.GEMINI_API_KEY) {
    return new GeminiProvider(env.GEMINI_API_KEY, env.GEMINI_MODEL);
  }

  if (env.LLM_PROVIDER === 'openai' && env.OPENAI_API_KEY) {
    return new OpenAiProvider(env.OPENAI_API_KEY, env.OPENAI_MODEL);
  }

  if (env.LLM_PROVIDER === 'anthropic' && env.ANTHROPIC_API_KEY) {
    return new AnthropicProvider(env.ANTHROPIC_API_KEY, env.ANTHROPIC_MODEL);
  }

  // Fallback to Mock provider if keys not provided
  return new MockLlmProvider();
}

export function setTestLlmProvider(provider: LlmProvider | null): void {
  customProvider = provider;
}

export * from './types';
export * from './gemini';
export * from './openai';
export * from './anthropic';
export * from './openrouter';
export * from './mock';
