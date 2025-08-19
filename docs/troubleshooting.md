# 🔧 Troubleshooting Guide

Common issues and solutions when working with Saros SDKs.

## Quick Fixes

### Connection Issues

#### Problem: RPC Connection Fails
```
Error: Failed to connect to RPC endpoint
```

**Solutions:**
```typescript
// ✅ Use reliable RPC endpoints
const connection = new Connection('https://api.devnet.solana.com', 'confirmed');

// ✅ Add retry logic
const connection = new Connection('https://api.devnet.solana.com', {
  commitment: 'confirmed',
  confirmTransactionInitialTimeout: 60000
});

// ✅ Try alternative endpoints
const endpoints = [
  'https://api.devnet.solana.com',
  'https://devnet.helius-rpc.com',
  'https://rpc.ankr.com/solana_devnet'
];
```

#### Problem: Transaction Timeout
```
Error: Transaction was not confirmed in 60.00 seconds
```

**Solutions:**
```typescript
// ✅ Increase timeout
const signature = await sendAndConfirmTransaction(
  connection,
  transaction,
  [wallet],
  { 
    commitment: 'confirmed',
    maxRetries: 5,
    skipPreflight: false
  }
);

// ✅ Check transaction status manually
const confirmation = await connection.confirmTransaction(signature, 'confirmed');
```

---

## SDK-Specific Issues

### Core SDK (@saros-finance/sdk)

#### Problem: Swap Quote Fails
```
Error: No route found for swap
```

**Diagnosis:**
```typescript
// Check if tokens exist
const tokenA = await connection.getAccountInfo(inputMint);
const tokenB = await connection.getAccountInfo(outputMint);

if (!tokenA || !tokenB) {
  console.error('Invalid token mint address');
}

// Check if pool exists
const pool = await sdk.getPool(inputMint, outputMint);
if (!pool) {
  console.error('No liquidity pool found');
}
```

**Solutions:**
```typescript
// ✅ Verify token addresses
const TOKENS = {
  SOL: new PublicKey('So11111111111111111111111111111111111111112'),
  USDC: new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v')
};

// ✅ Check available pools first
const pools = await sdk.getAllPools();
console.log('Available pools:', pools.map(p => `${p.tokenA.symbol}/${p.tokenB.symbol}`));

// ✅ Try alternative routing
const route = await sdk.getOptimalRoute(inputMint, outputMint, amount);
```

#### Problem: High Price Impact
```
Warning: Price impact 15.5% exceeds recommended threshold
```

**Solutions:**
```typescript
// ✅ Reduce swap amount
const smallerAmount = amount * 0.5;
const quote = await sdk.getSwapQuote({
  inputMint,
  outputMint,
  amount: smallerAmount,
  slippageBps: 100
});

// ✅ Split into multiple swaps
async function splitSwap(totalAmount: number, parts: number) {
  const amountPerSwap = totalAmount / parts;
  
  for (let i = 0; i < parts; i++) {
    await executeSwap(amountPerSwap);
    await new Promise(resolve => setTimeout(resolve, 5000)); // Wait between swaps
  }
}

// ✅ Increase slippage tolerance
const quote = await sdk.getSwapQuote({
  inputMint,
  outputMint,
  amount,
  slippageBps: 200 // 2% instead of 0.5%
});
```

#### Problem: Insufficient Balance
```
Error: Insufficient funds for transaction
```

**Diagnosis:**
```typescript
// Check SOL balance for fees
const solBalance = await connection.getBalance(wallet.publicKey);
console.log(`SOL balance: ${solBalance / LAMPORTS_PER_SOL}`);

// Check token balance
const tokenAccount = await getAssociatedTokenAddress(tokenMint, wallet.publicKey);
const tokenBalance = await connection.getTokenAccountBalance(tokenAccount);
console.log(`Token balance: ${tokenBalance.value.uiAmount}`);
```

**Solutions:**
```typescript
// ✅ Reserve SOL for fees
const requiredSol = 0.01 * LAMPORTS_PER_SOL; // Reserve 0.01 SOL
if (solBalance < requiredSol) {
  throw new Error('Insufficient SOL for transaction fees');
}

// ✅ Check token account exists
try {
  const tokenAccount = await getAssociatedTokenAddress(tokenMint, wallet.publicKey);
  const accountInfo = await connection.getAccountInfo(tokenAccount);
  
  if (!accountInfo) {
    // Create token account first
    const createAccountTx = new Transaction().add(
      createAssociatedTokenAccountInstruction(
        wallet.publicKey,
        tokenAccount,
        wallet.publicKey,
        tokenMint
      )
    );
  }
} catch (error) {
  console.error('Token account issue:', error);
}
```

### DLMM SDK (@saros-finance/dlmm-sdk)

#### Problem: Position Creation Fails
```
Error: Invalid bin range specified
```

**Solutions:**
```typescript
// ✅ Validate bin range
const pool = await dlmm.getPool(poolAddress);
const maxBinId = pool.activeBin + 1000; // Reasonable upper limit
const minBinId = pool.activeBin - 1000; // Reasonable lower limit

if (lowerBin < minBinId || upperBin > maxBinId) {
  console.error('Bin range too wide');
}

// ✅ Use reasonable ranges
const positionParams = {
  lowerBin: pool.activeBin - 20, // 20 bins below
  upperBin: pool.activeBin + 20, // 20 bins above
  // ... other params
};

// ✅ Check bin step compatibility
const binStep = pool.binStep;
const priceRange = dlmm.calculatePriceRange(lowerBin, binStep);
console.log(`Price range: ${priceRange.lower} - ${priceRange.upper}`);
```

#### Problem: Out of Range Position
```
Warning: Position is out of active trading range
```

**Solutions:**
```typescript
// ✅ Monitor position regularly
async function monitorPosition(positionAddress: PublicKey) {
  const position = await dlmm.getPosition(positionAddress);
  const pool = await dlmm.getPool(position.poolAddress);
  
  if (!position.inRange) {
    console.warn('Position out of range - consider rebalancing');
    
    // Auto-rebalance if needed
    if (shouldRebalance(position, pool)) {
      await rebalancePosition(positionAddress, wallet);
    }
  }
}

// ✅ Set up alerts
function shouldRebalance(position: any, pool: any): boolean {
  const centerBin = (position.lowerBin + position.upperBin) / 2;
  const distanceFromActive = Math.abs(pool.activeBin - centerBin);
  
  return distanceFromActive > 15; // Rebalance if >15 bins away
}
```

### Rust SDK (saros-dlmm-sdk-rs)

#### Problem: Compilation Errors
```
error: failed to resolve dependencies
```

**Solutions:**
```toml
# ✅ Use compatible versions
[dependencies]
saros-dlmm-sdk-rs = "0.1.0"
solana-sdk = "1.16"
tokio = { version = "1.0", features = ["full"] }
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"

# ✅ Add required features
[dependencies.solana-client]
version = "1.16"
features = ["default"]
```

#### Problem: Runtime Panics
```
thread 'main' panicked at 'called `Result::unwrap()` on an `Err` value'
```

**Solutions:**
```rust
// ✅ Proper error handling
match dlmm.get_pool(pool_address).await {
    Ok(pool) => {
        println!("Pool found: {:?}", pool);
    }
    Err(e) => {
        eprintln!("Failed to get pool: {}", e);
        return Err(e);
    }
}

// ✅ Use ? operator
async fn safe_operation() -> Result<(), Box<dyn std::error::Error>> {
    let pool = dlmm.get_pool(pool_address).await?;
    let position = dlmm.create_position(params).await?;
    Ok(())
}
```

---

## Transaction Issues

### Problem: Transaction Fails Silently
```
Transaction sent but no confirmation received
```

**Diagnosis:**
```typescript
// Check transaction status
const signature = 'your_transaction_signature';
const status = await connection.getSignatureStatus(signature);

console.log('Transaction status:', status);

// Get transaction details
const transaction = await connection.getTransaction(signature, {
  commitment: 'confirmed'
});

if (transaction?.meta?.err) {
  console.error('Transaction error:', transaction.meta.err);
}
```

**Solutions:**
```typescript
// ✅ Implement proper confirmation
async function sendAndConfirmWithRetry(
  connection: Connection,
  transaction: Transaction,
  signers: Keypair[],
  maxRetries: number = 3
) {
  let attempt = 0;
  
  while (attempt < maxRetries) {
    try {
      const signature = await sendAndConfirmTransaction(
        connection,
        transaction,
        signers,
        {
          commitment: 'confirmed',
          maxRetries: 5
        }
      );
      
      return signature;
    } catch (error) {
      attempt++;
      console.log(`Attempt ${attempt} failed:`, error.message);
      
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      } else {
        throw error;
      }
    }
  }
}
```

### Problem: Slippage Exceeded
```
Error: Slippage tolerance exceeded
```

**Solutions:**
```typescript
// ✅ Dynamic slippage adjustment
function calculateDynamicSlippage(priceImpact: number, volatility: number): number {
  let slippage = 0.5; // Base 0.5%
  
  // Adjust for price impact
  if (priceImpact > 2) slippage += 0.5;
  if (priceImpact > 5) slippage += 1.0;
  
  // Adjust for volatility
  slippage += volatility * 0.1;
  
  return Math.min(slippage, 5.0); // Cap at 5%
}

// ✅ Retry with higher slippage
async function swapWithRetry(params: SwapParams, maxRetries: number = 3) {
  let slippage = 0.5;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      const quote = await sdk.getSwapQuote({
        ...params,
        slippageBps: slippage * 100
      });
      
      return await sdk.swap({ quote, ...otherParams });
    } catch (error) {
      if (error.message.includes('slippage')) {
        slippage += 0.5; // Increase slippage
        console.log(`Retry with ${slippage}% slippage`);
      } else {
        throw error;
      }
    }
  }
}
```

---

## Performance Issues

### Problem: Slow Quote Fetching
```
Quote requests taking >5 seconds
```

**Solutions:**
```typescript
// ✅ Implement caching
const quoteCache = new Map();

async function getCachedQuote(params: QuoteParams) {
  const key = `${params.inputMint}-${params.outputMint}-${params.amount}`;
  
  if (quoteCache.has(key)) {
    const cached = quoteCache.get(key);
    if (Date.now() - cached.timestamp < 30000) { // 30 second cache
      return cached.quote;
    }
  }
  
  const quote = await sdk.getSwapQuote(params);
  quoteCache.set(key, { quote, timestamp: Date.now() });
  
  return quote;
}

// ✅ Parallel requests
async function getMultipleQuotes(requests: QuoteParams[]) {
  const promises = requests.map(params => sdk.getSwapQuote(params));
  return await Promise.all(promises);
}

// ✅ Request timeout
async function getQuoteWithTimeout(params: QuoteParams, timeout: number = 10000) {
  return Promise.race([
    sdk.getSwapQuote(params),
    new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Quote request timeout')), timeout)
    )
  ]);
}
```

### Problem: High Memory Usage
```
Memory usage increasing over time
```

**Solutions:**
```typescript
// ✅ Clean up connections
process.on('exit', () => {
  connection.close();
});

// ✅ Limit concurrent operations
const semaphore = new Semaphore(5); // Max 5 concurrent operations

async function limitedOperation() {
  await semaphore.acquire();
  try {
    // Your operation here
  } finally {
    semaphore.release();
  }
}

// ✅ Clear caches periodically
setInterval(() => {
  quoteCache.clear();
  console.log('Cache cleared');
}, 300000); // Clear every 5 minutes
```

---

## Environment Setup Issues

### Problem: Node.js Version Compatibility
```
Error: Unsupported Node.js version
```

**Solutions:**
```bash
# ✅ Use Node.js 16+
nvm install 16
nvm use 16

# ✅ Check version
node --version # Should be v16.0.0 or higher
```

### Problem: Package Installation Fails
```
npm ERR! peer dep missing
```

**Solutions:**
```bash
# ✅ Install peer dependencies
npm install @solana/web3.js @solana/spl-token

# ✅ Use exact versions
npm install @saros-finance/sdk@latest @solana/web3.js@^1.78.0

# ✅ Clear npm cache
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

### Problem: TypeScript Compilation Errors
```
error TS2307: Cannot find module '@saros-finance/sdk'
```

**Solutions:**
```json
// ✅ Update tsconfig.json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "moduleResolution": "node",
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "strict": true,
    "skipLibCheck": true
  }
}
```

---

## Testing Issues

### Problem: Tests Fail on CI/CD
```
Error: Connection refused (devnet)
```

**Solutions:**
```typescript
// ✅ Use test configuration
const testConfig = {
  connection: new Connection(
    process.env.CI ? 'https://api.devnet.solana.com' : 'http://localhost:8899',
    'confirmed'
  ),
  cluster: process.env.CI ? 'devnet' : 'localnet'
};

// ✅ Mock external calls in tests
jest.mock('@saros-finance/sdk', () => ({
  SarosSDK: jest.fn().mockImplementation(() => ({
    getSwapQuote: jest.fn().mockResolvedValue(mockQuote),
    swap: jest.fn().mockResolvedValue(mockTransaction)
  }))
}));

// ✅ Add test timeouts
describe('Saros SDK Tests', () => {
  jest.setTimeout(30000); // 30 second timeout
  
  test('should get swap quote', async () => {
    // Test implementation
  });
});
```

---

## Getting Help

### Debug Information to Collect

```typescript
// Collect debug info
const debugInfo = {
  sdkVersion: require('@saros-finance/sdk/package.json').version,
  nodeVersion: process.version,
  network: 'devnet', // or 'mainnet-beta'
  rpcEndpoint: connection.rpcEndpoint,
  walletAddress: wallet.publicKey.toString(),
  timestamp: new Date().toISOString()
};

console.log('Debug Info:', JSON.stringify(debugInfo, null, 2));
```

### Support Channels

- **GitHub Issues**: [saros-finance/sdk](https://github.com/saros-finance/sdk/issues)
- **Discord**: [Saros Dev Station](https://discord.gg/saros)
- **Documentation**: [docs.saros.finance](https://docs.saros.finance)
- **Email**: dev-support@saros.finance

### Issue Template

```markdown
**SDK Version**: @saros-finance/sdk@1.0.0
**Node Version**: v16.14.0
**Network**: devnet
**Error Message**: 
```
[Paste error message here]
```

**Code Sample**:
```typescript
// Minimal code that reproduces the issue
```

**Expected Behavior**: 
[Describe what should happen]

**Actual Behavior**: 
[Describe what actually happens]

**Additional Context**: 
[Any other relevant information]
```

---

## FAQ

### Q: Why is my swap failing with "insufficient liquidity"?
**A:** The pool may not have enough liquidity for your swap size. Try reducing the amount or check available pools.

### Q: How do I handle SOL wrapping automatically?
**A:** Set `wrapUnwrapSOL: true` in your swap parameters.

### Q: What's the recommended slippage for volatile markets?
**A:** Start with 1-2% for volatile pairs, 0.5% for stable pairs.

### Q: How often should I rebalance DLMM positions?
**A:** Monitor positions daily and rebalance when >10-15 bins away from active range.

### Q: Can I use the SDK on mainnet?
**A:** Yes, change the cluster to 'mainnet-beta' and use mainnet RPC endpoints.

---

*Last updated: August 2025*