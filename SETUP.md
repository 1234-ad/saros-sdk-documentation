# 🛠️ Setup Instructions

Complete setup guide for the Saros SDK Documentation project.

## Prerequisites

- **Node.js 16+** - [Download](https://nodejs.org/)
- **npm 8+** or **yarn 1.22+**
- **Git** - [Download](https://git-scm.com/)
- **Solana CLI** (optional) - [Install Guide](https://docs.solana.com/cli/install-solana-cli-tools)

## Quick Start

### 1. Clone Repository

```bash
git clone https://github.com/1234-ad/saros-sdk-documentation.git
cd saros-sdk-documentation
```

### 2. Install Dependencies

```bash
# Using npm
npm install

# Using yarn
yarn install
```

### 3. Environment Setup

Create a `.env` file in the root directory:

```bash
# .env
SOLANA_RPC_URL=https://api.devnet.solana.com
SOLANA_CLUSTER=devnet
WALLET_PRIVATE_KEY=your_private_key_here
```

### 4. Run Examples

```bash
# Basic token swap example
npm run example:swap

# Liquidity provision example
npm run example:liquidity

# DLMM position management
npm run example:dlmm

# Staking rewards example
npm run example:staking

# Farm operations example
npm run example:farming
```

## Development Setup

### TypeScript Configuration

The project includes a `tsconfig.json` with optimal settings:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "include": [
    "examples/**/*",
    "docs/**/*",
    "*.ts"
  ],
  "exclude": [
    "node_modules",
    "dist"
  ]
}
```

### Build Project

```bash
# Compile TypeScript
npm run build

# Watch mode for development
npm run dev
```

### Code Quality

```bash
# Lint code
npm run lint

# Format code
npm run format

# Run tests
npm run test
```

## SDK Installation

### Core SDK (AMM, Staking, Farming)

```bash
npm install @saros-finance/sdk @solana/web3.js @solana/spl-token
```

### DLMM SDK (Dynamic Liquidity Market Making)

```bash
npm install @saros-finance/dlmm-sdk @solana/web3.js
```

### Rust SDK (for Rust projects)

Add to your `Cargo.toml`:

```toml
[dependencies]
saros-dlmm-sdk-rs = "0.1.0"
solana-sdk = "1.16"
tokio = { version = "1.0", features = ["full"] }
```

## Network Configuration

### Devnet (Recommended for Testing)

```typescript
import { Connection } from '@solana/web3.js';
import { SarosSDK } from '@saros-finance/sdk';

const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
const sdk = new SarosSDK({
  connection,
  cluster: 'devnet'
});
```

### Mainnet (Production)

```typescript
const connection = new Connection('https://api.mainnet-beta.solana.com', 'confirmed');
const sdk = new SarosSDK({
  connection,
  cluster: 'mainnet-beta'
});
```

### Local Development

```typescript
const connection = new Connection('http://localhost:8899', 'confirmed');
const sdk = new SarosSDK({
  connection,
  cluster: 'localnet'
});
```

## Wallet Setup

### Generate Test Wallet

```typescript
import { Keypair } from '@solana/web3.js';

// Generate new wallet
const wallet = Keypair.generate();
console.log('Public Key:', wallet.publicKey.toString());
console.log('Private Key:', wallet.secretKey);
```

### Load Existing Wallet

```typescript
import { Keypair } from '@solana/web3.js';
import fs from 'fs';

// From private key array
const secretKey = new Uint8Array([/* your private key bytes */]);
const wallet = Keypair.fromSecretKey(secretKey);

// From JSON file
const walletData = JSON.parse(fs.readFileSync('wallet.json', 'utf8'));
const wallet = Keypair.fromSecretKey(new Uint8Array(walletData));
```

### Get Devnet SOL

```bash
# Using Solana CLI
solana airdrop 2 <your-wallet-address> --url devnet

# Or programmatically
const airdropSignature = await connection.requestAirdrop(
  wallet.publicKey,
  2 * LAMPORTS_PER_SOL
);
await connection.confirmTransaction(airdropSignature);
```

## Testing Setup

### Jest Configuration

Create `jest.config.js`:

```javascript
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  collectCoverageFrom: [
    'examples/**/*.ts',
    '!examples/**/*.d.ts',
  ],
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  testTimeout: 30000
};
```

### Test Environment

Create `tests/setup.ts`:

```typescript
import { Connection } from '@solana/web3.js';

// Extend Jest timeout for blockchain operations
jest.setTimeout(30000);

// Mock connection for tests
global.testConnection = new Connection('https://api.devnet.solana.com', 'confirmed');

// Test wallet setup
global.testWallet = /* your test wallet */;
```

### Run Tests

```bash
# Run all tests
npm test

# Run specific test file
npm test -- basic-swap.test.ts

# Run with coverage
npm test -- --coverage

# Watch mode
npm test -- --watch
```

## Documentation Structure

```
saros-sdk-documentation/
├── README.md                 # Main documentation
├── SETUP.md                 # This file
├── package.json             # Dependencies and scripts
├── tsconfig.json           # TypeScript configuration
├── docs/                   # Documentation files
│   ├── tutorials/          # Step-by-step guides
│   │   ├── token-swapping.md
│   │   ├── liquidity-provision.md
│   │   ├── dlmm-pools.md
│   │   └── staking-operations.md
│   ├── api/               # API references
│   │   ├── core-sdk/
│   │   ├── dlmm-sdk/
│   │   └── rust-sdk/
│   └── troubleshooting.md # Common issues
├── examples/              # Working code examples
│   ├── basic-swap.ts
│   ├── liquidity-pool.ts
│   ├── dlmm-position.ts
│   ├── staking-rewards.ts
│   └── farm-operations.ts
└── tests/                # Test files
    ├── setup.ts
    └── *.test.ts
```

## Deployment Options

### GitHub Pages

1. Enable GitHub Pages in repository settings
2. Select source: `Deploy from a branch`
3. Choose branch: `main` and folder: `/ (root)`

### Netlify

1. Connect repository to Netlify
2. Build command: `npm run build`
3. Publish directory: `dist`

### Vercel

1. Import repository to Vercel
2. Framework preset: `Other`
3. Build command: `npm run build`
4. Output directory: `dist`

### Custom Domain

Add `CNAME` file to root:

```
docs.saros-sdk.com
```

## Environment Variables

### Required Variables

```bash
# .env
SOLANA_RPC_URL=https://api.devnet.solana.com
SOLANA_CLUSTER=devnet
```

### Optional Variables

```bash
# Development
NODE_ENV=development
DEBUG=true

# API Keys (if needed)
HELIUS_API_KEY=your_helius_key
QUICKNODE_API_KEY=your_quicknode_key

# Wallet (for automated examples)
WALLET_PRIVATE_KEY=your_private_key_base58
```

## Troubleshooting Setup

### Common Issues

#### Node Version Error
```bash
# Check Node version
node --version

# Install correct version
nvm install 16
nvm use 16
```

#### Package Installation Fails
```bash
# Clear cache
npm cache clean --force
rm -rf node_modules package-lock.json

# Reinstall
npm install
```

#### TypeScript Compilation Errors
```bash
# Check TypeScript version
npx tsc --version

# Reinstall TypeScript
npm install -D typescript@latest
```

#### RPC Connection Issues
```bash
# Test connection
curl -X POST -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"getHealth"}' \
  https://api.devnet.solana.com
```

### Getting Help

- **GitHub Issues**: [Create Issue](https://github.com/1234-ad/saros-sdk-documentation/issues)
- **Discord**: [Saros Dev Station](https://discord.gg/saros)
- **Email**: dev-support@saros.finance

## Contributing

### Development Workflow

1. Fork the repository
2. Create feature branch: `git checkout -b feature/new-tutorial`
3. Make changes and test
4. Commit: `git commit -m "Add new tutorial"`
5. Push: `git push origin feature/new-tutorial`
6. Create Pull Request

### Code Standards

- Use TypeScript for all examples
- Follow ESLint configuration
- Add comprehensive error handling
- Include JSDoc comments
- Test all code examples on devnet

### Documentation Standards

- Use clear, concise language
- Include working code examples
- Add troubleshooting sections
- Provide multiple difficulty levels
- Update table of contents

## License

MIT License - see [LICENSE](LICENSE) file for details.

---

*Last updated: August 2025*