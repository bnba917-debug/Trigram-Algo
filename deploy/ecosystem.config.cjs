/**
 * PM2 进程配置
 * 用法: pm2 start deploy/ecosystem.config.cjs
 *       pm2 reload deploy/ecosystem.config.cjs --update-env
 */
module.exports = {
  apps: [
    {
      name: 'trigram-algo',
      script: 'backend/src/index.js',
      cwd: __dirname + '/..',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '300M',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      error_file: 'logs/pm2-error.log',
      out_file: 'logs/pm2-out.log',
      merge_logs: true,
      time: true,
    },
  ],
};
