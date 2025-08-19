# 💧 Liquidity Provision Tutorial

Learn how to provide liquidity to Saros AMM pools and earn trading fees.

## Overview

This tutorial covers:
- Understanding liquidity pools and LP tokens
- Adding liquidity to existing pools
- Creating new liquidity pools
- Removing liquidity and claiming fees
- Managing impermanent loss

## Prerequisites

- Saros SDK installed (`@saros-finance/sdk`)
- Tokens for both sides of the pair
- Understanding of AMM mechanics

## Step 1: Pool Discovery

```typescript
import { SarosSDK } from '@saros-finance/sdk';
import { Connection, PublicKey } from '@solana/web3.js';

const sdk = new SarosSDK({
  connection: new Connection('https://api.devnet.solana.com'),
  cluster: 'devnet'
});

// Find available pools
async function discoverPools() {
  try {
    const pools = await sdk.getAllPools();
    
    console.log('🏊 Available Pools:');
    pools.forEach((pool, index) => {
      console.log(`${index + 1}. ${pool.tokenA.symbol}/${pool.tokenB.symbol}`);
      console.log(`   TVL: $${pool.tvl.toLocaleString()}`);
      console.log(`   APR: ${pool.apr}%`);
      console.log(`   Volume 24h: $${pool.volume24h.toLocaleString()}`);
      console.log('');
    });
    
    return pools;
  } catch (error) {
    console.error('❌ Failed to fetch pools:', error);
    throw error;
  }
}
```

## Step 2: Pool Information

```typescript
async function getPoolInfo(tokenA: PublicKey, tokenB: PublicKey) {
  try {
    const pool = await sdk.getPool(tokenA, tokenB);
    
    console.log('📊 Pool Information:');
    console.log(`Pair: ${pool.tokenA.symbol}/${pool.tokenB.symbol}`);
    console.log(`Pool Address: ${pool.address.toString()}`);
    console.log(`Reserve A: ${pool.reserveA} ${pool.tokenA.symbol}`);
    console.log(`Reserve B: ${pool.reserveB} ${pool.tokenB.symbol}`);
    console.log(`LP Token Supply: ${pool.lpTokenSupply}`);
    console.log(`Fee Rate: ${pool.feeRate}%`);
    
    return pool;
  } catch (error) {
    console.error('❌ Pool not found:', error);
    return null;
  }
}
```

## Step 3: Calculate Liquidity Requirements

```typescript
interface LiquidityParams {
  tokenA: PublicKey;
  tokenB: PublicKey;
  amountA: number;
  amountB?: number; // Optional - will be calculated if not provided
  slippage: number;
}

async function calculateLiquidityAmounts(params: LiquidityParams) {
  const pool = await sdk.getPool(params.tokenA, params.tokenB);
  
  if (!pool) {
    throw new Error('Pool not found');
  }
  
  // Calculate optimal amounts based on current pool ratio
  const ratio = pool.reserveB / pool.reserveA;
  
  let amountA = params.amountA;
  let amountB = params.amountB || params.amountA * ratio;
  
  // Adjust for pool ratio if both amounts provided
  if (params.amountB) {
    const providedRatio = params.amountB / params.amountA;
    
    if (Math.abs(providedRatio - ratio) > 0.01) {
      console.log('⚠️ Adjusting amounts to match pool ratio');
      
      // Use the limiting amount
      if (providedRatio > ratio) {
        amountB = amountA * ratio;
      } else {
        amountA = amountB / ratio;
      }
    }
  }
  
  // Calculate expected LP tokens
  const lpTokensExpected = Math.min(
    (amountA / pool.reserveA) * pool.lpTokenSupply,
    (amountB / pool.reserveB) * pool.lpTokenSupply
  );
  
  console.log('💧 Liquidity Calculation:');
  console.log(`Amount A: ${amountA} ${pool.tokenA.symbol}`);
  console.log(`Amount B: ${amountB} ${pool.tokenB.symbol}`);
  console.log(`Expected LP Tokens: ${lpTokensExpected}`);
  console.log(`Pool Share: ${(lpTokensExpected / pool.lpTokenSupply * 100).toFixed(4)}%`);
  
  return { amountA, amountB, lpTokensExpected };
}
```

## Step 4: Add Liquidity

```typescript
import { Keypair, sendAndConfirmTransaction } from '@solana/web3.js';

async function addLiquidity(params: LiquidityParams, wallet: Keypair) {
  try {
    // Calculate optimal amounts
    const amounts = await calculateLiquidityAmounts(params);
    
    // Build add liquidity transaction
    const transaction = await sdk.addLiquidity({
      tokenA: params.tokenA,
      tokenB: params.tokenB,
      amountA: amounts.amountA,
      amountB: amounts.amountB,
      minAmountA: amounts.amountA * (1 - params.slippage / 100),
      minAmountB: amounts.amountB * (1 - params.slippage / 100),
      userPublicKey: wallet.publicKey
    });
    
    // Sign and send transaction
    transaction.sign([wallet]);
    
    const signature = await sendAndConfirmTransaction(
      sdk.connection,
      transaction,
      [wallet],
      { commitment: 'confirmed' }
    );
    
    console.log('✅ Liquidity added successfully!');
    console.log(`Transaction: https://explorer.solana.com/tx/${signature}?cluster=devnet`);
    
    return signature;
  } catch (error) {
    console.error('❌ Failed to add liquidity:', error);
    throw error;
  }
}
```

## Step 5: Monitor LP Position

```typescript
async function getLPPosition(userPublicKey: PublicKey, tokenA: PublicKey, tokenB: PublicKey) {
  try {
    const position = await sdk.getLPPosition(userPublicKey, tokenA, tokenB);
    
    if (!position) {
      console.log('No LP position found');
      return null;
    }
    
    console.log('📈 LP Position:');
    console.log(`LP Tokens: ${position.lpTokens}`);
    console.log(`Share of Pool: ${position.poolShare}%`);
    console.log(`Value A: ${position.valueA} ${position.tokenA.symbol}`);
    console.log(`Value B: ${position.valueB} ${position.tokenB.symbol}`);
    console.log(`Total Value: $${position.totalValue}`);
    console.log(`Fees Earned: $${position.feesEarned}`);
    console.log(`Impermanent Loss: ${position.impermanentLoss}%`);
    
    return position;
  } catch (error) {
    console.error('❌ Failed to get LP position:', error);
    throw error;
  }
}
```

## Step 6: Remove Liquidity

```typescript
async function removeLiquidity(
  tokenA: PublicKey,
  tokenB: PublicKey,
  lpTokenAmount: number,
  wallet: Keypair,
  slippage: number = 0.5
) {
  try {
    // Get current position
    const position = await getLPPosition(wallet.publicKey, tokenA, tokenB);
    
    if (!position || position.lpTokens < lpTokenAmount) {
      throw new Error('Insufficient LP tokens');
    }
    
    // Calculate expected amounts
    const shareToRemove = lpTokenAmount / position.lpTokens;
    const expectedA = position.valueA * shareToRemove;
    const expectedB = position.valueB * shareToRemove;
    
    console.log('💧 Removing Liquidity:');
    console.log(`LP Tokens to remove: ${lpTokenAmount}`);
    console.log(`Expected ${position.tokenA.symbol}: ${expectedA}`);
    console.log(`Expected ${position.tokenB.symbol}: ${expectedB}`);
    
    // Build remove liquidity transaction
    const transaction = await sdk.removeLiquidity({
      tokenA,
      tokenB,
      lpTokenAmount,
      minAmountA: expectedA * (1 - slippage / 100),
      minAmountB: expectedB * (1 - slippage / 100),
      userPublicKey: wallet.publicKey
    });
    
    // Sign and send transaction
    transaction.sign([wallet]);
    
    const signature = await sendAndConfirmTransaction(
      sdk.connection,
      transaction,
      [wallet],
      { commitment: 'confirmed' }
    );
    
    console.log('✅ Liquidity removed successfully!');
    console.log(`Transaction: https://explorer.solana.com/tx/${signature}?cluster=devnet`);
    
    return signature;
  } catch (error) {
    console.error('❌ Failed to remove liquidity:', error);
    throw error;
  }
}
```

## Step 7: Complete Liquidity Example

```typescript
async function manageLiquidityPosition() {
  // Setup
  const wallet = Keypair.generate(); // Use your actual wallet
  const connection = new Connection('https://api.devnet.solana.com');
  
  // Airdrop for testing
  await connection.requestAirdrop(wallet.publicKey, 5 * 1e9); // 5 SOL
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  const TOKENS = {
    SOL: new PublicKey('So11111111111111111111111111111111111111112'),
    USDC: new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v')
  };
  
  try {
    // 1. Discover pools
    console.log('🔍 Discovering pools...');
    await discoverPools();
    
    // 2. Get pool info
    console.log('📊 Getting pool information...');
    const pool = await getPoolInfo(TOKENS.SOL, TOKENS.USDC);
    
    if (!pool) {
      console.log('Pool not found, would need to create one');
      return;
    }
    
    // 3. Add liquidity
    console.log('💧 Adding liquidity...');
    const liquidityParams: LiquidityParams = {
      tokenA: TOKENS.SOL,
      tokenB: TOKENS.USDC,
      amountA: 1 * 1e9, // 1 SOL
      slippage: 1.0 // 1%
    };
    
    await addLiquidity(liquidityParams, wallet);
    
    // 4. Monitor position
    console.log('📈 Monitoring position...');
    await new Promise(resolve => setTimeout(resolve, 5000)); // Wait for confirmation
    const position = await getLPPosition(wallet.publicKey, TOKENS.SOL, TOKENS.USDC);
    
    // 5. Remove partial liquidity (50%)
    if (position && position.lpTokens > 0) {
      console.log('💧 Removing partial liquidity...');
      await removeLiquidity(
        TOKENS.SOL,
        TOKENS.USDC,
        position.lpTokens * 0.5, // Remove 50%
        wallet
      );
    }
    
  } catch (error) {
    console.error('❌ Liquidity management failed:', error);
  }
}

// Run the example
manageLiquidityPosition();
```

## Step 8: Advanced Features

### Impermanent Loss Calculator

```typescript
function calculateImpermanentLoss(
  initialPriceRatio: number,
  currentPriceRatio: number
): number {
  const ratio = currentPriceRatio / initialPriceRatio;
  const impermanentLoss = (2 * Math.sqrt(ratio)) / (1 + ratio) - 1;
  return impermanentLoss * 100; // Return as percentage
}

// Example usage
const initialRatio = 50; // 1 SOL = 50 USDC initially
const currentRatio = 75;  // 1 SOL = 75 USDC now
const loss = calculateImpermanentLoss(initialRatio, currentRatio);
console.log(`Impermanent Loss: ${loss.toFixed(2)}%`);
```

### Fee Tracking

```typescript
async function trackFees(userPublicKey: PublicKey, tokenA: PublicKey, tokenB: PublicKey) {
  const position = await getLPPosition(userPublicKey, tokenA, tokenB);
  
  if (!position) return;
  
  // Calculate daily fee earnings
  const pool = await sdk.getPool(tokenA, tokenB);
  const dailyVolume = pool.volume24h;
  const feeRate = pool.feeRate / 100;
  const dailyFees = dailyVolume * feeRate;
  const userDailyFees = dailyFees * (position.poolShare / 100);
  
  console.log('💰 Fee Analysis:');
  console.log(`Daily Volume: $${dailyVolume.toLocaleString()}`);
  console.log(`Your Share: ${position.poolShare}%`);
  console.log(`Daily Fees Earned: $${userDailyFees.toFixed(2)}`);
  console.log(`Annual Fee Yield: ${(userDailyFees * 365 / position.totalValue * 100).toFixed(2)}%`);
}
```

### Auto-Rebalancing

```typescript
async function autoRebalance(
  userPublicKey: PublicKey,
  tokenA: PublicKey,
  tokenB: PublicKey,
  targetRatio: number,
  wallet: Keypair
) {
  const position = await getLPPosition(userPublicKey, tokenA, tokenB);
  const pool = await sdk.getPool(tokenA, tokenB);
  
  if (!position || !pool) return;
  
  const currentRatio = pool.reserveB / pool.reserveA;
  const deviation = Math.abs(currentRatio - targetRatio) / targetRatio;
  
  if (deviation > 0.05) { // 5% deviation threshold
    console.log('⚖️ Rebalancing required');
    
    // Remove liquidity
    await removeLiquidity(tokenA, tokenB, position.lpTokens, wallet);
    
    // Swap to target ratio
    // ... swap logic here ...
    
    // Re-add liquidity
    // ... add liquidity logic here ...
  }
}
```

## Best Practices

### 1. Check Pool Health
```typescript
async function validatePool(tokenA: PublicKey, tokenB: PublicKey) {
  const pool = await sdk.getPool(tokenA, tokenB);
  
  // Check minimum liquidity
  if (pool.tvl < 10000) {
    console.warn('⚠️ Low liquidity pool - high slippage risk');
  }
  
  // Check volume
  if (pool.volume24h < 1000) {
    console.warn('⚠️ Low volume pool - limited fee earnings');
  }
  
  return pool.tvl >= 10000 && pool.volume24h >= 1000;
}
```

### 2. Gradual Position Building
```typescript
async function buildPositionGradually(
  params: LiquidityParams,
  wallet: Keypair,
  steps: number = 3
) {
  const amountPerStep = params.amountA / steps;
  
  for (let i = 0; i < steps; i++) {
    const stepParams = {
      ...params,
      amountA: amountPerStep
    };
    
    await addLiquidity(stepParams, wallet);
    await new Promise(resolve => setTimeout(resolve, 10000)); // Wait between steps
  }
}
```

### 3. Emergency Exit
```typescript
async function emergencyExit(
  userPublicKey: PublicKey,
  tokenA: PublicKey,
  tokenB: PublicKey,
  wallet: Keypair
) {
  const position = await getLPPosition(userPublicKey, tokenA, tokenB);
  
  if (position) {
    // Remove all liquidity with high slippage tolerance
    await removeLiquidity(tokenA, tokenB, position.lpTokens, wallet, 5.0);
  }
}
```

## Testing

```typescript
// Test with small amounts first
const testParams: LiquidityParams = {
  tokenA: TOKENS.SOL,
  tokenB: TOKENS.USDC,
  amountA: 0.01 * 1e9, // 0.01 SOL for testing
  slippage: 2.0 // Higher slippage for testing
};

await addLiquidity(testParams, wallet);
```

## Next Steps

- [Staking Operations Tutorial](./staking-operations.md)
- [DLMM Pool Interactions Tutorial](./dlmm-pools.md)
- [API Reference](../api/core-sdk/amm.md)

---

*Need help? Check the [Troubleshooting Guide](../troubleshooting.md) or join the [Saros Dev Station](https://discord.gg/saros)*