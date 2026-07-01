'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { resolveAiConfig } = require('../src/services/aiConfig');

describe('aiConfig', () => {
  it('defaults to Kimi provider', () => {
    const config = resolveAiConfig({});
    assert.equal(config.provider, 'kimi');
    assert.equal(config.apiBase, 'https://api.moonshot.cn/v1');
    assert.equal(config.model, 'moonshot-v1-8k');
  });

  it('reads MOONSHOT_API_KEY', () => {
    const config = resolveAiConfig({ MOONSHOT_API_KEY: 'sk-test' });
    assert.equal(config.apiKey, 'sk-test');
  });

  it('supports openai provider preset', () => {
    const config = resolveAiConfig({ AI_PROVIDER: 'openai' });
    assert.equal(config.provider, 'openai');
    assert.equal(config.apiBase, 'https://api.openai.com/v1');
  });
});
