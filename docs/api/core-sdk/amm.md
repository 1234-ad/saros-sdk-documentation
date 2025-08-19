# 🔄 AMM API Reference

Complete API reference for Saros Core SDK AMM (Automated Market Maker) functionality.

## Overview

The AMM module provides methods for:
- Token swapping
- Liquidity pool interactions
- Price discovery
- Route optimization

## Installation

```bash
npm install @saros-finance/sdk @solana/web3.js
```

## Initialization

```typescript
import { SarosSDK } from '@saros-finance/sdk';
import { Connection } from '@solana/web3.js';

const sdk = new SarosSDK({
  connection: new Connection('https://api.devnet.solana.com'),
  cluster: 'devnet'
});
```

---

## Methods

### `getSwapQuote(params)`

Get a quote for a token swap including price impact and routing information.

#### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `inputMint` | `PublicKey` | ✅ | Input token mint address |
| `outputMint` | `PublicKey` | ✅ | Output token mint address |
| `amount` | `number` | ✅ | Input amount in token's smallest unit |
| `slippageBps` | `number` | ❌ | Slippage tolerance in basis points (default: 50) |

#### Returns

```typescript
interface SwapQuote {
  inAmount: number;           // Input amount
  outAmount: number;          // Expected output amount
  priceImpactPct: number;     // Price impact percentage
  routePlan: RouteInfo[];     // Routing information
  marketInfos: MarketInfo[];  // Market details
}

interface RouteInfo {
  swapInfo: {
    label: string;            // DEX/AMM name
    inputMint: PublicKey;     // Input token
    outputMint: PublicKey;    // Output token
    inAmount: number;         // Amount in
    outAmount: number;        // Amount out
    feeAmount: number;        // Fee amount
    feeMint: PublicKey;       // Fee token
  };
  percent: number;            // Percentage of total swap
}
```

#### Example

```typescript
const quote = await sdk.getSwapQuote({
  inputMint: new PublicKey('So11111111111111111111111111111111111111112'), // SOL
  outputMint: new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'), // USDC
  amount: 1000000000, // 1 SOL
  slippageBps: 50     // 0.5%
});

console.log(`Expected output: ${quote.outAmount} USDC`);
console.log(`Price impact: ${quote.priceImpactPct}%`);
```

---

### `swap(params)`

Execute a token swap transaction.

#### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `quote` | `SwapQuote` | ✅ | Quote from `getSwapQuote()` |
| `userPublicKey` | `PublicKey` | ✅ | User's wallet public key |
| `wrapUnwrapSOL` | `boolean` | ❌ | Auto-wrap/unwrap SOL (default: true) |
| `feeAccount` | `PublicKey` | ❌ | Custom fee account |

#### Returns

```typescript
Transaction // Solana transaction ready to sign
```

#### Example

```typescript
const quote = await sdk.getSwapQuote({
  inputMint: SOL_MINT,
  outputMint: USDC_MINT,
  amount: 1000000000
});

const transaction = await sdk.swap({
  quote,
  userPublicKey: wallet.publicKey,
  wrapUnwrapSOL: true
});

transaction.sign([wallet]);
const signature = await connection.sendAndConfirmTransaction(transaction, [wallet]);
```

---

### `getAllPools()`

Retrieve all available liquidity pools.

#### Parameters

None

#### Returns

```typescript
interface Pool {
  address: PublicKey;         // Pool address
  tokenA: TokenInfo;          // Token A information
  tokenB: TokenInfo;          // Token B information
  reserveA: number;           // Token A reserves
  reserveB: number;           // Token B reserves
  lpTokenSupply: number;      // LP token supply
  feeRate: number;            // Fee rate percentage
  tvl: number;                // Total Value Locked (USD)
  volume24h: number;          // 24h trading volume (USD)
  apr: number;                // Annual Percentage Rate
}

interface TokenInfo {
  mint: PublicKey;            // Token mint address
  symbol: string;             // Token symbol
  decimals: number;           // Token decimals
  logoURI?: string;           // Token logo URL
}
```

#### Example

```typescript
const pools = await sdk.getAllPools();

pools.forEach(pool => {
  console.log(`${pool.tokenA.symbol}/${pool.tokenB.symbol}`);
  console.log(`TVL: $${pool.tvl.toLocaleString()}`);
  console.log(`APR: ${pool.apr}%`);
});
```

---

### `getPool(tokenA, tokenB)`

Get information about a specific liquidity pool.

#### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `tokenA` | `PublicKey` | ✅ | First token mint address |
| `tokenB` | `PublicKey` | ✅ | Second token mint address |

#### Returns

```typescript
Pool | null // Pool information or null if not found
```

#### Example

```typescript
const pool = await sdk.getPool(SOL_MINT, USDC_MINT);

if (pool) {
  console.log(`Pool found: ${pool.address.toString()}`);
  console.log(`Reserves: ${pool.reserveA} SOL, ${pool.reserveB} USDC`);
} else {
  console.log('Pool not found');
}
```

---

### `addLiquidity(params)`

Add liquidity to a pool and receive LP tokens.

#### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `tokenA` | `PublicKey` | ✅ | First token mint |
| `tokenB` | `PublicKey` | ✅ | Second token mint |
| `amountA` | `number` | ✅ | Amount of token A |
| `amountB` | `number` | ✅ | Amount of token B |
| `minAmountA` | `number` | ✅ | Minimum amount A (slippage protection) |
| `minAmountB` | `number` | ✅ | Minimum amount B (slippage protection) |
| `userPublicKey` | `PublicKey` | ✅ | User's wallet public key |

#### Returns

```typescript
Transaction // Transaction ready to sign
```

#### Example

```typescript
const transaction = await sdk.addLiquidity({
  tokenA: SOL_MINT,
  tokenB: USDC_MINT,
  amountA: 1000000000,      // 1 SOL
  amountB: 50000000,        // 50 USDC (6 decimals)
  minAmountA: 990000000,    // 0.99 SOL (1% slippage)
  minAmountB: 49500000,     // 49.5 USDC (1% slippage)
  userPublicKey: wallet.publicKey
});

transaction.sign([wallet]);
const signature = await connection.sendAndConfirmTransaction(transaction, [wallet]);
```

---

### `removeLiquidity(params)`

Remove liquidity from a pool and receive underlying tokens.

#### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `tokenA` | `PublicKey` | ✅ | First token mint |
| `tokenB` | `PublicKey` | ✅ | Second token mint |
| `lpTokenAmount` | `number` | ✅ | Amount of LP tokens to burn |
| `minAmountA` | `number` | ✅ | Minimum amount A to receive |
| `minAmountB` | `number` | ✅ | Minimum amount B to receive |
| `userPublicKey` | `PublicKey` | ✅ | User's wallet public key |

#### Returns

```typescript
Transaction // Transaction ready to sign
```

#### Example

```typescript
const transaction = await sdk.removeLiquidity({
  tokenA: SOL_MINT,
  tokenB: USDC_MINT,
  lpTokenAmount: 1000000,   // LP tokens to burn
  minAmountA: 500000000,    // Min 0.5 SOL
  minAmountB: 25000000,     // Min 25 USDC
  userPublicKey: wallet.publicKey
});

transaction.sign([wallet]);
const signature = await connection.sendAndConfirmTransaction(transaction, [wallet]);
```

---

### `getLPPosition(userPublicKey, tokenA, tokenB)`

Get user's liquidity provider position for a specific pool.

#### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `userPublicKey` | `PublicKey` | ✅ | User's wallet public key |
| `tokenA` | `PublicKey` | ✅ | First token mint |
| `tokenB` | `PublicKey` | ✅ | Second token mint |

#### Returns

```typescript
interface LPPosition {
  lpTokens: number;           // LP tokens owned
  poolShare: number;          // Percentage of pool owned
  valueA: number;             // Value in token A
  valueB: number;             // Value in token B
  totalValue: number;         // Total USD value
  feesEarned: number;         // Fees earned (USD)
  impermanentLoss: number;    // Impermanent loss percentage
  tokenA: TokenInfo;          // Token A info
  tokenB: TokenInfo;          // Token B info
}
```

#### Example

```typescript
const position = await sdk.getLPPosition(
  wallet.publicKey,
  SOL_MINT,
  USDC_MINT
);

if (position) {
  console.log(`LP Tokens: ${position.lpTokens}`);
  console.log(`Pool Share: ${position.poolShare}%`);
  console.log(`Total Value: $${position.totalValue}`);
  console.log(`Fees Earned: $${position.feesEarned}`);
  console.log(`Impermanent Loss: ${position.impermanentLoss}%`);
}
```

---

### `getTokenPrice(mint)`

Get current price of a token in USD.

#### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `mint` | `PublicKey` | ✅ | Token mint address |

#### Returns

```typescript
interface TokenPrice {
  mint: PublicKey;            // Token mint
  price: number;              // Price in USD
  symbol: string;             // Token symbol
  lastUpdated: Date;          // Last price update
}
```

#### Example

```typescript
const solPrice = await sdk.getTokenPrice(SOL_MINT);
console.log(`SOL Price: $${solPrice.price}`);
```

---

### `getOptimalRoute(inputMint, outputMint, amount)`

Find the optimal routing path for a swap.

#### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `inputMint` | `PublicKey` | ✅ | Input token mint |
| `outputMint` | `PublicKey` | ✅ | Output token mint |
| `amount` | `number` | ✅ | Input amount |

#### Returns

```typescript
interface OptimalRoute {
  route: PublicKey[];         // Token mints in route order
  expectedOutput: number;     // Expected output amount
  priceImpact: number;        // Total price impact
  fees: number;               // Total fees
  hops: number;               // Number of hops
}
```

#### Example

```typescript
const route = await sdk.getOptimalRoute(
  SOL_MINT,
  new PublicKey('TokenMintAddress'),
  1000000000
);

console.log(`Route: ${route.route.map(mint => mint.toString()).join(' → ')}`);
console.log(`Expected output: ${route.expectedOutput}`);
console.log(`Price impact: ${route.priceImpact}%`);
```

---

## Error Handling

### Common Errors

```typescript
// Insufficient balance
try {
  const transaction = await sdk.swap(params);
} catch (error) {
  if (error.message.includes('insufficient funds')) {
    console.error('Insufficient balance for swap');
  }
}

// High slippage
try {
  const quote = await sdk.getSwapQuote(params);
  if (quote.priceImpactPct > 5) {
    console.warn('High price impact detected');
  }
} catch (error) {
  console.error('Failed to get quote:', error);
}

// Pool not found
const pool = await sdk.getPool(tokenA, tokenB);
if (!pool) {
  console.error('Pool does not exist');
}
```

### Error Types

```typescript
enum SarosError {
  POOL_NOT_FOUND = 'Pool not found',
  INSUFFICIENT_LIQUIDITY = 'Insufficient liquidity',
  SLIPPAGE_EXCEEDED = 'Slippage tolerance exceeded',
  INVALID_TOKEN = 'Invalid token mint',
  NETWORK_ERROR = 'Network connection error'
}
```

---

## Best Practices

### 1. Always Check Quotes First

```typescript
// ✅ Good
const quote = await sdk.getSwapQuote(params);
if (quote.priceImpactPct > 5) {
  // Handle high impact
}
const transaction = await sdk.swap({ quote, ...otherParams });

// ❌ Bad
const transaction = await sdk.swap(params); // No quote check
```

### 2. Handle SOL Wrapping

```typescript
// ✅ Good - Auto-handle SOL wrapping
const transaction = await sdk.swap({
  quote,
  userPublicKey: wallet.publicKey,
  wrapUnwrapSOL: true
});

// ❌ Bad - Manual wrapping required
const transaction = await sdk.swap({
  quote,
  userPublicKey: wallet.publicKey,
  wrapUnwrapSOL: false
});
```

### 3. Set Appropriate Slippage

```typescript
// ✅ Good - Reasonable slippage
const quote = await sdk.getSwapQuote({
  inputMint,
  outputMint,
  amount,
  slippageBps: 50 // 0.5%
});

// ❌ Bad - Too tight slippage
const quote = await sdk.getSwapQuote({
  inputMint,
  outputMint,
  amount,
  slippageBps: 1 // 0.01% - likely to fail
});
```

### 4. Monitor Liquidity Positions

```typescript
// Regular position monitoring
setInterval(async () => {
  const position = await sdk.getLPPosition(wallet.publicKey, tokenA, tokenB);
  
  if (position && position.impermanentLoss > 10) {
    console.warn('High impermanent loss detected');
  }
}, 60000); // Check every minute
```

---

## Rate Limits

- **Quote requests**: 100 per minute
- **Transaction building**: 50 per minute
- **Pool data**: 200 per minute

---

## Support

- [GitHub Issues](https://github.com/saros-finance/sdk/issues)
- [Discord](https://discord.gg/saros)
- [Documentation](https://docs.saros.finance)

---

*Last updated: August 2025*