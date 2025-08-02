#!/bin/bash

echo "🚀 Starting deployment of Yield Optimizer..."

# Stop existing PM2 process if running
echo "📦 Stopping existing PM2 process..."
pm2 stop yield-optimizer 2>/dev/null || true
pm2 delete yield-optimizer 2>/dev/null || true

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Generate Prisma client
echo "🗄️ Generating Prisma client..."
npm run postinstall

# Build the application
echo "🔨 Building application..."
npm run build

# Start with PM2
echo "🚀 Starting application with PM2 on port 3002..."
pm2 start ecosystem.config.cjs

# Save PM2 configuration
echo "💾 Saving PM2 configuration..."
pm2 save

# Show status
echo "📊 PM2 Status:"
pm2 status

echo "✅ Deployment complete! Application is running on port 3002"
echo "🌐 Access your app at: http://localhost:3002"
echo ""
echo "📋 Useful PM2 commands:"
echo "  npm run pm2:logs    - View logs"
echo "  npm run pm2:monit   - Monitor processes"
echo "  npm run pm2:restart - Restart application"
echo "  npm run pm2:stop    - Stop application" 