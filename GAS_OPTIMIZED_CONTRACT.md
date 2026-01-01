# Gas-Optimized Contract Strategy

## 🔥 Remove These Expensive Functions:

### **Remove from Contract:**
- `get_user_escrows_detailed()` - Too expensive (loops + calculations)
- `get_all_escrows()` - Too expensive (pagination + filtering)  
- `get_escrow_stats()` - Too expensive (reads all escrows)

### **Keep Essential Functions Only:**
- `create_escrow()` - Core functionality
- `join_escrow()` - Core functionality  
- `withdraw()` - Core functionality
- `cancel_escrow()` - Core functionality
- `get_escrow_info()` - Simple read
- `get_participant_status()` - Simple read
- `list_user_escrows()` - Simple read

## 💡 Alternative Solutions:

### **Frontend-Based Aggregation:**
```typescript
// Instead of get_user_escrows_detailed(), do this on frontend:
async function getUserEscrowsDetailed(userAccount: string) {
  // 1. Get simple list (cheap)
  const escrowCodes = await contract.list_user_escrows(userAccount);
  
  // 2. Get details for each (multiple cheap calls)
  const detailedEscrows = await Promise.all(
    escrowCodes.map(code => contract.get_escrow_info(code))
  );
  
  // 3. Calculate yield on frontend
  return detailedEscrows.map(escrow => ({
    ...escrow,
    currentYield: calculateYield(escrow), // Frontend calculation
    statusName: getStatusName(escrow.status)
  }));
}
```

### **Backend Indexer Service:**
```typescript
// Run a backend service that:
// 1. Listens to contract events
// 2. Builds aggregated data
// 3. Provides REST API for complex queries

// Example API endpoints:
GET /api/escrows/user/{account}?status=open
GET /api/escrows/public?page=1&limit=20
GET /api/stats/platform
```

### **Event-Based Architecture:**
```rust
// Contract emits events, frontend/backend processes them
emit_escrow_created(&escrow_code, creator, total_amount, num_friends);
emit_participant_joined(&escrow_code, participant, amount, joined_count);
emit_escrow_completed(&escrow_code, total_scspr);
```

## 📊 Gas Cost Comparison:

| Approach | Contract Calls | Gas Cost | Complexity |
|----------|----------------|----------|------------|
| **Heavy Contract** | 1 call | 🔴 Very High | Low frontend |
| **Multiple Simple Calls** | 5-10 calls | 🟡 Medium | Medium frontend |
| **Backend Indexer** | 0 calls | 🟢 Very Low | High backend |
| **Event Listening** | 0 calls | 🟢 Very Low | Medium frontend |

## 🎯 Recommended Architecture:

### **Smart Contract (Minimal):**
- Core escrow logic only
- Simple read functions
- Event emission
- Gas-optimized

### **Frontend (Aggregation):**
- Multiple simple contract calls
- Client-side data processing
- Real-time event listening
- Caching for performance

### **Backend (Optional):**
- Event indexing service
- Complex query API
- Analytics dashboard
- Historical data

## 💰 Cost Savings:

**Before (Heavy Contract):**
- Deploy: ~50,000 gas
- get_user_escrows_detailed(): ~20,000 gas
- get_all_escrows(): ~30,000 gas

**After (Optimized):**
- Deploy: ~30,000 gas (-40%)
- list_user_escrows(): ~2,000 gas (-90%)
- get_escrow_info() x5: ~10,000 gas (-50%)

## 🚀 Implementation Plan:

1. **Remove expensive functions from contract**
2. **Keep core functionality + simple reads**
3. **Build frontend aggregation logic**
4. **Add event listening for real-time updates**
5. **Optional: Add backend indexer for complex queries**

This approach gives you the same functionality with **significantly lower gas costs**!