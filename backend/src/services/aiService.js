'use strict';

const SYSTEM_PROMPT =
  '严格限制输出在90字以内（含标点）。你现在是明朝军师刘伯温，用古风语气为股票给出神秘但简短的玄学预测，最后只接一句「天机已示，盈亏自负」。';

function buildMockReason(stockCode, stockName) {
  const digits = stockCode.replace(/\D/g, '');
  const sum = [...digits].reduce((acc, d) => acc + Number(d), 0);
  return (
    `紫微入局，星海回旋。代码「${stockCode}」引玄武壁宿水位大转，` +
    `数和${sum}乃阴阳交泰之谶，借${stockName}蒸腾引动九天星辰反冲。` +
    `午后盘面必随星辰潮汐破局，老祖劝你稳住道心，切莫提前下车。天机已示，盈亏自负。`
  );
}

function isKimiK2Model(model) {
  return /kimi-k2/i.test(model || '');
}

function resolveTemperature(model, override) {
  if (override !== undefined && override !== '') {
    return Number(override);
  }
  if (isKimiK2Model(model)) {
    return 0.6;
  }
  return 0.9;
}

function buildChatRequestBody(model, messages, config = {}) {
  const body = {
    model,
    messages,
    max_tokens: config.maxTokens || 200, // B方案：进一步降低，防止k2模型写太长
  };

  if (isKimiK2Model(model)) {
    // k2 默认开启思考会占满 token，导致 content 为空；短文案生成应关闭
    body.thinking = { type: 'disabled' };
    body.temperature = resolveTemperature(model, config.temperature);
  } else {
    body.temperature = resolveTemperature(model, config.temperature);
  }

  return body;
}

function extractMessageContent(data) {
  const choice = data.choices?.[0];
  const message = choice?.message;
  if (!message) return { content: '', finishReason: choice?.finish_reason };

  const text =
    (typeof message.content === 'string' ? message.content : '') ||
    (Array.isArray(message.content)
      ? message.content
          .map((part) => (typeof part === 'string' ? part : part?.text || ''))
          .join('')
      : '');

  const trimmed = text.trim();
  if (trimmed) {
    return { content: trimmed, finishReason: choice?.finish_reason };
  }

  const reasoning = message.reasoning_content?.trim() || '';
  return { content: reasoning, finishReason: choice?.finish_reason };
}

async function generatePrediction(stockCode, stockName, config = {}) {
  const { apiKey, apiBase, model, temperature, maxTokens } = config;

  if (!apiKey) {
    return buildMockReason(stockCode, stockName);
  }

  const userPrompt = `今日推荐股票：${stockCode} ${stockName}。请给出刘伯温风格的玄学预测批注。`;

  const response = await fetch(`${apiBase.replace(/\/$/, '')}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(
      buildChatRequestBody(
        model,
        [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userPrompt },
        ],
        { temperature, maxTokens }
      )
    ),
  });

  if (!response.ok) {
    const errText = await response.text();
    let message = errText;
    try {
      const parsed = JSON.parse(errText);
      message = parsed.error?.message || parsed.message || errText;
    } catch {
      // keep raw text
    }
    throw new Error(`Kimi API 调用失败 (${response.status}): ${message}`);
  }

  const data = await response.json();
  const { content, finishReason } = extractMessageContent(data);

  if (!content) {
    throw new Error(
      `Kimi 返回空内容（finish_reason=${finishReason || 'unknown'}）。` +
        '若为 k2 模型，请确认已关闭思考模式或增大 max_tokens。'
    );
  }

  return content;
}

module.exports = {
  SYSTEM_PROMPT,
  buildMockReason,
  isKimiK2Model,
  resolveTemperature,
  buildChatRequestBody,
  extractMessageContent,
  generatePrediction,
};
