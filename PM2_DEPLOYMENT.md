# PM2 Deployment Guide

This guide explains how to deploy and manage the Yield Optimizer application using PM2.

## Prerequisites

1. **Install PM2 globally:**
   ```bash
   npm install -g pm2
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

## Quick Deployment

### Option 1: Using the deployment script (Recommended)
```bash
./deploy.sh
```

This script will:
- Stop any existing PM2 processes
- Install dependencies
- Generate Prisma client
- Build the application
- Start the app with PM2 on port 3002
- Save PM2 configuration

### Option 2: Manual deployment
```bash
# Build the application
npm run build

# Start with PM2
npm run pm2:start
```

## PM2 Management Commands

### Start the application
```bash
npm run pm2:start
```

### Stop the application
```bash
npm run pm2:stop
```

### Restart the application
```bash
npm run pm2:restart
```

### View logs
```bash
npm run pm2:logs
```

### Monitor processes
```bash
npm run pm2:monit
```

### Delete the PM2 process
```bash
npm run pm2:delete
```

### Check status
```bash
pm2 status
```

## Configuration

The application is configured to run on **port 3002** through the following files:

- `ecosystem.config.js` - PM2 configuration
- `next.config.js` - Next.js configuration
- `package.json` - Updated start script

## Environment Variables

Make sure to set up your environment variables in a `.env` file:

```env
# Database
DATABASE_URL="your_database_url"

# 1inch API
INCH_API_KEY="your_1inch_api_key"

# Other environment variables as needed
```

## Troubleshooting

### Application won't start
1. Check if port 3002 is available:
   ```bash
   lsof -i :3002
   ```

2. View PM2 logs:
   ```bash
   npm run pm2:logs
   ```

3. Check PM2 status:
   ```bash
   pm2 status
   ```

### Port already in use
If port 3002 is already in use, you can:
1. Stop the existing process using that port
2. Or modify the port in `ecosystem.config.js` and `package.json`

### Memory issues
The PM2 configuration includes a memory limit of 1GB. If you need more memory, update the `max_memory_restart` value in `ecosystem.config.js`.

## Production Considerations

1. **Set up PM2 startup script:**
   ```bash
   pm2 startup
   pm2 save
   ```

2. **Monitor application health:**
   ```bash
   pm2 monit
   ```

3. **Set up log rotation:**
   ```bash
   pm2 install pm2-logrotate
   ```

4. **Configure environment variables for production:**
   - Use `NODE_ENV=production`
   - Set up proper database URLs
   - Configure API keys

## Accessing the Application

Once deployed, your application will be available at:
**http://localhost:3002**

## Useful PM2 Commands

```bash
# List all processes
pm2 list

# Show detailed information
pm2 show yield-optimizer

# Reload application (zero-downtime)
pm2 reload yield-optimizer

# Set up PM2 to start on system boot
pm2 startup
pm2 save

# View real-time logs
pm2 logs yield-optimizer --lines 100

# Monitor CPU/Memory usage
pm2 monit
``` 