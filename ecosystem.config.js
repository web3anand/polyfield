module.exports = {
  apps: [
    {
      name: 'oracle-bot',
      script: './oracle/oracle-bot.js',
      cwd: '/home/linuxuser/polyfield-bots',
      env: {
        NODE_ENV: 'production'
      },
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '200M',
      error_file: './logs/oracle-error.log',
      out_file: './logs/oracle-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      restart_delay: 5000
    },
    {
      name: 'micro-edge-scanner',
      script: './scanner/edge-scanner.js',
      cwd: '/home/linuxuser/polyfield-bots',
      env: {
        NODE_ENV: 'production'
      },
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '200M',
      error_file: './logs/scanner-error.log',
      out_file: './logs/scanner-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      restart_delay: 5000
    }
  ]
};
