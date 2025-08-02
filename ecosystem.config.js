export default {
  apps: [
    {
      name: 'yield-optimizer',
      script: 'node_modules/.bin/next',
      args: 'start -p 3002',
      cwd: './',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 3002
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3002
      }
    }
  ]
}; 