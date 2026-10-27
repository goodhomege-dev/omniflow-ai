import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  APP_URL: z.string().default('http://localhost:3000'),
  PORT: z.coerce.number().default(3000),

  // Auth
  ADMIN_PASSWORD: z.string().default('admin123!'),
  SESSION_SECRET: z.string().min(16).default('omniflow_local_dev_session_secret_32_chars!'),

  // Supabase
  SUPABASE_URL: z.string().optional(),
  NEXT_PUBLIC_SUPABASE_URL: z.string().optional(),
  SUPABASE_REST_URL: z.string().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  SUPABASE_SECRET_KEY: z.string().optional(),
  SUPABASE_PUBLISHABLE_KEY: z.string().optional(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().optional(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().optional(),

  // LLM
  LLM_PROVIDER: z.enum(['gemini', 'openai', 'anthropic', 'openrouter']).default('openrouter'),
  GEMINI_API_KEY: z.string().optional(),
  GEMINI_MODEL: z.string().default('gemini-2.5-flash'),
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_MODEL: z.string().default('gpt-4o'),
  ANTHROPIC_API_KEY: z.string().optional(),
  ANTHROPIC_MODEL: z.string().default('claude-3-5-sonnet-20241022'),
  OPENROUTER_API_KEY: z.string().optional(),
  OPENROUTER_MODEL: z.string().default('google/gemma-4-26b-a4b-it:free'),

  // Channels
  TELEGRAM_BOT_TOKEN: z.string().optional(),
  TELEGRAM_WEBHOOK_SECRET: z.string().default('telegram_dev_secret'),
  TELEGRAM_STAFF_CHAT_ID: z.string().optional(),

  WHATSAPP_PHONE_NUMBER_ID: z.string().optional(),
  WHATSAPP_ACCESS_TOKEN: z.string().optional(),
  WHATSAPP_VERIFY_TOKEN: z.string().default('whatsapp_verify_token'),
  WHATSAPP_APP_SECRET: z.string().optional(),

  MESSENGER_PAGE_ACCESS_TOKEN: z.string().optional(),
  MESSENGER_VERIFY_TOKEN: z.string().default('messenger_verify_token'),
  MESSENGER_APP_SECRET: z.string().optional(),
  META_APP_SECRET: z.string().optional(),

  CRON_SECRET: z.string().default('cron_secret_key_123'),
});

export type Env = z.infer<typeof envSchema>;

let parsedEnv: Env | null = null;

export function getEnv(): Env {
  if (!parsedEnv) {
    const result = envSchema.safeParse(process.env);
    if (!result.success) {
      console.warn('⚠️ Environment variable warning:', result.error.flatten().fieldErrors);
      // Fallback with defaults
      parsedEnv = envSchema.parse({
        ...process.env,
        NODE_ENV: process.env.NODE_ENV || 'development',
      });
    } else {
      parsedEnv = result.data;
    }
  }
  return parsedEnv;
}
