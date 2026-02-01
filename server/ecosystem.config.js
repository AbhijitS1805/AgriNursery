module.exports = {
  apps: [
    {
      name: 'agri-nursery-api',
      script: './index.js',
      instances: process.env.PM2_INSTANCES || 2,
      exec_mode: 'cluster',
      watch: false,
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'development',
        PORT: 5000
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 5000
      },
      error_file: './logs/pm2-error.log',
      out_file: './logs/pm2-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
      listen_timeout: 3000,
      kill_timeout: 5000,
      wait_ready: true,
      // Graceful shutdown
      shutdown_with_message: true,
      // Cron restart (optional - restart every day at 3 AM)
      // cron_restart: '0 3 * * *',
      // Time zone
      time: true,
      // Environment variables file
      env_file: '.env',
      // Post-deployment hooks
      post_update: ['npm install', 'npm run migrate'],
      // Health check
      healthcheck: {
        path: '/health',
        interval: 30000, // 30 seconds
        timeout: 5000,
        threshold: 3
      }
    }
  ],

  deploy: {
    production: {
      user: 'deploy',
      host: 'your-production-server.com',
      ref: 'origin/main',
      repo: 'git@github.com:yourorg/agri-nursery.git',
      path: '/var/www/agri-nursery',
      'pre-deploy-local': '',
      'post-deploy': 'npm install && npm run migrate && pm2 reload ecosystem.config.js --env production',
      'pre-setup': '',
      env: {
        NODE_ENV: 'production'
      }
    },
    staging: {
      user: 'deploy',
      host: 'your-staging-server.com',
      ref: 'origin/develop',
      repo: 'git@github.com:yourorg/agri-nursery.git',
      path: '/var/www/agri-nursery-staging',
      'post-deploy': 'npm install && npm run migrate && pm2 reload ecosystem.config.js --env staging',
      env: {
        NODE_ENV: 'staging'
      }
    }
  }
};
