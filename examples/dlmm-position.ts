/**
 * DLMM Position Management Example
 * 
 * This example demonstrates how to create and manage Dynamic Liquidity
 * Market Making (DLMM) positions using the Saros DLMM SDK.
 * 
 * Prerequisites:
 * - npm install @saros-finance/dlmm-sdk @solana/web3.js
 * - Understanding of concentrated liquidity concepts
 */

import { 
  Connection, 
  PublicKey, 
  Keypair,
  sendAndConfirmTransaction,
  LAMPORTS_PER_SOL
} from '@solana/web3.js';
import { SarosDLMM } from '@saros-finance/dlmm-sdk';

// Configuration
const RPC_URL = 'https://api.devnet.solana.com';
const CLUSTER = 'devnet';

// Token addresses (devnet)
const TOKENS = {
  SOL: new PublicKey('So11111111111111111111111111111111111111112'),
  USDC: new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'),
};

interface DLMMPositionParams {
  poolAddress: PublicKey;
  lowerBin: number;
  upperBin: number;
  amountX: number;
  amountY: number;
  distributionType: 'uniform' | 'curve' | 'spot';
}

class DLMMPositionManager {
  private connection: Connection;
  private dlmm: SarosDLMM;

  constructor() {
    this.connection = new Connection(RPC_URL, 'confirmed');
    this.dlmm = new SarosDLMM({
      connection: this.connection,
      cluster: CLUSTER
    });
  }

  /**
   * Initialize wallet with devnet SOL for testing
   */
  async initializeWallet(): Promise<Keypair> {
    const wallet = Keypair.generate();
    
    console.log('🔑 Generated wallet:', wallet.publicKey.toString());
    console.log('💰 Requesting airdrop...');
    
    const airdropSignature = await this.connection.requestAirdrop(
      wallet.publicKey,
      5 * LAMPORTS_PER_SOL
    );
    
    await this.connection.confirmTransaction(airdropSignature, 'confirmed');
    
    const balance = await this.connection.getBalance(wallet.publicKey);
    console.log(`✅ Airdrop complete. Balance: ${balance / LAMPORTS_PER_SOL} SOL`);
    
    return wallet;
  }

  /**
   * Discover available DLMM pools
   */
  async discoverPools() {
    try {
      console.log('🔍 Discovering DLMM pools...');
      
      const pools = await this.dlmm.getAllPools();
      
      if (pools.length === 0) {
        console.log('No DLMM pools found');
        return [];
      }
      
      console.log('🎯 Available DLMM Pools:');
      pools.forEach((pool, index) => {
        console.log(`${index + 1}. ${pool.tokenX.symbol}/${pool.tokenY.symbol}`);
        console.log(`   Pool: ${pool.address.toString()}`);
        console.log(`   Active Bin: ${pool.activeBin}`);
        console.log(`   Bin Step: ${pool.binStep} bps`);
        console.log(`   TVL: $${pool.tvl.toLocaleString()}`);
        console.log(`   Base Fee: ${pool.baseFeeRate}%`);
        console.log('');
      });
      
      return pools;
    } catch (error) {
      console.error('❌ Failed to discover pools:', error);
      return [];
    }
  }

  /**
   * Analyze a specific DLMM pool
   */
  async analyzePool(poolAddress: PublicKey) {
    try {
      console.log('📊 Analyzing DLMM pool...');
      
      const pool = await this.dlmm.getPool(poolAddress);
      
      console.log('Pool Details:');
      console.log(`  Pair: ${pool.tokenX.symbol}/${pool.tokenY.symbol}`);
      console.log(`  Active Bin: ${pool.activeBin}`);
      console.log(`  Current Price: ${pool.currentPrice}`);
      console.log(`  Bin Step: ${pool.binStep} bps (${pool.binStep / 100}%)`);
      console.log(`  Base Fee: ${pool.baseFeeRate}%`);
      console.log(`  Variable Fee: ${pool.variableFeeRate}%`);
      
      // Get liquidity distribution
      const binData = await this.dlmm.getBinArrays(poolAddress);
      const activeBins = binData.filter(bin => bin.liquidityX > 0 || bin.liquidityY > 0);
      
      console.log(`\n📈 Liquidity Distribution (${activeBins.length} active bins):`);
      activeBins.slice(0, 10).forEach(bin => {
        const price = this.dlmm.binIdToPrice(bin.binId, pool.binStep);
        console.log(`  Bin ${bin.binId} (Price: ${price.toFixed(6)}): X=${bin.liquidityX}, Y=${bin.liquidityY}`);
      });
      
      return pool;
    } catch (error) {
      console.error('❌ Failed to analyze pool:', error);
      throw error;
    }
  }

  /**
   * Calculate optimal position parameters
   */
  calculatePositionParams(
    activeBin: number,
    binStep: number,
    strategy: 'tight' | 'medium' | 'wide' = 'medium'
  ): { lowerBin: number, upperBin: number } {
    const ranges = {
      tight: 5,   // ±5 bins
      medium: 10, // ±10 bins  
      wide: 20    // ±20 bins
    };
    
    const range = ranges[strategy];
    
    return {
      lowerBin: activeBin - range,
      upperBin: activeBin + range
    };
  }

  /**
   * Create a new DLMM position
   */
  async createPosition(params: DLMMPositionParams, wallet: Keypair) {
    try {
      console.log('🎯 Creating DLMM position...');
      
      // Get pool information
      const pool = await this.dlmm.getPool(params.poolAddress);
      
      console.log('Position Parameters:');
      console.log(`  Pool: ${pool.tokenX.symbol}/${pool.tokenY.symbol}`);
      console.log(`  Range: Bin ${params.lowerBin} to ${params.upperBin}`);
      console.log(`  Amount X: ${params.amountX}`);
      console.log(`  Amount Y: ${params.amountY}`);
      console.log(`  Distribution: ${params.distributionType}`);
      
      // Calculate price range
      const lowerPrice = this.dlmm.binIdToPrice(params.lowerBin, pool.binStep);
      const upperPrice = this.dlmm.binIdToPrice(params.upperBin, pool.binStep);
      console.log(`  Price Range: ${lowerPrice.toFixed(6)} - ${upperPrice.toFixed(6)}`);
      
      // Calculate liquidity distribution
      const distribution = await this.dlmm.calculateLiquidityDistribution({
        lowerBin: params.lowerBin,
        upperBin: params.upperBin,
        amountX: params.amountX,
        amountY: params.amountY,
        distributionType: params.distributionType,
        activeBin: pool.activeBin
      });
      
      console.log(`  Bins to populate: ${distribution.length}`);
      
      // Build transaction
      const transaction = await this.dlmm.createPosition({
        poolAddress: params.poolAddress,
        lowerBin: params.lowerBin,
        upperBin: params.upperBin,
        liquidityDistribution: distribution,
        userPublicKey: wallet.publicKey
      });
      
      // Sign and send
      transaction.sign([wallet]);
      
      const signature = await sendAndConfirmTransaction(
        this.connection,
        transaction,
        [wallet],
        { commitment: 'confirmed' }
      );
      
      console.log('✅ DLMM position created successfully!');
      console.log(`🔗 Transaction: https://explorer.solana.com/tx/${signature}?cluster=devnet`);
      
      return signature;
    } catch (error) {
      console.error('❌ Failed to create position:', error);
      throw error;
    }
  }

  /**
   * Get user's DLMM positions
   */
  async getUserPositions(userPublicKey: PublicKey, poolAddress?: PublicKey) {
    try {
      console.log('📊 Fetching user positions...');
      
      const positions = poolAddress 
        ? await this.dlmm.getUserPositions(userPublicKey, poolAddress)
        : await this.dlmm.getAllUserPositions(userPublicKey);
      
      if (positions.length === 0) {
        console.log('No DLMM positions found');
        return [];
      }
      
      console.log(`Found ${positions.length} position(s):`);
      
      positions.forEach((position, index) => {
        console.log(`\n🎯 Position ${index + 1}:`);
        console.log(`  Address: ${position.address.toString()}`);
        console.log(`  Pool: ${position.poolAddress.toString()}`);
        console.log(`  Range: Bin ${position.lowerBin} to ${position.upperBin}`);
        console.log(`  Liquidity X: ${position.liquidityX}`);
        console.log(`  Liquidity Y: ${position.liquidityY}`);
        console.log(`  Fees X: ${position.feesX}`);
        console.log(`  Fees Y: ${position.feesY}`);
        console.log(`  Total Value: $${position.totalValue.toFixed(2)}`);
        console.log(`  In Range: ${position.inRange ? '✅' : '❌'}`);
        
        // Show bin distribution
        const activeBins = Object.keys(position.binLiquidity).length;
        console.log(`  Active Bins: ${activeBins}`);
      });
      
      return positions;
    } catch (error) {
      console.error('❌ Failed to get positions:', error);
      return [];
    }
  }

  /**
   * Add liquidity to existing position
   */
  async addLiquidity(
    positionAddress: PublicKey,
    amountX: number,
    amountY: number,
    wallet: Keypair
  ) {
    try {
      console.log('💧 Adding liquidity to position...');
      
      const position = await this.dlmm.getPosition(positionAddress);
      
      console.log(`Adding ${amountX} X tokens and ${amountY} Y tokens`);
      
      // Calculate additional liquidity distribution
      const additionalLiquidity = await this.dlmm.calculateAdditionalLiquidity({
        position,
        amountX,
        amountY
      });
      
      // Build transaction
      const transaction = await this.dlmm.addLiquidity({
        positionAddress,
        liquidityDistribution: additionalLiquidity,
        userPublicKey: wallet.publicKey
      });
      
      transaction.sign([wallet]);
      
      const signature = await sendAndConfirmTransaction(
        this.connection,
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

  /**
   * Remove liquidity from position
   */
  async removeLiquidity(
    positionAddress: PublicKey,
    binIds: number[],
    percentageToRemove: number,
    wallet: Keypair
  ) {
    try {
      console.log('💧 Removing liquidity from position...');
      
      const position = await this.dlmm.getPosition(positionAddress);
      
      console.log(`Removing ${percentageToRemove}% from ${binIds.length} bins`);
      
      // Calculate liquidity to remove
      const liquidityToRemove = binIds.map(binId => {
        const binLiquidity = position.binLiquidity[binId];
        return {
          binId,
          liquidityX: (binLiquidity?.liquidityX || 0) * (percentageToRemove / 100),
          liquidityY: (binLiquidity?.liquidityY || 0) * (percentageToRemove / 100)
        };
      });
      
      // Build transaction
      const transaction = await this.dlmm.removeLiquidity({
        positionAddress,
        liquidityToRemove,
        userPublicKey: wallet.publicKey
      });
      
      transaction.sign([wallet]);
      
      const signature = await sendAndConfirmTransaction(
        this.connection,
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

  /**
   * Claim accumulated fees
   */
  async claimFees(positionAddress: PublicKey, wallet: Keypair) {
    try {
      console.log('💰 Claiming fees...');
      
      const position = await this.dlmm.getPosition(positionAddress);
      
      console.log('Claimable Fees:');
      console.log(`  Token X: ${position.feesX}`);
      console.log(`  Token Y: ${position.feesY}`);
      console.log(`  Total Value: $${position.feesValue.toFixed(2)}`);
      
      if (position.feesX === 0 && position.feesY === 0) {
        console.log('No fees to claim');
        return null;
      }
      
      // Build transaction
      const transaction = await this.dlmm.claimFees({
        positionAddress,
        userPublicKey: wallet.publicKey
      });
      
      transaction.sign([wallet]);
      
      const signature = await sendAndConfirmTransaction(
        this.connection,
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

  /**
   * Monitor position health and performance
   */
  async monitorPosition(positionAddress: PublicKey) {
    try {
      const position = await this.dlmm.getPosition(positionAddress);
      const pool = await this.dlmm.getPool(position.poolAddress);
      
      console.log('📊 Position Health Check:');
      console.log(`  Position: ${positionAddress.toString()}`);
      console.log(`  In Range: ${position.inRange ? '✅' : '❌'}`);
      console.log(`  Current Bin: ${pool.activeBin}`);
      console.log(`  Position Range: ${position.lowerBin} - ${position.upperBin}`);
      
      // Calculate distance from active bin
      const centerBin = Math.floor((position.lowerBin + position.upperBin) / 2);
      const distanceFromActive = Math.abs(pool.activeBin - centerBin);
      
      console.log(`  Distance from Center: ${distanceFromActive} bins`);
      
      // Fee analysis
      const feeYield = position.feesValue / position.totalValue * 100;
      console.log(`  Fee Yield: ${feeYield.toFixed(4)}%`);
      
      // Risk assessment
      if (!position.inRange) {
        console.log('⚠️  WARNING: Position is out of range - not earning fees');
      }
      
      if (distanceFromActive > 20) {
        console.log('⚠️  WARNING: Position is far from active trading - consider rebalancing');
      }
      
      if (position.feesValue > position.totalValue * 0.01) {
        console.log('💰 INFO: Significant fees accumulated - consider claiming');
      }
      
      return {
        inRange: position.inRange,
        distanceFromActive,
        feeYield,
        shouldRebalance: distanceFromActive > 20,
        shouldClaimFees: position.feesValue > position.totalValue * 0.01
      };
    } catch (error) {
      console.error('❌ Failed to monitor position:', error);
      throw error;
    }
  }

  /**
   * Complete DLMM position management example
   */
  async runCompleteExample() {
    try {
      console.log('🚀 Starting DLMM Position Management Example');
      console.log('=' .repeat(50));
      
      // 1. Initialize wallet
      const wallet = await this.initializeWallet();
      
      // 2. Discover pools
      const pools = await this.discoverPools();
      if (pools.length === 0) {
        console.log('No pools available for testing');
        return;
      }
      
      // 3. Select and analyze pool
      const selectedPool = pools[0];
      console.log(`\n🎯 Selected pool: ${selectedPool.tokenX.symbol}/${selectedPool.tokenY.symbol}`);
      
      const pool = await this.analyzePool(selectedPool.address);
      
      // 4. Calculate position parameters
      const positionRange = this.calculatePositionParams(pool.activeBin, pool.binStep, 'medium');
      
      // 5. Create position
      const positionParams: DLMMPositionParams = {
        poolAddress: selectedPool.address,
        lowerBin: positionRange.lowerBin,
        upperBin: positionRange.upperBin,
        amountX: 1 * 1e9, // 1 token X
        amountY: 0,       // Let SDK calculate Y amount
        distributionType: 'curve'
      };
      
      await this.createPosition(positionParams, wallet);
      
      // 6. Wait for position creation
      console.log('\n⏳ Waiting for position creation...');
      await new Promise(resolve => setTimeout(resolve, 10000));
      
      // 7. Check positions
      const positions = await this.getUserPositions(wallet.publicKey, selectedPool.address);
      
      if (positions.length > 0) {
        const position = positions[0];
        
        // 8. Monitor position
        console.log('\n📊 Monitoring position...');
        const healthCheck = await this.monitorPosition(position.address);
        
        // 9. Add more liquidity
        console.log('\n💧 Adding more liquidity...');
        await this.addLiquidity(position.address, 0.5 * 1e9, 0, wallet);
        
        // 10. Wait and claim fees (if any)
        await new Promise(resolve => setTimeout(resolve, 5000));
        console.log('\n💰 Attempting to claim fees...');
        await this.claimFees(position.address, wallet);
        
        // 11. Remove partial liquidity
        console.log('\n💧 Removing partial liquidity...');
        const activeBins = Object.keys(position.binLiquidity)
          .map(Number)
          .filter(binId => {
            const bin = position.binLiquidity[binId];
            return bin && (bin.liquidityX > 0 || bin.liquidityY > 0);
          });
        
        if (activeBins.length > 0) {
          await this.removeLiquidity(
            position.address,
            activeBins.slice(0, Math.min(3, activeBins.length)),
            25, // Remove 25%
            wallet
          );
        }
        
        // 12. Final position check
        console.log('\n📊 Final position status...');
        await this.getUserPositions(wallet.publicKey, selectedPool.address);
      }
      
      console.log('\n✅ DLMM Position Management Example completed successfully!');
      
    } catch (error) {
      console.error('❌ Example failed:', error);
    }
  }
}

// Advanced strategies
class DLMMStrategies extends DLMMPositionManager {
  /**
   * Auto-rebalancing strategy
   */
  async autoRebalance(
    positionAddress: PublicKey,
    wallet: Keypair,
    rebalanceThreshold: number = 10
  ) {
    const position = await this.dlmm.getPosition(positionAddress);
    const pool = await this.dlmm.getPool(position.poolAddress);
    
    const centerBin = Math.floor((position.lowerBin + position.upperBin) / 2);
    const distanceFromActive = Math.abs(pool.activeBin - centerBin);
    
    if (distanceFromActive > rebalanceThreshold) {
      console.log('🔄 Auto-rebalancing triggered...');
      
      // Remove all liquidity
      const allBins = Object.keys(position.binLiquidity).map(Number);
      await this.removeLiquidity(positionAddress, allBins, 100, wallet);
      
      // Create new position around current active bin
      const newRange = this.calculatePositionParams(pool.activeBin, pool.binStep, 'medium');
      const newParams: DLMMPositionParams = {
        poolAddress: position.poolAddress,
        lowerBin: newRange.lowerBin,
        upperBin: newRange.upperBin,
        amountX: position.totalLiquidityX,
        amountY: position.totalLiquidityY,
        distributionType: 'curve'
      };
      
      await this.createPosition(newParams, wallet);
      console.log('✅ Auto-rebalancing completed');
    } else {
      console.log('✅ Position is within acceptable range');
    }
  }

  /**
   * Yield optimization strategy
   */
  async optimizeForYield(poolAddress: PublicKey) {
    const pool = await this.dlmm.getPool(poolAddress);
    const binData = await this.dlmm.getBinArrays(poolAddress);
    
    // Analyze fee generation by bin
    const feeAnalysis = binData
      .filter(bin => bin.volume24h > 0)
      .map(bin => ({
        binId: bin.binId,
        feeRate: bin.feeRate,
        volume: bin.volume24h,
        expectedYield: bin.feeRate * bin.volume24h,
        distanceFromActive: Math.abs(bin.binId - pool.activeBin)
      }))
      .sort((a, b) => b.expectedYield - a.expectedYield);
    
    console.log('💰 Top yielding bins:');
    feeAnalysis.slice(0, 10).forEach((bin, index) => {
      console.log(`${index + 1}. Bin ${bin.binId}: ${bin.expectedYield.toFixed(2)} expected yield (${bin.distanceFromActive} from active)`);
    });
    
    // Return optimal bins for position
    return feeAnalysis.slice(0, 20).map(bin => bin.binId);
  }
}

// Usage examples
async function main() {
  const manager = new DLMMPositionManager();
  await manager.runCompleteExample();
  
  // Advanced strategies example
  console.log('\n' + '='.repeat(50));
  console.log('🧠 Advanced Strategies Example');
  console.log('='.repeat(50));
  
  const strategies = new DLMMStrategies();
  const pools = await strategies.discoverPools();
  
  if (pools.length > 0) {
    await strategies.optimizeForYield(pools[0].address);
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

export { DLMMPositionManager, DLMMStrategies };