# 🚀 Saros SDK Developer Guide

**Complete documentation for building with Saros Finance SDKs**

*Submission for Saros SDK Guide Challenge - Superteam Earn Bounty*

---

## 📋 Table of Contents

- [🚀 Quick Start Guide](#-quick-start-guide)
- [📖 Integration Tutorials](#-integration-tutorials)
- [💻 Code Examples](#-code-examples)
- [📚 API Reference](#-api-reference)
- [🔧 Troubleshooting](#-troubleshooting)
- [🆚 SDK Comparison](#-sdk-comparison)

---

## 🎯 What's Inside

This documentation covers all three Saros Finance SDKs:

| SDK | Language | Purpose | Documentation |
|-----|----------|---------|---------------|
| `@saros-finance/sdk` | TypeScript | AMM, Staking, Farming | [View Docs](./docs/core-sdk/) |
| `@saros-finance/dlmm-sdk` | TypeScript | Dynamic Liquidity Market Making | [View Docs](./docs/dlmm-sdk/) |
| `saros-dlmm-sdk-rs` | Rust | DLMM Operations | [View Docs](./docs/rust-sdk/) |

---

## 🚀 Quick Start Guide

### Prerequisites

- **Node.js 16+** (for TypeScript SDKs)
- **Rust 1.70+** (for Rust SDK)
- **Solana CLI** tools installed
- Basic knowledge of Solana development

### Installation

#### TypeScript SDKs
```bash
# Core SDK (AMM, Stake, Farm)
npm install @saros-finance/sdk @solana/web3.js

# DLMM SDK
npm install @saros-finance/dlmm-sdk @solana/web3.js
```

#### Rust SDK
```toml
[dependencies]
saros-dlmm-sdk-rs = "0.1.0"
solana-sdk = "1.16"
tokio = { version = "1.0", features = ["full"] }
```

### Basic Setup

#### TypeScript Setup
```typescript
import { Connection, PublicKey } from '@solana/web3.js';
import { SarosSDK } from '@saros-finance/sdk';

// Initialize connection (devnet for testing)
const connection = new Connection('https://api.devnet.solana.com');

// Initialize SDK
const sdk = new SarosSDK({
  connection,
  cluster: 'devnet'
});

console.log('✅ Saros SDK initialized successfully!');
```

#### Rust Setup
```rust
use saros_dlmm_sdk_rs::SarosDLMM;
use solana_sdk::pubkey::Pubkey;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let rpc_url = "https://api.devnet.solana.com";
    let dlmm = SarosDLMM::new(rpc_url).await?;
    
    println!("✅ Saros DLMM SDK initialized successfully!");
    Ok(())
}
```

### Your First Transaction

```typescript
import { SarosSDK } from '@saros-finance/sdk';
import { Connection, PublicKey } from '@solana/web3.js';

async function performSwap() {
  const sdk = new SarosSDK({
    connection: new Connection('https://api.devnet.solana.com'),
    cluster: 'devnet'
  });

  // Define swap parameters
  const swapParams = {
    inputMint: new PublicKey('So11111111111111111111111111111111111111112'), // SOL
    outputMint: new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'), // USDC
    amount: 1000000, // 0.001 SOL
    slippage: 0.5 // 0.5%
  };

  try {
    const transaction = await sdk.swap(swapParams);
    console.log('🎉 Swap transaction created:', transaction);
  } catch (error) {
    console.error('❌ Swap failed:', error);
  }
}

performSwap();
```

---

## 📖 Integration Tutorials

### 1. [Token Swapping Tutorial](./docs/tutorials/token-swapping.md)
Learn how to implement token swaps using the Saros AMM

### 2. [Liquidity Provision Tutorial](./docs/tutorials/liquidity-provision.md)
Step-by-step guide to providing liquidity and earning fees

### 3. [Staking Operations Tutorial](./docs/tutorials/staking-operations.md)
Complete guide to staking tokens and managing rewards

### 4. [DLMM Pool Interactions Tutorial](./docs/tutorials/dlmm-pools.md)
Advanced tutorial on Dynamic Liquidity Market Making

---

## 💻 Code Examples

### Working Examples (Tested on Devnet)

1. **[Basic Token Swap](./examples/basic-swap.ts)** - Simple SOL to USDC swap
2. **[Liquidity Pool Management](./examples/liquidity-pool.ts)** - Add/remove liquidity
3. **[Staking Rewards](./examples/staking-rewards.ts)** - Stake tokens and claim rewards
4. **[DLMM Position Management](./examples/dlmm-position.ts)** - Create and manage DLMM positions
5. **[Farm Operations](./examples/farm-operations.ts)** - Deposit/withdraw from farms

---

## 📚 API Reference

### Core SDK (`@saros-finance/sdk`)
- [AMM Methods](./docs/api/core-sdk/amm.md)
- [Staking Methods](./docs/api/core-sdk/staking.md)
- [Farm Methods](./docs/api/core-sdk/farming.md)

### DLMM SDK (`@saros-finance/dlmm-sdk`)
- [Pool Methods](./docs/api/dlmm-sdk/pools.md)
- [Position Methods](./docs/api/dlmm-sdk/positions.md)
- [Liquidity Methods](./docs/api/dlmm-sdk/liquidity.md)

### Rust SDK (`saros-dlmm-sdk-rs`)
- [Core Functions](./docs/api/rust-sdk/core.md)
- [Pool Operations](./docs/api/rust-sdk/pools.md)
- [Transaction Building](./docs/api/rust-sdk/transactions.md)

---

## 🔧 Troubleshooting

### Common Issues

#### Connection Issues
```typescript
// ❌ Wrong
const connection = new Connection('https://api.mainnet-beta.solana.com');

// ✅ Correct for testing
const connection = new Connection('https://api.devnet.solana.com');
```

#### Insufficient Balance
```typescript
// Always check balance before transactions
const balance = await connection.getBalance(wallet.publicKey);
if (balance < requiredAmount) {
  throw new Error('Insufficient balance');
}
```

#### Slippage Issues
```typescript
// Increase slippage for volatile markets
const swapParams = {
  // ... other params
  slippage: 1.0 // 1% instead of 0.5%
};
```

### [Complete Troubleshooting Guide](./docs/troubleshooting.md)

---

## 🆚 SDK Comparison

| Feature | Core SDK | DLMM SDK | Rust SDK |
|---------|----------|----------|----------|
| **Language** | TypeScript | TypeScript | Rust |
| **AMM Trading** | ✅ | ❌ | ❌ |
| **DLMM Trading** | ❌ | ✅ | ✅ |
| **Staking** | ✅ | ❌ | ❌ |
| **Farming** | ✅ | ❌ | ❌ |
| **Performance** | Good | Good | Excellent |
| **Bundle Size** | Medium | Small | N/A |

### When to Use Which SDK

- **Core SDK**: General DeFi operations, staking, farming
- **DLMM SDK**: Advanced liquidity management, concentrated liquidity
- **Rust SDK**: High-performance applications, backend services

---

## 🏆 Bounty Submission Details

**Created for**: Saros SDK Guide Challenge  
**Platform**: Superteam Earn  
**Author**: kevin47628  
**Repository**: [saros-sdk-documentation](https://github.com/1234-ad/saros-sdk-documentation)

### Submission Includes:
- ✅ Complete quick-start guide
- ✅ 4+ step-by-step integration tutorials
- ✅ 5+ working code examples (tested on devnet)
- ✅ Comprehensive API references
- ✅ Troubleshooting guide and FAQ
- ✅ SDK comparison guide
- ✅ Visual aids and clear navigation

---

## 📞 Support

- **Saros Dev Station**: [Discord Support Channel]
- **Official Docs**: [Saros Documentation]
- **Issues**: [GitHub Issues](https://github.com/1234-ad/saros-sdk-documentation/issues)

---

*Built with ❤️ for the Saros Finance developer community*