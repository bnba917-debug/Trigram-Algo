'use strict';

require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env') });

const { createApp } = require('./app');

const { app, config } = createApp();

app.listen(config.port, () => {
  console.log(`刘伯温预测股市运行于 http://localhost:${config.port}`);
  if (config.debugUnlock) {
    console.log('DEBUG_UNLOCK=true — 天机阵全天开放');
  }
  const aiStatus = config.aiApiKey
    ? `Kimi 已接入 (${config.aiModel})`
    : 'Kimi 未配置 API Key，将使用 mock 批注';
  console.log(`AI: ${aiStatus}`);
});
