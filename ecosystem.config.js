module.exports = {
  apps: [
    {
      name: 'oracle-bot',
      script: './oracle/oracle-bot.js',
      cwd: '/home/linuxuser/polyfield-bots',
      env: {
        NODE_ENV: 'production',
        CONSENSUS_THRESHOLD: '75',
        SCAN_INTERVAL: '10000',
        // Updated to new Supabase project
        SUPABASE_URL: 'https://bzlxrggciehkcslchooe.supabase.co',
        SUPABASE_SERVICE_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ6bHhyZ2djaWVoa2NzbGNob29lIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTAxMzc3NywiZXhwIjoyMDgwNTg5Nzc3fQ.FvLwD5yQwC5La8OWtNZatpnxXRft8vRTQXmQ9z66mNk'
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
        NODE_ENV: 'production',
        MIN_EV: '3.0',
        MIN_LIQUIDITY: '10000',
        MAX_EXPIRY_HOURS: '24',
        SCAN_INTERVAL: '60000',
        // Updated to new Supabase project
        SUPABASE_URL: 'https://bzlxrggciehkcslchooe.supabase.co',
        SUPABASE_SERVICE_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ6bHhyZ2djaWVoa2NzbGNob29lIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTAxMzc3NywiZXhwIjoyMDgwNTg5Nzc3fQ.FvLwD5yQwC5La8OWtNZatpnxXRft8vRTQXmQ9z66mNk'
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
