# 🎯 DLMM Pool Interactions Tutorial

Learn how to interact with Dynamic Liquidity Market Making (DLMM) pools using Saros SDKs.

## Overview

DLMM (Dynamic Liquidity Market Making) is an advanced AMM design that:
- Concentrates liquidity in active price ranges
- Reduces impermanent loss
- Provides better capital efficiency
- Offers dynamic fee structures

This tutorial covers:
- Understanding DLMM mechanics
- Creating and managing positions
- Optimizing liquidity distribution
- Advanced strategies

## Prerequisites

- DLMM SDK installed (`@saros-finance/dlmm-sdk` or `saros-dlmm-sdk-rs`)
- Understanding of concentrated liquidity concepts
- Tokens for position creation

## Step 1: DLMM SDK Setup

### TypeScript Setup

```typescript
import { Connection, PublicKey, Keypair } from '@solana/web3.js';
import { SarosDLMM } from '@saros-finance/dlmm-sdk';

const connection = new Connection('https://api.devnet.solana.com', 'confirmed');

const dlmm = new SarosDLMM({
  connection,
  cluster: 'devnet'
});

console.log('✅ DLMM SDK initialized');
```

### Rust Setup

```rust
use saros_dlmm_sdk_rs::{SarosDLMM, DLMMConfig};
use solana_sdk::pubkey::Pubkey;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let rpc_url = "https://api.devnet.solana.com";
    let config = DLMMConfig::new(rpc_url);
    let dlmm = SarosDLMM::new(config).await?;
    
    println!("✅ DLMM SDK initialized");
    Ok(())
}
```

## Step 2: Discover DLMM Pools

```typescript
async function discoverDLMMPools() {
  try {
    const pools = await dlmm.getAllPools();
    
    console.log('🎯 Available DLMM Pools:');
    pools.forEach((pool, index) => {
      console.log(`${index + 1}. ${pool.tokenX.symbol}/${pool.tokenY.symbol}`);
      console.log(`   Pool Address: ${pool.address.toString()}`);
      console.log(`   Active Bin: ${pool.activeBin}`);
      console.log(`   Bin Step: ${pool.binStep} bps`);
      console.log(`   TVL: $${pool.tvl.toLocaleString()}`);
      console.log(`   24h Volume: $${pool.volume24h.toLocaleString()}`);
      console.log(`   Fee Rate: ${pool.baseFeeRate}% + ${pool.variableFeeRate}% variable`);
      console.log('');
    });
    
    return pools;
  } catch (error) {
    console.error('❌ Failed to fetch DLMM pools:', error);
    throw error;
  }
}
```

## Step 3: Pool Analysis

```typescript
async function analyzeDLMMPool(poolAddress: PublicKey) {
  try {
    const pool = await dlmm.getPool(poolAddress);
    
    console.log('📊 DLMM Pool Analysis:');
    console.log(`Pool: ${pool.tokenX.symbol}/${pool.tokenY.symbol}`);
    console.log(`Active Bin ID: ${pool.activeBin}`);
    console.log(`Current Price: ${pool.currentPrice}`);
    console.log(`Bin Step: ${pool.binStep} bps (${pool.binStep / 100}%)`);
    
    // Get bin distribution
    const binData = await dlmm.getBinArrays(poolAddress);
    
    console.log('\n📈 Liquidity Distribution:');
    binData.forEach((bin, index) => {
      if (bin.liquidityX > 0 || bin.liquidityY > 0) {
        console.log(`Bin ${bin.binId}: X=${bin.liquidityX}, Y=${bin.liquidityY}`);
      }
    });
    
    // Calculate price ranges
    const priceRange = dlmm.calculatePriceRange(pool.activeBin, pool.binStep);
    console.log(`\n💰 Active Price Range: ${priceRange.lower} - ${priceRange.upper}`);
    
    return pool;
  } catch (error) {
    console.error('❌ Failed to analyze pool:', error);
    throw error;
  }
}
```

## Step 4: Create DLMM Position

```typescript
interface DLMMPositionParams {
  poolAddress: PublicKey;
  lowerBin: number;
  upperBin: number;
  amountX: number;
  amountY: number;
  distributionType: 'uniform' | 'curve' | 'spot';
}

async function createDLMMPosition(params: DLMMPositionParams, wallet: Keypair) {
  try {
    console.log('🎯 Creating DLMM position...');
    
    // Get pool info
    const pool = await dlmm.getPool(params.poolAddress);
    
    // Calculate bin distribution
    const distribution = await dlmm.calculateLiquidityDistribution({
      lowerBin: params.lowerBin,
      upperBin: params.upperBin,
      amountX: params.amountX,
      amountY: params.amountY,
      distributionType: params.distributionType,
      activeBin: pool.activeBin
    });
    
    console.log('📊 Position Details:');
    console.log(`Range: Bin ${params.lowerBin} to ${params.upperBin}`);
    console.log(`Distribution: ${params.distributionType}`);
    console.log(`Bins to populate: ${distribution.length}`);
    
    // Build position creation transaction
    const transaction = await dlmm.createPosition({
      poolAddress: params.poolAddress,
      lowerBin: params.lowerBin,
      upperBin: params.upperBin,
      liquidityDistribution: distribution,
      userPublicKey: wallet.publicKey
    });
    
    // Sign and send transaction
    transaction.sign([wallet]);
    
    const signature = await dlmm.connection.sendAndConfirmTransaction(
      transaction,
      [wallet],
      { commitment: 'confirmed' }
    );
    
    console.log('✅ DLMM position created!');
    console.log(`🔗 Transaction: https://explorer.solana.com/tx/${signature}?cluster=devnet`);
    
    return signature;
  } catch (error) {
    console.error('❌ Failed to create position:', error);
    throw error;
  }
}
```

## Step 5: Manage Existing Position

```typescript
async function getDLMMPosition(userPublicKey: PublicKey, poolAddress: PublicKey) {
  try {
    const positions = await dlmm.getUserPositions(userPublicKey, poolAddress);
    
    if (positions.length === 0) {
      console.log('No DLMM positions found');
      return null;
    }
    
    console.log('🎯 DLMM Positions:');
    positions.forEach((position, index) => {
      console.log(`\nPosition ${index + 1}:`);
      console.log(`  Address: ${position.address.toString()}`);
      console.log(`  Range: Bin ${position.lowerBin} to ${position.upperBin}`);
      console.log(`  Liquidity X: ${position.liquidityX}`);
      console.log(`  Liquidity Y: ${position.liquidityY}`);
      console.log(`  Fees Earned X: ${position.feesX}`);
      console.log(`  Fees Earned Y: ${position.feesY}`);
      console.log(`  Total Value: $${position.totalValue}`);
      console.log(`  In Range: ${position.inRange ? '✅' : '❌'}`);
    });
    
    return positions;
  } catch (error) {
    console.error('❌ Failed to get positions:', error);
    throw error;
  }
}
```

## Step 6: Add Liquidity to Existing Position

```typescript
async function addLiquidityToPosition(
  positionAddress: PublicKey,
  amountX: number,
  amountY: number,
  wallet: Keypair
) {
  try {
    console.log('💧 Adding liquidity to position...');
    
    // Get position info
    const position = await dlmm.getPosition(positionAddress);
    
    // Calculate additional liquidity distribution
    const additionalLiquidity = await dlmm.calculateAdditionalLiquidity({
      position,
      amountX,
      amountY
    });
    
    console.log(`Adding ${amountX} X tokens and ${amountY} Y tokens`);
    
    // Build add liquidity transaction
    const transaction = await dlmm.addLiquidity({
      positionAddress,
      liquidityDistribution: additionalLiquidity,
      userPublicKey: wallet.publicKey
    });
    
    // Sign and send transaction
    transaction.sign([wallet]);
    
    const signature = await dlmm.connection.sendAndConfirmTransaction(
      transaction,
      [wallet],
      { commitment: 'confirmed' }
    );
    
    console.log('✅ Liquidity added successfully!');
    console.log(`🔗 Transaction: https://explorer.solana.com/tx/${signature}?cluster=devnet`);
    
    return signature;
  } catch (error) {
    console.error('❌ Failed to add liquidity:', error);
    throw error;
  }
}
```

## Step 7: Remove Liquidity

```typescript
async function removeLiquidityFromPosition(
  positionAddress: PublicKey,
  binIds: number[], // Specific bins to remove from
  percentageToRemove: number, // 0-100
  wallet: Keypair
) {
  try {
    console.log('💧 Removing liquidity from position...');
    
    // Get position info
    const position = await dlmm.getPosition(positionAddress);
    
    // Calculate liquidity to remove
    const liquidityToRemove = binIds.map(binId => ({
      binId,
      liquidityX: position.binLiquidity[binId]?.liquidityX * (percentageToRemove / 100) || 0,
      liquidityY: position.binLiquidity[binId]?.liquidityY * (percentageToRemove / 100) || 0
    }));
    
    console.log(`Removing ${percentageToRemove}% from ${binIds.length} bins`);
    
    // Build remove liquidity transaction
    const transaction = await dlmm.removeLiquidity({
      positionAddress,
      liquidityToRemove,
      userPublicKey: wallet.publicKey
    });
    
    // Sign and send transaction
    transaction.sign([wallet]);
    
    const signature = await dlmm.connection.sendAndConfirmTransaction(
      transaction,
      [wallet],
      { commitment: 'confirmed' }
    );
    
    console.log('✅ Liquidity removed successfully!');
    console.log(`🔗 Transaction: https://explorer.solana.com/tx/${signature}?cluster=devnet`);
    
    return signature;
  } catch (error) {
    console.error('❌ Failed to remove liquidity:', error);
    throw error;
  }
}
```

## Step 8: Claim Fees

```typescript
async function claimFees(positionAddress: PublicKey, wallet: Keypair) {
  try {
    console.log('💰 Claiming fees...');
    
    // Get position info
    const position = await dlmm.getPosition(positionAddress);
    
    console.log('📊 Claimable Fees:');
    console.log(`  Token X: ${position.feesX}`);
    console.log(`  Token Y: ${position.feesY}`);
    console.log(`  Total Value: $${position.feesValue}`);
    
    if (position.feesX === 0 && position.feesY === 0) {
      console.log('No fees to claim');
      return null;
    }
    
    // Build claim fees transaction
    const transaction = await dlmm.claimFees({
      positionAddress,
      userPublicKey: wallet.publicKey
    });
    
    // Sign and send transaction
    transaction.sign([wallet]);
    
    const signature = await dlmm.connection.sendAndConfirmTransaction(
      transaction,
      [wallet],
      { commitment: 'confirmed' }
    );
    
    console.log('✅ Fees claimed successfully!');
    console.log(`🔗 Transaction: https://explorer.solana.com/tx/${signature}?cluster=devnet`);
    
    return signature;
  } catch (error) {
    console.error('❌ Failed to claim fees:', error);
    throw error;
  }
}
```

## Step 9: Complete DLMM Example

```typescript
async function completeDLMMExample() {
  // Setup
  const wallet = Keypair.generate();
  const connection = new Connection('https://api.devnet.solana.com');
  
  // Airdrop for testing
  await connection.requestAirdrop(wallet.publicKey, 5 * 1e9);
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  try {
    // 1. Discover pools
    console.log('🔍 Discovering DLMM pools...');
    const pools = await discoverDLMMPools();
    
    if (pools.length === 0) {
      console.log('No DLMM pools found');
      return;
    }
    
    const selectedPool = pools[0];
    console.log(`Selected pool: ${selectedPool.tokenX.symbol}/${selectedPool.tokenY.symbol}`);
    
    // 2. Analyze pool
    console.log('\n📊 Analyzing pool...');
    const pool = await analyzeDLMMPool(selectedPool.address);
    
    // 3. Create position around active bin
    console.log('\n🎯 Creating DLMM position...');
    const positionParams: DLMMPositionParams = {
      poolAddress: selectedPool.address,
      lowerBin: pool.activeBin - 10, // 10 bins below
      upperBin: pool.activeBin + 10,  // 10 bins above
      amountX: 1 * 1e9, // 1 token X
      amountY: 0,       // Let it calculate Y amount
      distributionType: 'curve' // Concentrated around active bin
    };
    
    await createDLMMPosition(positionParams, wallet);
    
    // 4. Wait and check position
    console.log('\n⏳ Waiting for position creation...');
    await new Promise(resolve => setTimeout(resolve, 10000));
    
    const positions = await getDLMMPosition(wallet.publicKey, selectedPool.address);
    
    if (positions && positions.length > 0) {
      const position = positions[0];
      
      // 5. Add more liquidity
      console.log('\n💧 Adding more liquidity...');
      await addLiquidityToPosition(
        position.address,
        0.5 * 1e9, // 0.5 token X
        0,         // Let it calculate Y
        wallet
      );
      
      // 6. Simulate some time passing and claim fees
      console.log('\n💰 Claiming fees...');
      await claimFees(position.address, wallet);
      
      // 7. Remove partial liquidity
      console.log('\n💧 Removing partial liquidity...');
      const activeBins = Object.keys(position.binLiquidity)
        .map(Number)
        .filter(binId => position.binLiquidity[binId].liquidityX > 0 || position.binLiquidity[binId].liquidityY > 0);
      
      await removeLiquidityFromPosition(
        position.address,
        activeBins.slice(0, 3), // Remove from first 3 bins
        50, // Remove 50%
        wallet
      );
    }
    
    console.log('\n✅ DLMM example completed successfully!');
    
  } catch (error) {
    console.error('❌ DLMM example failed:', error);
  }
}

// Run the example
completeDLMMExample();
```

## Step 10: Advanced DLMM Strategies

### Auto-Rebalancing Strategy

```typescript
async function autoRebalanceStrategy(
  positionAddress: PublicKey,
  wallet: Keypair,
  rebalanceThreshold: number = 5 // bins
) {
  const position = await dlmm.getPosition(positionAddress);
  const pool = await dlmm.getPool(position.poolAddress);
  
  // Check if position is out of range
  const distanceFromActive = Math.abs(pool.activeBin - position.centerBin);
  
  if (distanceFromActive > rebalanceThreshold) {
    console.log('🔄 Rebalancing position...');
    
    // Remove all liquidity
    await removeLiquidityFromPosition(
      positionAddress,
      Object.keys(position.binLiquidity).map(Number),
      100,
      wallet
    );
    
    // Create new position around current active bin
    const newParams: DLMMPositionParams = {
      poolAddress: position.poolAddress,
      lowerBin: pool.activeBin - 10,
      upperBin: pool.activeBin + 10,
      amountX: position.totalLiquidityX,
      amountY: position.totalLiquidityY,
      distributionType: 'curve'
    };
    
    await createDLMMPosition(newParams, wallet);
  }
}
```

### Yield Optimization

```typescript
async function optimizeYield(poolAddress: PublicKey) {
  const pool = await dlmm.getPool(poolAddress);
  const binData = await dlmm.getBinArrays(poolAddress);
  
  // Find bins with highest fee generation
  const feeAnalysis = binData.map(bin => ({
    binId: bin.binId,
    feeRate: bin.feeRate,
    volume: bin.volume24h,
    expectedYield: bin.feeRate * bin.volume24h
  })).sort((a, b) => b.expectedYield - a.expectedYield);
  
  console.log('💰 Top yielding bins:');
  feeAnalysis.slice(0, 5).forEach((bin, index) => {
    console.log(`${index + 1}. Bin ${bin.binId}: ${bin.expectedYield.toFixed(2)} expected yield`);
  });
  
  return feeAnalysis.slice(0, 10).map(bin => bin.binId);
}
```

### Risk Management

```typescript
async function calculatePositionRisk(positionAddress: PublicKey) {
  const position = await dlmm.getPosition(positionAddress);
  const pool = await dlmm.getPool(position.poolAddress);
  
  // Calculate concentration risk
  const totalBins = position.upperBin - position.lowerBin + 1;
  const activeBins = Object.keys(position.binLiquidity).length;
  const concentrationRatio = activeBins / totalBins;
  
  // Calculate price risk
  const priceRange = dlmm.calculatePriceRange(position.lowerBin, pool.binStep);
  const currentPrice = pool.currentPrice;
  const priceRisk = Math.abs(currentPrice - priceRange.center) / priceRange.center;
  
  console.log('⚠️ Position Risk Analysis:');
  console.log(`Concentration Risk: ${(concentrationRatio * 100).toFixed(2)}%`);
  console.log(`Price Risk: ${(priceRisk * 100).toFixed(2)}%`);
  console.log(`In Range: ${position.inRange ? '✅' : '❌'}`);
  
  return {
    concentrationRisk: concentrationRatio,
    priceRisk,
    inRange: position.inRange
  };
}
```

## Best Practices

### 1. Optimal Bin Range Selection
```typescript
function calculateOptimalRange(
  currentPrice: number,
  volatility: number,
  timeHorizon: number // days
): { lowerBin: number, upperBin: number } {
  // Wider range for higher volatility
  const rangeMultiplier = 1 + (volatility * timeHorizon / 365);
  
  const lowerPrice = currentPrice * (1 - 0.1 * rangeMultiplier);
  const upperPrice = currentPrice * (1 + 0.1 * rangeMultiplier);
  
  return {
    lowerBin: dlmm.priceToBin(lowerPrice),
    upperBin: dlmm.priceToBin(upperPrice)
  };
}
```

### 2. Gas Optimization
```typescript
// Batch operations when possible
async function batchDLMMOperations(operations: any[], wallet: Keypair) {
  const transaction = new Transaction();
  
  for (const operation of operations) {
    const instruction = await dlmm.buildInstruction(operation);
    transaction.add(instruction);
  }
  
  return await dlmm.connection.sendAndConfirmTransaction(transaction, [wallet]);
}
```

### 3. Monitoring and Alerts
```typescript
async function monitorPosition(positionAddress: PublicKey) {
  const position = await dlmm.getPosition(positionAddress);
  const pool = await dlmm.getPool(position.poolAddress);
  
  // Alert if position goes out of range
  if (!position.inRange) {
    console.log('🚨 ALERT: Position is out of range!');
  }
  
  // Alert if fees accumulate significantly
  if (position.feesValue > position.totalValue * 0.01) { // 1% of position value
    console.log('💰 ALERT: Significant fees accumulated, consider claiming');
  }
}
```

## Next Steps

- [Staking Operations Tutorial](./staking-operations.md)
- [API Reference](../api/dlmm-sdk/pools.md)
- [Rust SDK Documentation](../api/rust-sdk/core.md)

---

*Need help? Check the [Troubleshooting Guide](../troubleshooting.md) or join the [Saros Dev Station](https://discord.gg/saros)*