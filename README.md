# RadutVerse

A production-ready full-stack platform for managing, visualizing, and monetizing tokenized intellectual property (IP) on the blockchain. Built with React, Express, Story Protocol, and OpenAI.

## Overview

RadutVerse is an all-in-one portal for IP ownership and monetization on Web3. It lets users register their creations as on-chain IP, connect a wallet, explore portfolios, and trade IP-backed NFTs — all from one clean interface. The platform integrates Story Protocol, OpenAI, and Pinata IPFS to make IP management smarter and more transparent.

**Core Capabilities:**

- **Create & Generate**: Generate AI-powered IP assets with IP Imagine
- **Manage & Register**: Register creations as on-chain IP using Story Protocol
- **Discover & Trade**: Explore and trade IP-backed NFTs in the marketplace
- **Analyze & Optimize**: Get AI insights about IP licensing and value
- **Track & Monitor**: View portfolio and chat history of all activities

## Key Features

### Core Capabilities

- **IP Imagine**: AI-powered image generation with watermarking and Web3 integration
- **IP Fi Assistant**: AI chatbot for IP licensing insights and financial analysis
- **IP Assistant**: Unified AI assistant for asset management and discovery
- **Portfolio Management**: Track owned IP assets, balances, and metadata
- **NFT Marketplace**: Browse and trade tokenized IP assets
- **Smart Search**: Find IP assets by owner, content, or metadata
- **Chat History**: Review and manage past assistant conversations
- **Wallet Integration**: EVM-compatible wallet support (MetaMask, Privy)
- **Settings & Customization**: Manage account integrations and preferences

### Web3 Integration

- Story Protocol SDK for on-chain IP registration and licensing
- Viem for blockchain interactions
- Privy for wallet authentication
- Support for remixable assets and licensing terms
- Derivative IP tracking and parent-child relationships

### AI & Content Tools

- OpenAI Vision API for image analysis and detection
- DALL-E 3 for AI image generation
- Watermarking system for content protection
- Similarity detection for remixable content validation
- Automatic descriptions and metadata generation

### Storage & Infrastructure

- Pinata IPFS for decentralized asset storage
- Vercel Blob for fast asset delivery
- Supabase for user data and authentication
- Server-side image processing with Sharp

## Tech Stack

**Frontend:**

- React 18.3 + React Router 6 (SPA mode)
- TypeScript 5.9
- Vite 7.1 (bundler & dev server)
- TailwindCSS 3.4 + custom theme
- Radix UI component library
- Framer Motion for animations
- React Query v5 for server state
- React Hook Form for forms
- Lucide React icons

**Backend:**

- Node.js with Express 5.1
- TypeScript support
- Multer for file uploads
- CORS handling for multiple origins

**Web3 & Blockchain:**

- Story Protocol Core SDK v1.4
- Viem v2.38 for Ethereum interactions
- Privy v1.99 for wallet auth
- EVM chain support (Story Network, mainnet)

**AI & APIs:**

- OpenAI API (Vision, GPT-4o, DALL-E 3)
- Story Protocol APIs for asset metadata
- Pinata IPFS gateway
- Vercel Blob for CDN

**Storage:**

- Supabase PostgreSQL
- Pinata IPFS (decentralized)
- Vercel Blob (edge-optimized)
- In-memory remix hash whitelist

**Dev & Tooling:**

- Vitest for unit/integration tests
- TypeScript compiler for type checking
- Prettier for code formatting
- SWC for fast transpilation
- Zod for schema validation

## Project Structure

```
client/                    # React SPA frontend
├── pages/                 # Route components (pages)
│   ├── Index.tsx          # Home / landing
│   ├── IpfiAssistant.tsx  # IP Fi Assistant (chat)
│   ├── IpImagine.tsx      # Image generation tool
│   ├── IpImagineCreationResult.tsx
│   ├── MyPortfolio.tsx    # User's IP portfolio
│   ├── NftMarketplace.tsx # NFT marketplace
│   ├── Settings.tsx       # Account settings
│   ├── History.tsx        # Chat history
│   └── NotFound.tsx       # 404 page
├── components/
│   ├── ui/               # Pre-built Radix UI components
│   ├── layout/           # DashboardLayout, navigation
│   ├── ip/               # IP-specific components
│   ├── portfolio/        # Portfolio display components
│   ├── common/           # Shared utilities
│   └── ...
├── hooks/                # Custom React hooks
├── services/             # API clients
├── lib/                  # Utilities and helpers
│   ├── ip-assistant/    # AI assistant logic
│   ├── license/         # Licensing utilities
│   ├── utils/           # Image processing, crypto, etc.
│   └── network-config.ts
├── context/             # React Context providers
├── types/               # TypeScript definitions
├── config/              # Navigation & app config
├── global.css           # TailwindCSS + theme
├── App.tsx              # App entry & routes
└── vite-env.d.ts

server/                    # Express backend
├── routes/               # API endpoint handlers (23+ routes)
│   ├── generate-image.ts
│   ├── analyze-image-vision.ts
│   ├── check-ip-assets.ts
│   ├── search-ip-assets.ts
│   ├── wallet-creations.ts
│   └── ... (20+ more)
├── utils/                # Server-side helpers
├── data/                 # Static data (remix hashes)
├── index.ts              # Express setup & CORS
└── node-build.ts         # Production entrypoint

shared/                    # Shared between client & server
├── api.ts               # Shared type interfaces
└── ...

public/                   # Static assets
├── robots.txt
└── ...

netlify/functions/        # Netlify serverless
api/                      # Vercel serverless entry
vercel.json               # Vercel config
netlify.toml              # Netlify config
tailwind.config.ts        # TailwindCSS config
tsconfig.json             # TypeScript config
vite.config.ts            # Frontend build config
vite.config.server.ts     # Backend build config
```

## Routes & Pages

| Route                | Component                     | Purpose                              |
| -------------------- | ----------------------------- | ------------------------------------ |
| `/`                  | `Index.tsx`                   | Home/landing page                    |
| `/ipfi-assistant`    | `IpfiAssistant.tsx`           | AI chat for IP financing & licensing |
| `/ip-imagine`        | `IpImagine.tsx`               | AI image generation tool             |
| `/ip-imagine/result` | `IpImagineCreationResult.tsx` | View generated assets                |
| `/nft-marketplace`   | `NftMarketplace.tsx`          | Browse & trade IP NFTs               |
| `/my-portfolio`      | `MyPortfolio.tsx`             | User's IP portfolio                  |
| `/settings`          | `Settings.tsx`                | Account & integration settings       |
| `/history`           | `History.tsx`                 | Chat history & logs                  |
| `/*`                 | `NotFound.tsx`                | 404 fallback                         |

## 🔌 API Endpoints

### Asset Management

```
POST /api/check-ip-assets
  { "address": "0x..." }
  Returns: IP assets owned by address

POST /api/get-asset-by-id
  { "ipId": "string" }
  Returns: Asset metadata and details

POST /api/search-ip-assets
  { "query": "string", "limit": 50, "offset": 0 }
  Returns: Search results with pagination

POST /api/search-by-owner
  { "owner": "0x...", "limit": 50, "offset": 0 }
  Returns: Assets owned by address
```

### Image & Vision

```
POST /api/generate-image
  { "prompt": "string", "mode": "demo|production" }
  Returns: Generated image URL

POST /api/analyze-image-vision
  { "imageUrl": "string", "address": "0x..." }
  Returns: Vision analysis results

POST /api/vision-image-detection
  (multipart: image file)
  Returns: Image detection results

POST /api/check-image-similarity
  (multipart: image file)
  Returns: Similarity analysis
```

### AI Assistance

```
POST /api/describe
  { "imageUrl": "string" }
  Returns: AI-generated description

POST /api/get-suggestions
  { "query": "string", "context": "..." }
  Returns: Typing suggestions & completions

POST /api/parse-search-intent
  { "query": "string" }
  Returns: Parsed search intent
```

### Storage & Upload

```
POST /api/upload
  (multipart: file)
  Returns: Uploaded file metadata

POST /api/ipfs/upload
  (multipart: file)
  Returns: IPFS hash & metadata

POST /api/ipfs/upload-json
  { "data": {...} }
  Returns: IPFS hash for JSON
```

### Wallet & Creation Management

```
GET /api/wallet-creations/:walletAddress
  Returns: Creations by wallet

POST /api/wallet-creations
  { "walletAddress": "0x...", "data": {...} }
  Returns: Created asset metadata

POST /api/wallet-creations/:id
  { "data": {...} }
  Updates: Existing creation

DELETE /api/wallet-creations/:id
  Deletes: Specified creation
```

### Remix & Licensing

```
POST /api/add-remix-hash
  { "hash": "string", "ipId": "string" }
  Registers remixable asset

POST /api/check-remix-hash
  { "hash": "string" }
  Verifies remixable status

POST /api/resolve-ip-name
  { "name": "string" }
  Resolves IP name to ID

POST /api/resolve-owner-domain
  { "domain": "string" }
  Resolves owner domain
```

## Getting Started

### Prerequisites

- **Node.js** v18+ with **pnpm** v10.14+
- **Git**
- **EVM Wallet** (MetaMask, etc.)
- **API Keys**: Story Protocol, OpenAI, Pinata

### Installation

```bash
# Clone repository
git clone <your-repo-url>
cd radutverse

# Install dependencies
pnpm install

# Create .env.local file (see Environment Variables section)
# Copy the example below and fill in your keys
```

### Environment Variables

Create a `.env.local` file in the project root:

```env
# Blockchain & Web3
VITE_PUBLIC_STORY_RPC=https://mainnet.storyrpc.io
VITE_PUBLIC_SPG_COLLECTION=0x9529f4519B0F0f9f0db044eb697A173C378Bebb3
VITE_GUEST_PRIVATE_KEY=your_test_private_key
STORY_API_KEY=your_story_protocol_api_key

# Authentication
VITE_PRIVY_APP_ID=your_privy_app_id

# AI Services
OPENAI_API_KEY=your_openai_api_key
OPENAI_VERIFIER_MODEL=gpt-4o

# Storage
PINATA_JWT=your_pinata_jwt_token
PINATA_GATEWAY=your_pinata_gateway_url

# Database
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Development

```bash
# Start dev server (frontend + backend on :5173)
pnpm dev

# Type checking
pnpm typecheck

# Run tests
pnpm test

# Format code
pnpm format.fix
```

## Building & Deployment

### Development Build

```bash
pnpm dev
```

Opens at `http://localhost:5173` with hot reload enabled.

### Production Build

```bash
# Build client + server
pnpm build

# Build outputs:
# - dist/spa/          # Frontend (optimized SPA)
# - dist/server/       # Backend (ESM modules)
```

### Deployment Options

#### Option 1: Vercel (Recommended)

1. Connect GitHub repo to Vercel
2. Add environment variables in Vercel dashboard
3. Deploy: `vercel` (or push to deploy automatically)

#### Option 2: Netlify

1. Connect GitHub repo
2. Set build command: `pnpm build`
3. Set publish directory: `dist/spa`
4. Add environment variables
5. Deploy

#### Option 3: Self-Hosted / Docker

```bash
# Build
pnpm build

# Start production server
pnpm start

# Runs on :8080 by default
```

Requires Node.js v18+ at runtime.

#### Option 4: Binary (pkg)

```bash
# Package as standalone executable
npm run build
npx pkg dist/server/node-build.mjs --targets node18-linux-x64

# Creates binary: node-build (no Node.js required)
```

See `DEPLOYMENT_GUIDE.md` for detailed deployment instructions.

## Testing & Quality

```bash
# Run all tests
pnpm test

# Type checking
pnpm typecheck

# Code formatting
pnpm format.fix

# Full pre-commit check
pnpm typecheck && pnpm format.fix && pnpm test
```

## Security Practices

- ✅ All API keys kept in backend/environment only
- ✅ CORS configured for trusted origins
- ✅ Input validation with Zod schemas
- ✅ Content Security Headers enabled
- ✅ XSS protection via React escaping
- ✅ CSRF tokens for state-changing operations
- ✅ Wallet signature verification for authentication
- ✅ Rate limiting on API endpoints (production)
- ⚠️ **Never commit** `.env.local` or secrets
- ⚠️ **Validate all** wallet addresses before transactions

### Best Practices

1. Use environment variables for all secrets
2. Validate inputs on both client & server
3. Verify wallet signatures before state changes
4. Log security events (wallet connects, transactions)
5. Monitor API error logs for anomalies
6. Keep dependencies updated: `pnpm update`

## Documentation

- **Setup & Deployment**: See `DEPLOYMENT_GUIDE.md`
- **Architecture Notes**: See `AGENTS.md`
- **API Details**: Check `server/routes/` for handler documentation

## Contributing

1. Create a feature branch: `git checkout -b feature/your-feature`
2. Make changes and test locally
3. Run checks: `pnpm typecheck && pnpm format.fix`
4. Commit: `git commit -m "feat: add your feature"`
5. Push and create a Pull Request

## Support & Resources

### Official Links

- **Story Protocol**: https://docs.story.foundation/
- **OpenAI API**: https://platform.openai.com/docs
- **Pinata**: https://docs.pinata.cloud
- **Privy Docs**: https://docs.privy.io
- **Viem**: https://viem.sh
- **Vercel**: https://vercel.com/docs
- **Netlify**: https://docs.netlify.com

### Troubleshooting

| Issue                    | Solution                                               |
| ------------------------ | ------------------------------------------------------ |
| Blank page on load       | Check browser console; verify API keys in `.env.local` |
| "Module not found" error | Run `pnpm install`                                     |
| Wallet won't connect     | Verify Privy App ID; check EVM network config          |
| API errors (401/403)     | Check API keys in environment variables                |
| Images not generating    | Verify OpenAI API key and usage limits                 |
| IPFS upload fails        | Check Pinata JWT and gateway configuration             |
| Port 5173 in use         | Kill process: `lsof -ti:5173 \| xargs kill -9`         |

## License

© 2025 RadutVerse Contributors

---

**RadutVerse**: Tokenizing creativity for the blockchain. 
