/**
 * Basic Token Swap Example
 * 
 * This example demonstrates how to perform a simple token swap
 * using the Saros SDK. Tested on Solana devnet.
 * 
 * Prerequisites:
 * - npm install @saros-finance/sdk @solana/web3.js
 * - Solana wallet with devnet SOL
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
  USDT: new PublicKey('Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB')
};

class BasicSwapExample {
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
    
    // Request airdrop
    const airdropSignature = await this.connection.requestAirdrop(
      wallet.publicKey,
      2 * LAMPORTS_PER_SOL
    );
    
    // Wait for airdrop confirmation
    await this.connection.confirmTransaction(airdropSignature, 'confirmed');
    
    const balance = await this.connection.getBalance(wallet.publicKey);
    console.log(`✅ Airdrop complete. Balance: ${balance / LAMPORTS_PER_SOL} SOL`);
    
    return wallet;
  }

  /**
   * Get swap quote for given parameters
   */
  async getSwapQuote(
    inputMint: PublicKey,
    outputMint: PublicKey,
    amount: number,
    slippageBps: number = 50 // 0.5%
  ) {
    try {
      console.log('📊 Getting swap quote...');
      
      const quote = await this.sdk.getSwapQuote({
        inputMint,
        outputMint,
        amount,
        slippageBps
      });

      console.log('Quote Details:');
      console.log(`  Input: ${quote.inAmount} tokens`);
      console.log(`  Output: ${quote.outAmount} tokens`);
      console.log(`  Price Impact: ${quote.priceImpactPct}%`);
      console.log(`  Route: ${quote.routePlan.map(r => r.swapInfo.label).join(' → ')}`);
      
      return quote;
    } catch (error) {
      console.error('❌ Failed to get quote:', error);
      throw error;
    }
  }

  /**
   * Execute token swap
   */
  async executeSwap(
    inputMint: PublicKey,
    outputMint: PublicKey,
    amount: number,
    wallet: Keypair,
    slippageBps: number = 50
  ) {
    try {
      // Get quote first
      const quote = await this.getSwapQuote(inputMint, outputMint, amount, slippageBps);
      
      // Validate quote
      if (quote.priceImpactPct > 5) {
        console.warn('⚠️ High price impact detected:', quote.priceImpactPct + '%');
        console.log('Consider reducing swap amount or increasing slippage');
      }

      console.log('🔄 Building swap transaction...');
      
      // Build swap transaction
      const swapTransaction = await this.sdk.swap({
        quote,
        userPublicKey: wallet.publicKey,
        wrapUnwrapSOL: true // Automatically handle SOL wrapping
      });

      // Sign transaction
      swapTransaction.sign([wallet]);
      
      console.log('📤 Sending transaction...');
      
      // Send and confirm transaction
      const signature = await sendAndConfirmTransaction(
        this.connection,
        swapTransaction,
        [wallet],
        { 
          commitment: 'confirmed',
          maxRetries: 3
        }
      );

      console.log('✅ Swap successful!');
      console.log(`🔗 Transaction: https://explorer.solana.com/tx/${signature}?cluster=devnet`);
      
      return signature;
    } catch (error) {
      console.error('❌ Swap failed:', error);
      throw error;
    }
  }

  /**
   * Check wallet balances
   */
  async checkBalances(wallet: Keypair) {
    try {
      console.log('💰 Checking balances...');
      
      // SOL balance
      const solBalance = await this.connection.getBalance(wallet.publicKey);
      console.log(`SOL: ${solBalance / LAMPORTS_PER_SOL}`);
      
      // Token balances (if accounts exist)
      const tokenAccounts = await this.connection.getTokenAccountsByOwner(
        wallet.publicKey,
        { programId: new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA') }
      );
      
      for (const account of tokenAccounts.value) {
        const accountInfo = await this.connection.getTokenAccountBalance(account.pubkey);
        if (accountInfo.value.uiAmount && accountInfo.value.uiAmount > 0) {
          console.log(`Token: ${accountInfo.value.uiAmount} (${account.pubkey.toString()})`);
        }
      }
    } catch (error) {
      console.error('❌ Failed to check balances:', error);
    }
  }

  /**
   * Run complete swap example
   */
  async runExample() {
    try {
      console.log('🚀 Starting Basic Swap Example');
      console.log('================================');
      
      // 1. Initialize wallet
      const wallet = await this.initializeWallet();
      
      // 2. Check initial balances
      console.log('\n📊 Initial Balances:');
      await this.checkBalances(wallet);
      
      // 3. Perform swap: SOL → USDC
      console.log('\n🔄 Performing SOL → USDC swap...');
      const swapAmount = 0.1 * LAMPORTS_PER_SOL; // 0.1 SOL
      
      await this.executeSwap(
        TOKENS.SOL,
        TOKENS.USDC,
        swapAmount,
        wallet,
        100 // 1% slippage for testing
      );
      
      // 4. Wait for settlement
      console.log('\n⏳ Waiting for settlement...');
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      // 5. Check final balances
      console.log('\n📊 Final Balances:');
      await this.checkBalances(wallet);
      
      console.log('\n✅ Example completed successfully!');
      
    } catch (error) {
      console.error('❌ Example failed:', error);
    }
  }
}

// Advanced swap with retry logic
class AdvancedSwapExample extends BasicSwapExample {
  /**
   * Execute swap with retry logic and better error handling
   */
  async executeSwapWithRetry(
    inputMint: PublicKey,
    outputMint: PublicKey,
    amount: number,
    wallet: Keypair,
    maxRetries: number = 3
  ) {
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`🔄 Swap attempt ${attempt}/${maxRetries}`);
        
        // Increase slippage on retries
        const slippageBps = 50 + (attempt - 1) * 25; // 0.5%, 0.75%, 1%
        
        return await this.executeSwap(inputMint, outputMint, amount, wallet, slippageBps);
        
      } catch (error) {
        lastError = error as Error;
        console.log(`❌ Attempt ${attempt} failed:`, error.message);
        
        if (attempt < maxRetries) {
          console.log(`⏳ Waiting before retry...`);
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
    }
    
    throw new Error(`All ${maxRetries} attempts failed. Last error: ${lastError?.message}`);
  }

  /**
   * Multi-hop swap example (SOL → USDC → USDT)
   */
  async multiHopSwapExample(wallet: Keypair) {
    try {
      console.log('🔄 Multi-hop swap: SOL → USDC → USDT');
      
      const swapAmount = 0.05 * LAMPORTS_PER_SOL; // 0.05 SOL
      
      // First hop: SOL → USDC
      console.log('\n1️⃣ First hop: SOL → USDC');
      await this.executeSwapWithRetry(TOKENS.SOL, TOKENS.USDC, swapAmount, wallet);
      
      // Wait for settlement
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Get USDC balance for second hop
      const tokenAccounts = await this.connection.getTokenAccountsByOwner(
        wallet.publicKey,
        { mint: TOKENS.USDC }
      );
      
      if (tokenAccounts.value.length === 0) {
        throw new Error('No USDC token account found');
      }
      
      const usdcBalance = await this.connection.getTokenAccountBalance(
        tokenAccounts.value[0].pubkey
      );
      
      const usdcAmount = usdcBalance.value.amount;
      console.log(`💰 USDC received: ${usdcBalance.value.uiAmount}`);
      
      // Second hop: USDC → USDT
      console.log('\n2️⃣ Second hop: USDC → USDT');
      await this.executeSwapWithRetry(TOKENS.USDC, TOKENS.USDT, parseInt(usdcAmount), wallet);
      
      console.log('✅ Multi-hop swap completed!');
      
    } catch (error) {
      console.error('❌ Multi-hop swap failed:', error);
    }
  }
}

// Usage examples
async function main() {
  // Basic swap example
  const basicExample = new BasicSwapExample();
  await basicExample.runExample();
  
  // Advanced swap example
  console.log('\n' + '='.repeat(50));
  console.log('🚀 Advanced Swap Example');
  console.log('='.repeat(50));
  
  const advancedExample = new AdvancedSwapExample();
  const wallet = await advancedExample.initializeWallet();
  await advancedExample.multiHopSwapExample(wallet);
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

export { BasicSwapExample, AdvancedSwapExample };