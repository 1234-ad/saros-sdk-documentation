# 🔄 Token Swapping Tutorial

Learn how to implement token swaps using the Saros AMM SDK.

## Overview

This tutorial covers:
- Setting up the Saros SDK for swapping
- Finding optimal swap routes
- Executing swaps with proper error handling
- Managing slippage and fees

## Prerequisites

- Saros SDK installed (`@saros-finance/sdk`)
- Solana wallet with devnet SOL
- Basic TypeScript knowledge

## Step 1: Environment Setup

```typescript
import { 
  Connection, 
  PublicKey, 
  Keypair,
  Transaction,
  sendAndConfirmTransaction
} from '@solana/web3.js';
import { SarosSDK } from '@saros-finance/sdk';
import { getAssociatedTokenAddress } from '@solana/spl-token';

// Initialize connection
const connection = new Connection('https://api.devnet.solana.com', 'confirmed');

// Initialize SDK
const sdk = new SarosSDK({
  connection,
  cluster: 'devnet'
});
```

## Step 2: Define Swap Parameters

```typescript
// Common token addresses on devnet
const TOKENS = {
  SOL: new PublicKey('So11111111111111111111111111111111111111112'),
  USDC: new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'),
  USDT: new PublicKey('Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB')
};

interface SwapParams {
  inputMint: PublicKey;
  outputMint: PublicKey;
  amount: number;
  slippage: number;
  userPublicKey: PublicKey;
}
```

## Step 3: Get Swap Quote

```typescript
async function getSwapQuote(params: SwapParams) {
  try {
    const quote = await sdk.getSwapQuote({
      inputMint: params.inputMint,
      outputMint: params.outputMint,
      amount: params.amount,
      slippageBps: params.slippage * 100 // Convert to basis points
    });

    console.log('📊 Swap Quote:');
    console.log(`Input: ${quote.inAmount} tokens`);
    console.log(`Output: ${quote.outAmount} tokens`);
    console.log(`Price Impact: ${quote.priceImpactPct}%`);
    console.log(`Route: ${quote.routePlan.map(r => r.swapInfo.label).join(' → ')}`);

    return quote;
  } catch (error) {
    console.error('❌ Failed to get quote:', error);
    throw error;
  }
}
```

## Step 4: Execute Swap Transaction

```typescript
async function executeSwap(params: SwapParams, wallet: Keypair) {
  try {
    // Get quote first
    const quote = await getSwapQuote(params);

    // Build swap transaction
    const swapTransaction = await sdk.swap({
      quote,
      userPublicKey: wallet.publicKey,
      wrapUnwrapSOL: true // Automatically handle SOL wrapping
    });

    // Sign and send transaction
    swapTransaction.sign([wallet]);
    
    const signature = await sendAndConfirmTransaction(
      connection,
      swapTransaction,
      [wallet],
      { commitment: 'confirmed' }
    );

    console.log('✅ Swap successful!');
    console.log(`Transaction: https://explorer.solana.com/tx/${signature}?cluster=devnet`);
    
    return signature;
  } catch (error) {
    console.error('❌ Swap failed:', error);
    throw error;
  }
}
```

## Step 5: Complete Swap Example

```typescript
async function performTokenSwap() {
  // Load wallet (replace with your wallet loading logic)
  const wallet = Keypair.generate(); // For demo - use your actual wallet
  
  // Airdrop SOL for testing (devnet only)
  await connection.requestAirdrop(wallet.publicKey, 2 * 1e9); // 2 SOL
  await new Promise(resolve => setTimeout(resolve, 2000)); // Wait for airdrop

  const swapParams: SwapParams = {
    inputMint: TOKENS.SOL,
    outputMint: TOKENS.USDC,
    amount: 0.1 * 1e9, // 0.1 SOL
    slippage: 0.5, // 0.5%
    userPublicKey: wallet.publicKey
  };

  try {
    // Check balance before swap
    const balanceBefore = await connection.getBalance(wallet.publicKey);
    console.log(`💰 Balance before: ${balanceBefore / 1e9} SOL`);

    // Execute swap
    const signature = await executeSwap(swapParams, wallet);

    // Check balance after swap
    const balanceAfter = await connection.getBalance(wallet.publicKey);
    console.log(`💰 Balance after: ${balanceAfter / 1e9} SOL`);

    // Check USDC balance
    const usdcTokenAccount = await getAssociatedTokenAddress(
      TOKENS.USDC,
      wallet.publicKey
    );
    
    const usdcBalance = await connection.getTokenAccountBalance(usdcTokenAccount);
    console.log(`💵 USDC received: ${usdcBalance.value.uiAmount} USDC`);

  } catch (error) {
    console.error('❌ Swap operation failed:', error);
  }
}

// Run the swap
performTokenSwap();
```

## Step 6: Advanced Features

### Multi-hop Swaps

```typescript
async function multiHopSwap() {
  const swapParams = {
    inputMint: TOKENS.SOL,
    outputMint: TOKENS.USDT, // SOL → USDC → USDT
    amount: 0.5 * 1e9,
    slippage: 1.0 // Higher slippage for multi-hop
  };

  const quote = await sdk.getSwapQuote(swapParams);
  console.log(`Route hops: ${quote.routePlan.length}`);
}
```

### Price Impact Monitoring

```typescript
async function checkPriceImpact(params: SwapParams) {
  const quote = await getSwapQuote(params);
  
  if (quote.priceImpactPct > 5) {
    console.warn('⚠️ High price impact detected:', quote.priceImpactPct + '%');
    console.log('Consider reducing swap amount or increasing slippage');
  }
  
  return quote.priceImpactPct < 5; // Return true if acceptable
}
```

### Slippage Management

```typescript
function calculateOptimalSlippage(priceImpact: number, volatility: number): number {
  // Base slippage
  let slippage = 0.5;
  
  // Adjust for price impact
  if (priceImpact > 2) slippage += 0.5;
  if (priceImpact > 5) slippage += 1.0;
  
  // Adjust for volatility
  slippage += volatility * 0.1;
  
  // Cap at reasonable maximum
  return Math.min(slippage, 3.0);
}
```

## Error Handling

```typescript
async function safeSwap(params: SwapParams, wallet: Keypair) {
  try {
    // Validate inputs
    if (params.amount <= 0) {
      throw new Error('Amount must be positive');
    }
    
    if (params.slippage < 0.1 || params.slippage > 10) {
      throw new Error('Slippage must be between 0.1% and 10%');
    }

    // Check balance
    const balance = await connection.getBalance(wallet.publicKey);
    if (balance < params.amount + 0.01 * 1e9) { // Reserve for fees
      throw new Error('Insufficient balance for swap + fees');
    }

    // Execute swap with retry logic
    let attempts = 0;
    const maxAttempts = 3;
    
    while (attempts < maxAttempts) {
      try {
        return await executeSwap(params, wallet);
      } catch (error) {
        attempts++;
        if (attempts === maxAttempts) throw error;
        
        console.log(`Retry attempt ${attempts}/${maxAttempts}`);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  } catch (error) {
    console.error('❌ Safe swap failed:', error.message);
    throw error;
  }
}
```

## Best Practices

### 1. Always Check Quotes First
```typescript
// ✅ Good
const quote = await getSwapQuote(params);
if (quote.priceImpactPct > acceptableImpact) {
  // Handle high impact
}

// ❌ Bad
await executeSwap(params, wallet); // No quote check
```

### 2. Handle SOL Wrapping
```typescript
// ✅ Good - SDK handles wrapping
const swapTransaction = await sdk.swap({
  quote,
  userPublicKey: wallet.publicKey,
  wrapUnwrapSOL: true
});

// ❌ Bad - Manual wrapping required
const swapTransaction = await sdk.swap({
  quote,
  userPublicKey: wallet.publicKey,
  wrapUnwrapSOL: false
});
```

### 3. Monitor Transaction Status
```typescript
async function monitorTransaction(signature: string) {
  const confirmation = await connection.confirmTransaction(signature, 'confirmed');
  
  if (confirmation.value.err) {
    throw new Error(`Transaction failed: ${confirmation.value.err}`);
  }
  
  console.log('✅ Transaction confirmed');
  return confirmation;
}
```

## Testing

```typescript
// Test with small amounts first
const testParams = {
  inputMint: TOKENS.SOL,
  outputMint: TOKENS.USDC,
  amount: 0.001 * 1e9, // 0.001 SOL for testing
  slippage: 1.0
};

await performTokenSwap(testParams);
```

## Next Steps

- [Liquidity Provision Tutorial](./liquidity-provision.md)
- [Staking Operations Tutorial](./staking-operations.md)
- [API Reference](../api/core-sdk/amm.md)

---

*Need help? Check the [Troubleshooting Guide](../troubleshooting.md) or join the [Saros Dev Station](https://discord.gg/saros)*