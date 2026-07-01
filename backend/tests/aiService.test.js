'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  buildMockReason,
  resolveTemperature,
  buildChatRequestBody,
  extractMessageContent,
} = require('../src/services/aiService');

describe('aiService', () => {
  it('buildMockReason includes stock code and name', () => {
    const reason = buildMockReason('600519', '贵州茅台');
    assert.match(reason, /600519/);
    assert.match(reason, /贵州茅台/);
    assert.match(reason, /天机已示/);
  });

  it('resolveTemperature uses 0.6 for kimi-k2 non-thinking mode', () => {
    assert.equal(resolveTemperature('kimi-k2.6'), 0.6);
    assert.equal(resolveTemperature('moonshot-v1-8k'), 0.9);
  });

  it('buildChatRequestBody disables thinking for kimi-k2', () => {
    const body = buildChatRequestBody('kimi-k2.6', [{ role: 'user', content: 'test' }]);
    assert.deepEqual(body.thinking, { type: 'disabled' });
    assert.equal(body.temperature, 0.6);
    assert.equal(body.max_tokens, 1024);
  });

  it('extractMessageContent falls back to reasoning_content', () => {
    const result = extractMessageContent({
      choices: [
        {
          finish_reason: 'stop',
          message: { content: '', reasoning_content: '天机已示' },
        },
      ],
    });
    assert.equal(result.content, '天机已示');
  });
});
