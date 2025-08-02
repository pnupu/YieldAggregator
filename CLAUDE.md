# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

**Development server:**
```bash
npm run dev          # Start Next.js development server with Turbo
```

**Database operations:**
```bash
npm run db:generate  # Generate Prisma migrations
npm run db:migrate   # Deploy Prisma migrations
npm run db:push      # Push schema changes to database
npm run db:studio    # Open Prisma Studio
```

**Code quality:**
```bash
npm run check        # Run linting and TypeScript check
npm run lint         # Run ESLint
npm run lint:fix     # Run ESLint with auto-fix
npm run typecheck    # Run TypeScript compiler check
npm run format:check # Check Prettier formatting
npm run format:write # Apply Prettier formatting
```

**Build and deployment:**
```bash
npm run build        # Build production application
npm run preview      # Build and start production server
npm run start        # Start production server
```

## Project Architecture

### Core Technology Stack
- **Framework**: Next.js 15 with TypeScript and App Router
- **Database**: PostgreSQL with Prisma ORM
- **API Layer**: tRPC for type-safe APIs
- **Styling**: Tailwind CSS v4
- **Blockchain Integration**: 1inch Fusion SDK, ethers.js, viem
- **State Management**: TanStack React Query via tRPC

### Application Purpose
Yield Optimizer - A cross-chain yield farming optimizer that leverages 1inch Fusion+ technology to help users move funds to the highest-yielding DeFi opportunities across multiple chains. The system continuously monitors yield opportunities and executes profitable moves with minimal gas costs.

### Key Components

#### Environment Configuration (`src/env.js`)
- Uses `@t3-oss/env-nextjs` for type-safe environment validation
- Contains blockchain RPC URLs, API keys, and safety limits
- Critical variables: `ONEINCH_API_KEY`, `ETHEREUM_RPC_URL`, `POLYGON_RPC_URL`, `PRIVATE_KEY`

#### Cross-Chain Integration (`src/lib/fusion-plus.ts`)
- `CrossChainExecutor` class handles 1inch Fusion+ integration
- Provides cross-chain swapping capabilities with atomic guarantees
- Mock implementations for development - replace with actual SDK calls
- Key methods: `getCrossChainQuote`, `executeCrossChainSwap`, `monitorSwapExecution`

#### Yield Provider System (`src/lib/yield-providers/`)
- `YieldProviderManager` coordinates multiple DeFi protocol integrations
- Individual providers for Aave and Curve protocols
- Supports cross-chain yield comparison and optimization
- Base class pattern for adding new protocols

#### Type System (`src/lib/types.ts`)
- Comprehensive TypeScript interfaces for yield opportunities, positions, and analysis
- Contains token addresses and chain configurations
- Defines data structures for profitability analysis and execution reports

#### tRPC API Structure
- Server-side API in `src/server/api/`
- Type-safe client-server communication
- Includes timing middleware for development debugging

### Database Schema
- PostgreSQL with Prisma
- Currently minimal schema with example `Post` model
- Schema located at `prisma/schema.prisma`

### Environment Variables Required
```
DATABASE_URL=postgresql://...
ONEINCH_API_KEY=your_1inch_api_key
ETHEREUM_RPC_URL=https://mainnet.infura.io/v3/...
POLYGON_RPC_URL=https://polygon-mainnet.infura.io/v3/...
PRIVATE_KEY=0x...
AGENT_WALLET_ADDRESS=0x...
```

### Development Workflow
1. Always run `npm run check` before committing code
2. Database changes require `npm run db:generate` and `npm run db:migrate`
3. Use `npm run format:write` to ensure consistent code formatting
4. Cross-chain functionality is currently mocked for development

### Key Dependencies
- `@1inch/fusion-sdk` and `@1inch/cross-chain-sdk` for DeFi integration
- `ethers` and `viem` for blockchain interactions
- `@trpc/server` and `@trpc/client` for API layer
- `@prisma/client` for database operations
- `zod` for runtime type validation