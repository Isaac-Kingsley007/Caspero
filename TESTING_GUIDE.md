# Testing Guide - Real Wallet Integration

## Prerequisites

### 1. Casper Wallet Extension
- Install from: https://www.casperwallet.io/
- Create or import an account
- Switch to Testnet network

### 2. Get Test CSPR
- Visit Casper Testnet Faucet: https://testnet.cspr.live/tools/faucet
- Enter your wallet address
- Request test CSPR (you'll need at least 20 CSPR for testing)

### 3. Environment Configuration
Ensure your `.env` file has:
```env
NEXT_PUBLIC_CONTRACT_HASH=hash-your-deployed-contract-hash
NEXT_PUBLIC_CASPER_NODE_URL=https://rpc.testnet.casperlabs.io/rpc
NEXT_PUBLIC_CHAIN_NAME=casper-test
NEXT_PUBLIC_CASPER_NETWORK=testnet
```

## Testing Steps

### Test 1: Wallet Connection
1. Start the development server: `npm run dev`
2. Open http://localhost:3000
3. Click "Connect Wallet" button
4. Approve connection in Casper Wallet popup
5. ✅ Verify: Your wallet address and balance appear in header

### Test 2: Create Escrow
1. Navigate to "Create Escrow" page
2. Fill in the form:
   - Total Amount: 20 CSPR (or any amount ≥ 10 CSPR)
   - Number of Participants: 2
   - Optional: Enable password protection
3. Click "Create Escrow"
4. ✅ Verify: Casper Wallet popup appears
5. Review the deploy details in wallet:
   - Entry Point: `create_escrow`
   - Payment: 5 CSPR
6. Approve the transaction
7. ✅ Verify: Deploy hash appears in UI
8. ✅ Verify: Status changes to "Transaction submitted!"
9. Wait 30-60 seconds for confirmation
10. ✅ Verify: Success message appears
11. ✅ Verify: Escrow code is generated

### Test 3: Monitor Transaction
1. Copy the deploy hash from the UI
2. Visit Casper Block Explorer: https://testnet.cspr.live/
3. Search for your deploy hash
4. ✅ Verify: Deploy appears in explorer
5. ✅ Verify: Execution result shows "Success"
6. ✅ Verify: Contract entry point is `create_escrow`

### Test 4: Join Escrow (Optional - requires 2nd account)
1. Switch to a different Casper Wallet account
2. Navigate to home page
3. Search for the escrow code from Test 2
4. Click "Join" on the escrow card
5. Enter password if required
6. Click "Join & Stake"
7. ✅ Verify: Wallet popup appears
8. Approve the transaction
9. ✅ Verify: Deploy hash appears
10. Wait for confirmation
11. ✅ Verify: Success message

### Test 5: Balance Updates
1. Note your balance before creating escrow
2. Create an escrow
3. Wait for transaction confirmation
4. Refresh the page
5. ✅ Verify: Balance decreased by (escrow amount + 5 CSPR gas)

## Expected Behavior

### Successful Create Escrow
- Wallet popup appears immediately
- Deploy is signed by wallet
- Deploy hash is returned (format: `deploy_hash_hex_string`)
- Transaction appears in block explorer within 1-2 minutes
- Execution result shows "Success"
- Gas cost: 5 CSPR

### Successful Join Escrow
- Wallet popup appears
- Deploy is signed
- Deploy hash returned
- Transaction confirmed
- Gas cost: 5 CSPR

### Error Scenarios

#### "Casper Wallet not found"
- **Cause**: Wallet extension not installed
- **Solution**: Install Casper Wallet extension

#### "Wallet not connected"
- **Cause**: User hasn't connected wallet
- **Solution**: Click "Connect Wallet" button

#### "Contract hash not configured"
- **Cause**: `.env` missing `NEXT_PUBLIC_CONTRACT_HASH`
- **Solution**: Add contract hash to `.env`

#### "Insufficient balance"
- **Cause**: Not enough CSPR for transaction + gas
- **Solution**: Get more CSPR from faucet

#### "User rejected"
- **Cause**: User clicked "Reject" in wallet popup
- **Solution**: Try again and click "Approve"

#### "Deploy timeout"
- **Cause**: Transaction took longer than 3 minutes
- **Solution**: Check block explorer manually with deploy hash

## Debugging

### Check Console Logs
Open browser DevTools (F12) and check Console for:
- Deploy creation logs
- Wallet signing logs
- RPC response logs
- Error messages

### Check Network Tab
1. Open DevTools → Network tab
2. Filter by "rpc"
3. Look for:
   - `account_put_deploy` - Deploy submission
   - `info_get_deploy` - Status checking
   - `chain_get_state_root_hash` - State queries

### Verify Contract Hash
```bash
# Check if contract hash is valid
echo $NEXT_PUBLIC_CONTRACT_HASH
# Should start with "hash-" followed by 64 hex characters
```

### Check RPC Connection
```bash
curl -X POST https://rpc.testnet.casperlabs.io/rpc \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"info_get_status","params":{},"id":1}'
```

## Known Limitations

1. **Escrow Discovery**: Currently uses mock data
   - Real escrows won't appear in browse list yet
   - Need event indexer implementation

2. **Transaction History**: Not implemented yet
   - Can't see past transactions in app
   - Use block explorer instead

3. **Escrow Details**: Dictionary queries not fully implemented
   - Can't fetch escrow details from contract yet
   - Coming in next update

## Success Criteria

✅ Wallet connects without errors
✅ Create escrow transaction submits successfully
✅ Deploy hash appears in block explorer
✅ Transaction shows "Success" status
✅ Balance updates correctly
✅ No console errors during flow

## Next Steps After Testing

If all tests pass:
1. ✅ Real wallet integration is working
2. ⏭️ Proceed to implement event indexer
3. ⏭️ Add transaction history
4. ⏭️ Implement escrow queries

If tests fail:
1. Check error messages in console
2. Verify environment configuration
3. Ensure contract is deployed correctly
4. Check wallet has sufficient balance
5. Review deploy in block explorer for details

---

**Happy Testing! 🚀**
