/**
 * Staking Rewards Example
 * 
 * This example demonstrates how to stake tokens and manage rewards
 * using the Saros Core SDK staking functionality.
 * 
 * Prerequisites:
 * - npm install @saros-finance/sdk @solana/web3.js
 * - Tokens available for staking
 */

import { 
  Connection, 
  PublicKey, 
  Keypair,
  sendAndConfirmTransaction,
  LAMPORTS_PER_SOL
} from '@solana/web3.js';
import { SarosSDK } from '@saros-finance/sdk';

// Configuration
const RPC_URL = 'https://api.devnet.solana.com';
const CLUSTER = 'devnet';

// Token addresses (devnet)
const TOKENS = {
  SOL: new PublicKey('So11111111111111111111111111111111111111112'),
  USDC: new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'),
  SAROS: new PublicKey('SarosTokenMintAddress') // Replace with actual Saros token mint
};

interface StakingPool {
  address: PublicKey;
  stakingToken: PublicKey;
  rewardToken: PublicKey;
  apr: number;
  totalStaked: number;
  rewardRate: number;
  lockupPeriod: number; // in seconds
}

interface StakePosition {
  address: PublicKey;
  amount: number;
  rewardsEarned: number;
  stakedAt: Date;
  unlockAt: Date;
  isActive: boolean;
}

class StakingManager {
  private connection: Connection;
  private sdk: SarosSDK;

  constructor() {
    this.connection = new Connection(RPC_URL, 'confirmed');
    this.sdk = new SarosSDK({
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
      3 * LAMPORTS_PER_SOL
    );
    
    await this.connection.confirmTransaction(airdropSignature, 'confirmed');
    
    const balance = await this.connection.getBalance(wallet.publicKey);
    console.log(`✅ Airdrop complete. Balance: ${balance / LAMPORTS_PER_SOL} SOL`);
    
    return wallet;
  }

  /**
   * Discover available staking pools
   */
  async discoverStakingPools(): Promise<StakingPool[]> {
    try {
      console.log('🔍 Discovering staking pools...');
      
      const pools = await this.sdk.getStakingPools();
      
      if (pools.length === 0) {
        console.log('No staking pools found');
        return [];
      }
      
      console.log('🥩 Available Staking Pools:');
      pools.forEach((pool, index) => {
        console.log(`${index + 1}. Pool: ${pool.address.toString()}`);
        console.log(`   Staking Token: ${pool.stakingToken.toString()}`);
        console.log(`   Reward Token: ${pool.rewardToken.toString()}`);
        console.log(`   APR: ${pool.apr}%`);
        console.log(`   Total Staked: ${pool.totalStaked.toLocaleString()}`);
        console.log(`   Lockup Period: ${pool.lockupPeriod / 86400} days`);
        console.log('');
      });
      
      return pools;
    } catch (error) {
      console.error('❌ Failed to discover staking pools:', error);
      return [];
    }
  }

  /**
   * Get detailed information about a staking pool
   */
  async getPoolInfo(poolAddress: PublicKey): Promise<StakingPool | null> {
    try {
      console.log('📊 Getting pool information...');
      
      const pool = await this.sdk.getStakingPool(poolAddress);
      
      if (!pool) {
        console.log('Pool not found');
        return null;
      }
      
      console.log('Pool Details:');
      console.log(`  Address: ${pool.address.toString()}`);
      console.log(`  Staking Token: ${pool.stakingToken.toString()}`);
      console.log(`  Reward Token: ${pool.rewardToken.toString()}`);
      console.log(`  Current APR: ${pool.apr}%`);
      console.log(`  Total Staked: ${pool.totalStaked.toLocaleString()}`);
      console.log(`  Reward Rate: ${pool.rewardRate} per second`);
      console.log(`  Lockup Period: ${pool.lockupPeriod / 86400} days`);
      
      // Calculate potential rewards
      const dailyReward = pool.rewardRate * 86400; // 24 hours
      const yearlyReward = dailyReward * 365;
      
      console.log(`  Daily Rewards: ${dailyReward} tokens`);
      console.log(`  Yearly Rewards: ${yearlyReward.toLocaleString()} tokens`);
      
      return pool;
    } catch (error) {
      console.error('❌ Failed to get pool info:', error);
      return null;
    }
  }

  /**
   * Stake tokens in a pool
   */
  async stakeTokens(
    poolAddress: PublicKey,
    amount: number,
    wallet: Keypair
  ): Promise<string | null> {
    try {
      console.log('🥩 Staking tokens...');
      
      // Get pool info first
      const pool = await this.getPoolInfo(poolAddress);
      if (!pool) {
        throw new Error('Pool not found');
      }
      
      console.log(`Staking ${amount} tokens in pool ${poolAddress.toString()}`);
      console.log(`Expected APR: ${pool.apr}%`);
      console.log(`Lockup Period: ${pool.lockupPeriod / 86400} days`);
      
      // Check user balance
      const balance = await this.sdk.getTokenBalance(wallet.publicKey, pool.stakingToken);
      if (balance < amount) {
        throw new Error(`Insufficient balance. Have: ${balance}, Need: ${amount}`);
      }
      
      // Build staking transaction
      const transaction = await this.sdk.stake({
        poolAddress,
        amount,
        userPublicKey: wallet.publicKey
      });
      
      // Sign and send transaction
      transaction.sign([wallet]);
      
      const signature = await sendAndConfirmTransaction(
        this.connection,
        transaction,
        [wallet],
        { commitment: 'confirmed' }
      );
      
      console.log('✅ Tokens staked successfully!');
      console.log(`🔗 Transaction: https://explorer.solana.com/tx/${signature}?cluster=devnet`);
      
      return signature;
    } catch (error) {
      console.error('❌ Failed to stake tokens:', error);
      return null;
    }
  }

  /**
   * Get user's staking positions
   */
  async getStakePositions(userPublicKey: PublicKey): Promise<StakePosition[]> {
    try {
      console.log('📊 Fetching stake positions...');
      
      const positions = await this.sdk.getUserStakePositions(userPublicKey);
      
      if (positions.length === 0) {
        console.log('No stake positions found');
        return [];
      }
      
      console.log(`Found ${positions.length} stake position(s):`);
      
      positions.forEach((position, index) => {
        console.log(`\n🥩 Position ${index + 1}:`);
        console.log(`  Address: ${position.address.toString()}`);
        console.log(`  Amount Staked: ${position.amount.toLocaleString()}`);
        console.log(`  Rewards Earned: ${position.rewardsEarned.toLocaleString()}`);
        console.log(`  Staked At: ${position.stakedAt.toISOString()}`);
        console.log(`  Unlocks At: ${position.unlockAt.toISOString()}`);
        console.log(`  Status: ${position.isActive ? '🟢 Active' : '🔴 Inactive'}`);
        
        // Calculate time remaining
        const now = new Date();
        const timeRemaining = position.unlockAt.getTime() - now.getTime();
        
        if (timeRemaining > 0) {
          const daysRemaining = Math.ceil(timeRemaining / (1000 * 60 * 60 * 24));
          console.log(`  Time to Unlock: ${daysRemaining} days`);
        } else {
          console.log(`  Status: ✅ Unlocked - Can withdraw`);
        }
      });
      
      return positions;
    } catch (error) {
      console.error('❌ Failed to get stake positions:', error);
      return [];
    }
  }

  /**
   * Claim staking rewards
   */
  async claimRewards(
    positionAddress: PublicKey,
    wallet: Keypair
  ): Promise<string | null> {
    try {
      console.log('💰 Claiming staking rewards...');
      
      // Get position info
      const position = await this.sdk.getStakePosition(positionAddress);
      
      if (!position) {
        throw new Error('Position not found');
      }
      
      console.log(`Claimable rewards: ${position.rewardsEarned.toLocaleString()}`);
      
      if (position.rewardsEarned === 0) {
        console.log('No rewards to claim');
        return null;
      }
      
      // Build claim transaction
      const transaction = await this.sdk.claimStakeRewards({
        positionAddress,
        userPublicKey: wallet.publicKey
      });
      
      // Sign and send transaction
      transaction.sign([wallet]);
      
      const signature = await sendAndConfirmTransaction(
        this.connection,
        transaction,
        [wallet],
        { commitment: 'confirmed' }
      );
      
      console.log('✅ Rewards claimed successfully!');
      console.log(`🔗 Transaction: https://explorer.solana.com/tx/${signature}?cluster=devnet`);
      
      return signature;
    } catch (error) {
      console.error('❌ Failed to claim rewards:', error);
      return null;
    }
  }

  /**
   * Unstake tokens (if lockup period has passed)
   */
  async unstakeTokens(
    positionAddress: PublicKey,
    amount: number,
    wallet: Keypair
  ): Promise<string | null> {
    try {
      console.log('🔓 Unstaking tokens...');
      
      // Get position info
      const position = await this.sdk.getStakePosition(positionAddress);
      
      if (!position) {
        throw new Error('Position not found');
      }
      
      // Check if lockup period has passed
      const now = new Date();
      if (now < position.unlockAt) {
        const timeRemaining = position.unlockAt.getTime() - now.getTime();
        const daysRemaining = Math.ceil(timeRemaining / (1000 * 60 * 60 * 24));
        throw new Error(`Position is still locked. ${daysRemaining} days remaining.`);
      }
      
      // Check amount
      if (amount > position.amount) {
        throw new Error(`Cannot unstake ${amount}. Position has ${position.amount} staked.`);
      }
      
      console.log(`Unstaking ${amount} tokens from position ${positionAddress.toString()}`);
      
      // Build unstake transaction
      const transaction = await this.sdk.unstake({
        positionAddress,
        amount,
        userPublicKey: wallet.publicKey
      });
      
      // Sign and send transaction
      transaction.sign([wallet]);
      
      const signature = await sendAndConfirmTransaction(
        this.connection,
        transaction,
        [wallet],
        { commitment: 'confirmed' }
      );
      
      console.log('✅ Tokens unstaked successfully!');
      console.log(`🔗 Transaction: https://explorer.solana.com/tx/${signature}?cluster=devnet`);
      
      return signature;
    } catch (error) {
      console.error('❌ Failed to unstake tokens:', error);
      return null;
    }
  }

  /**
   * Calculate potential rewards for a given amount and time period
   */
  calculatePotentialRewards(
    pool: StakingPool,
    stakeAmount: number,
    days: number
  ): { dailyRewards: number; totalRewards: number; finalAmount: number } {
    const dailyRate = pool.apr / 365 / 100; // Daily rate as decimal
    const dailyRewards = stakeAmount * dailyRate;
    const totalRewards = dailyRewards * days;
    const finalAmount = stakeAmount + totalRewards;
    
    console.log('💰 Reward Calculation:');
    console.log(`  Stake Amount: ${stakeAmount.toLocaleString()}`);
    console.log(`  APR: ${pool.apr}%`);
    console.log(`  Time Period: ${days} days`);
    console.log(`  Daily Rewards: ${dailyRewards.toFixed(6)}`);
    console.log(`  Total Rewards: ${totalRewards.toFixed(2)}`);
    console.log(`  Final Amount: ${finalAmount.toFixed(2)}`);
    
    return { dailyRewards, totalRewards, finalAmount };
  }

  /**
   * Monitor staking positions and auto-claim rewards
   */
  async monitorPositions(userPublicKey: PublicKey, wallet: Keypair) {
    console.log('👀 Monitoring staking positions...');
    
    const positions = await this.getStakePositions(userPublicKey);
    
    for (const position of positions) {
      if (!position.isActive) continue;
      
      // Auto-claim if rewards are significant
      if (position.rewardsEarned > 1) { // Claim if > 1 token
        console.log(`💰 Auto-claiming rewards for position ${position.address.toString()}`);
        await this.claimRewards(position.address, wallet);
      }
      
      // Check if position can be unstaked
      const now = new Date();
      if (now >= position.unlockAt) {
        console.log(`🔓 Position ${position.address.toString()} is now unlocked`);
      }
    }
  }

  /**
   * Complete staking example
   */
  async runCompleteExample() {
    try {
      console.log('🚀 Starting Staking Rewards Example');
      console.log('=' .repeat(50));
      
      // 1. Initialize wallet
      const wallet = await this.initializeWallet();
      
      // 2. Discover staking pools
      const pools = await this.discoverStakingPools();
      if (pools.length === 0) {
        console.log('No staking pools available for testing');
        return;
      }
      
      // 3. Select pool with best APR
      const bestPool = pools.reduce((best, current) => 
        current.apr > best.apr ? current : best
      );
      
      console.log(`\n🎯 Selected pool with ${bestPool.apr}% APR`);
      
      // 4. Get detailed pool info
      const poolInfo = await this.getPoolInfo(bestPool.address);
      if (!poolInfo) return;
      
      // 5. Calculate potential rewards
      const stakeAmount = 1000; // 1000 tokens
      const stakingPeriod = 30; // 30 days
      
      console.log('\n💰 Calculating potential rewards...');
      this.calculatePotentialRewards(poolInfo, stakeAmount, stakingPeriod);
      
      // 6. Stake tokens (simulated - would need actual tokens)
      console.log('\n🥩 Simulating token staking...');
      console.log(`Would stake ${stakeAmount} tokens for ${stakingPeriod} days`);
      
      // In real scenario:
      // await this.stakeTokens(bestPool.address, stakeAmount, wallet);
      
      // 7. Check positions
      console.log('\n📊 Checking current positions...');
      const positions = await this.getStakePositions(wallet.publicKey);
      
      // 8. Monitor positions (would run periodically)
      if (positions.length > 0) {
        console.log('\n👀 Monitoring positions...');
        await this.monitorPositions(wallet.publicKey, wallet);
      }
      
      console.log('\n✅ Staking example completed successfully!');
      
    } catch (error) {
      console.error('❌ Staking example failed:', error);
    }
  }
}

// Advanced staking strategies
class StakingStrategies extends StakingManager {
  /**
   * Compound staking strategy - automatically restake rewards
   */
  async compoundStaking(
    positionAddress: PublicKey,
    wallet: Keypair,
    minRewardThreshold: number = 10
  ) {
    try {
      const position = await this.sdk.getStakePosition(positionAddress);
      
      if (position.rewardsEarned >= minRewardThreshold) {
        console.log('🔄 Compounding rewards...');
        
        // Claim rewards
        await this.claimRewards(positionAddress, wallet);
        
        // Wait for claim to settle
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        // Get pool address from position
        const poolAddress = await this.sdk.getPoolFromPosition(positionAddress);
        
        // Restake the claimed rewards
        await this.stakeTokens(poolAddress, position.rewardsEarned, wallet);
        
        console.log('✅ Rewards compounded successfully');
      }
    } catch (error) {
      console.error('❌ Compounding failed:', error);
    }
  }

  /**
   * Diversified staking across multiple pools
   */
  async diversifiedStaking(
    totalAmount: number,
    wallet: Keypair,
    maxPools: number = 3
  ) {
    const pools = await this.discoverStakingPools();
    
    // Sort by APR and select top pools
    const topPools = pools
      .sort((a, b) => b.apr - a.apr)
      .slice(0, maxPools);
    
    const amountPerPool = totalAmount / topPools.length;
    
    console.log(`💼 Diversifying ${totalAmount} tokens across ${topPools.length} pools`);
    
    for (const pool of topPools) {
      console.log(`Staking ${amountPerPool} in pool with ${pool.apr}% APR`);
      await this.stakeTokens(pool.address, amountPerPool, wallet);
      
      // Wait between stakes
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  /**
   * Yield optimization - move stakes to higher APR pools
   */
  async optimizeYield(userPublicKey: PublicKey, wallet: Keypair) {
    const positions = await this.getStakePositions(userPublicKey);
    const pools = await this.discoverStakingPools();
    
    const bestPool = pools.reduce((best, current) => 
      current.apr > best.apr ? current : best
    );
    
    for (const position of positions) {
      // Check if position is unlocked and in a suboptimal pool
      const now = new Date();
      if (now >= position.unlockAt) {
        const currentPool = await this.sdk.getStakingPool(
          await this.sdk.getPoolFromPosition(position.address)
        );
        
        if (currentPool && currentPool.apr < bestPool.apr - 1) { // 1% threshold
          console.log(`🔄 Moving stake from ${currentPool.apr}% to ${bestPool.apr}% APR pool`);
          
          // Unstake from current pool
          await this.unstakeTokens(position.address, position.amount, wallet);
          
          // Wait for unstake to settle
          await new Promise(resolve => setTimeout(resolve, 5000));
          
          // Stake in better pool
          await this.stakeTokens(bestPool.address, position.amount, wallet);
        }
      }
    }
  }
}

// Usage examples
async function main() {
  const manager = new StakingManager();
  await manager.runCompleteExample();
  
  // Advanced strategies example
  console.log('\n' + '='.repeat(50));
  console.log('🧠 Advanced Staking Strategies Example');
  console.log('='.repeat(50));
  
  const strategies = new StakingStrategies();
  const wallet = await strategies.initializeWallet();
  
  // Diversified staking example
  await strategies.diversifiedStaking(3000, wallet, 3);
  
  // Yield optimization example
  await strategies.optimizeYield(wallet.publicKey, wallet);
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

export { StakingManager, StakingStrategies };