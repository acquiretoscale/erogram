/** PM2 config — TGempire on VPS port 3942 (localhost only). */
module.exports = {
  apps: [
    {
      name: 'tgempire',
      cwd: __dirname,
      script: 'node_modules/.bin/next',
      args: 'start -H 127.0.0.1 -p 3942',
      env: {
        NODE_ENV: 'production',
        PORT: '3942',
      },
      max_restarts: 10,
      restart_delay: 5000,
    },
  ],
};
