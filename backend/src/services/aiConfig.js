'use strict';

const PROVIDERS = {
  kimi: {
    apiBase: 'https://api.moonshot.cn/v1',
    model: 'moonshot-v1-8k',
  },
  openai: {
    apiBase: 'https://api.openai.com/v1',
    model: 'gpt-4o-mini',
  },
};

function resolveAiConfig(env = process.env) {
  const provider = (env.AI_PROVIDER || 'kimi').toLowerCase();
  const preset = PROVIDERS[provider] || PROVIDERS.kimi;

  return {
    provider,
    apiKey:
      env.AI_API_KEY ||
      env.MOONSHOT_API_KEY ||
      env.KIMI_API_KEY ||
      '',
    apiBase: env.AI_API_BASE || preset.apiBase,
    model: env.AI_MODEL || preset.model,
  };
}

module.exports = {
  PROVIDERS,
  resolveAiConfig,
};
