# Escrow Listing Functionality

## 📋 Complete Listing System Overview

The smart contract now provides comprehensive listing and discovery functionality for escrows with multiple levels of detail and filtering options.

## 🔍 Available Listing Functions

### **1. Basic User Escrows** 
**Function:** `list_user_escrows(user: String)`

**Returns:** Simple list with creator flags
```json
["ESCROW-1-ABCD:1", "ESCROW-2-EFGH:0", "ESCROW-3-IJKL:0"]
// Format: "escrow_code:is_creator_flag" (1=creator, 0=participant)
```

**Use Case:** Quick overview of user's escrows

---

### **2. Detailed User Escrows** ⭐ **NEW**
**Function:** `get_user_escrows_detailed(user: String, status_filter?: u8)`

**Parameters:**
- `user`: Account hash as string
- `status_filter`: Optional (0=Open, 1=Complete, 2=Cancelled)

**Returns:** Detailed escrow information
```json
[
  {
    "escrow_code": "ESCROW-1-ABCD",
    "is_creator": true,
    "creator": "account-hash-01234...",
    "total_amount": "1000",
    "split_amount": "250",
    "num_friends": 4,
    "joined_count": 2,
    "status": "Open",
    "status_code": 0,
    "accumulated_scspr": "500",
    "current_yield": "25",
    "created_timestamp": 1640995200,
    "has_password": true
  }
]
```

**Features:**
- ✅ Complete escrow details
- ✅ Real-time yield calculation
- ✅ Human-readable status names
- ✅ Password protection indicator
- ✅ Filter by status (Open/Complete/Cancelled)
- ✅ Creator vs participant role

---

### **3. Public Escrow Discovery** ⭐ **NEW**
**Function:** `get_all_escrows(page: u32, page_size: u32, status_filter?: u8)`

**Parameters:**
- `page`: 0-based page number
- `page_size`: Items per page (max 50)
- `status_filter`: Optional status filter

**Returns:** Public escrow information (no sensitive data)
```json
[
  {
    "escrow_code": "ESCROW-1-ABCD",
    "total_amount": "1000",
    "split_amount": "250", 
    "num_friends": 4,
    "joined_count": 2,
    "status": "Open",
    "created_timestamp": 1640995200,
    "has_password": true
  }
]
```

**Features:**
- ✅ Paginated results (max 50 per page)
- ✅ Public discovery of escrows
- ✅ Filter by status
- ✅ No creator info (privacy)
- ✅ Shows if password required

---

### **4. Platform Statistics** ⭐ **NEW**
**Function:** `get_escrow_stats()`

**Returns:** Platform-wide statistics
```json
{
  "total_escrows": 156,
  "open_escrows": 23,
  "complete_escrows": 128,
  "cancelled_escrows": 5,
  "total_cspr_pooled": "45000",
  "total_yield_earned": "2250"
}
```

**Features:**
- ✅ Total escrows created
- ✅ Status breakdown
- ✅ Total CSPR pooled
- ✅ Total yield earned
- ✅ Platform health metrics

---

### **5. Individual Escrow Details**
**Function:** `get_escrow_info(escrow_code: String)`

**Returns:** Complete escrow information
```json
{
  "creator": "account-hash-01234...",
  "total_amount": "1000",
  "split_amount": "250",
  "num_friends": 4,
  "joined_count": 2,
  "status": 0,
  "accumulated_scspr": "500",
  "initial_scspr": "500",
  "created_timestamp": 1640995200
}
```

**Use Case:** Detailed view of specific escrow

---

### **6. Participant Status**
**Function:** `get_participant_status(escrow_code: String, participant: String)`

**Returns:** Participant's contribution details
```json
{
  "cspr_contributed": "250",
  "scspr_received": "250", 
  "withdrawn": false
}
// Or "not_joined" if not participated
```

## 🎯 Frontend Integration Examples

### **Dashboard Page**
```typescript
// Get user's detailed escrows with filtering
const userEscrows = await contract.get_user_escrows_detailed(
  userAccount,
  null // No status filter - show all
);

// Filter by status on frontend
const openEscrows = userEscrows.filter(e => e.status === "Open");
const completeEscrows = userEscrows.filter(e => e.status === "Complete");
```

### **Discover Page**
```typescript
// Browse public escrows with pagination
const publicEscrows = await contract.get_all_escrows(
  0,    // Page 0
  20,   // 20 per page
  0     // Only open escrows
);

// Show escrows that need participants
const needParticipants = publicEscrows.filter(
  e => e.joined_count < e.num_friends
);
```

### **Statistics Page**
```typescript
// Platform overview
const stats = await contract.get_escrow_stats();

// Display metrics
<div>
  <Metric label="Total Escrows" value={stats.total_escrows} />
  <Metric label="Active Escrows" value={stats.open_escrows} />
  <Metric label="CSPR Pooled" value={stats.total_cspr_pooled} />
  <Metric label="Yield Earned" value={stats.total_yield_earned} />
</div>
```

## 📊 Data Structure Details

### **Enhanced Information Available:**

| Field | Description | Available In |
|-------|-------------|--------------|
| `escrow_code` | Unique identifier | All functions |
| `is_creator` | User's role | User functions |
| `creator` | Creator account | Individual/User detailed |
| `total_amount` | Total expense amount | All functions |
| `split_amount` | Amount per person | All functions |
| `num_friends` | Total participants | All functions |
| `joined_count` | Current participants | All functions |
| `status` | Human-readable status | Enhanced functions |
| `status_code` | Numeric status | Enhanced functions |
| `accumulated_scspr` | Current staked amount | User detailed |
| `current_yield` | Real-time yield | User detailed |
| `created_timestamp` | Creation time | All functions |
| `has_password` | Password protection | Enhanced functions |

### **Privacy Considerations:**

**Public Discovery (`get_all_escrows`):**
- ✅ Shows escrow exists
- ✅ Shows basic details (amount, participants)
- ❌ Hides creator identity
- ❌ Hides participant identities
- ✅ Shows if password required

**User Functions:**
- ✅ Full details for user's own escrows
- ✅ Creator/participant role
- ✅ Yield information
- ✅ Complete transaction history

## 🔄 Real-time Features

### **Dynamic Yield Calculation:**
```rust
// Calculates current yield for completed escrows
let current_yield = if escrow.status == EscrowStatus::Complete {
    let current_balance = get_current_scspr_balance();
    if current_balance > escrow.initial_scspr {
        current_balance - escrow.initial_scspr
    } else {
        U512::zero()
    }
} else {
    U512::zero()
};
```

### **Status Translation:**
```rust
let status_name = match escrow.status {
    EscrowStatus::Open => "Open",
    EscrowStatus::Complete => "Complete", 
    EscrowStatus::Cancelled => "Cancelled",
};
```

## 🚀 Use Cases by Function

### **For Users (Dashboard):**
- `get_user_escrows_detailed()` - Complete dashboard
- Filter by status for different views
- Track yield earnings
- Monitor participation progress

### **For Discovery (Browse):**
- `get_all_escrows()` - Find escrows to join
- Filter by status (only open escrows)
- Pagination for performance
- See if password required

### **For Analytics (Stats):**
- `get_escrow_stats()` - Platform metrics
- Track total volume
- Monitor platform growth
- Calculate yield performance

### **For Individual Views:**
- `get_escrow_info()` - Detailed escrow page
- `get_participant_status()` - User's contribution status

## 📈 Performance Considerations

### **Pagination:**
- Maximum 50 items per page
- Prevents large data transfers
- Efficient for mobile apps

### **Filtering:**
- Status filtering at contract level
- Reduces data transfer
- Faster frontend rendering

### **Caching Strategy:**
- Cache user escrows list
- Refresh on user actions
- Background sync for yield updates

## 🎉 Summary

The escrow listing system now provides:

✅ **Complete User Dashboard** - Detailed view of user's escrows with filtering
✅ **Public Discovery** - Browse available escrows with privacy protection  
✅ **Platform Statistics** - Overall metrics and health indicators
✅ **Real-time Yield** - Dynamic calculation of staking rewards
✅ **Privacy Protection** - Public vs private information separation
✅ **Performance Optimized** - Pagination and filtering
✅ **Mobile Friendly** - Efficient data structures

The listing functionality is now **production-ready** and supports all major use cases for a group escrow platform! 🚀