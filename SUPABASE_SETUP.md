# Supabase Integration Setup Guide

## 🚀 Complete Setup in 30 Minutes

### **Step 1: Create Supabase Project (5 minutes)**

1. Go to [supabase.com](https://supabase.com)
2. Click "Start your project"
3. Create new organization (if needed)
4. Create new project:
   - **Name**: `group-escrow-platform`
   - **Database Password**: (generate strong password)
   - **Region**: Choose closest to your users
   - **Pricing Plan**: Free tier is sufficient for MVP

5. Wait for project to be created (~2 minutes)

---

### **Step 2: Run Database Schema (5 minutes)**

1. In Supabase dashboard, go to **SQL Editor**
2. Click **New Query**
3. Copy entire contents of `supabase/schema.sql`
4. Paste into SQL editor
5. Click **Run** (bottom right)
6. Wait for success message

**What this creates:**
- ✅ 5 tables (escrows, user_escrows, participants, events, platform_stats)
- ✅ Indexes for performance
- ✅ Views for common queries
- ✅ Triggers for auto-updates
- ✅ Row Level Security policies

---

### **Step 3: Get API Keys (2 minutes)**

1. Go to **Settings** → **API**
2. Copy these values:

```env
# .env.local
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here

# For backend indexer only
SUPABASE_SERVICE_KEY=your-service-role-key-here
```

3. Add to your `.env.local` file

---

### **Step 4: Install Dependencies (2 minutes)**

```bash
# Install Supabase client
npm install @supabase/supabase-js

# For TypeScript support
npm install -D @supabase/supabase-js
```

---

### **Step 5: Test Connection (5 minutes)**

Create a test file:

```typescript
// test-supabase.ts
import { supabase } from './lib/supabase';

async function testConnection() {
  // Test 1: Get platform stats
  const { data: stats, error } = await supabase
    .from('platform_stats')
    .select('*')
    .single();

  if (error) {
    console.error('❌ Connection failed:', error);
    return;
  }

  console.log('✅ Connection successful!');
  console.log('Platform stats:', stats);

  // Test 2: Query escrows
  const { data: escrows } = await supabase
    .from('escrows')
    .select('*')
    .limit(5);

  console.log(`Found ${escrows?.length || 0} escrows`);
}

testConnection();
```

Run test:
```bash
npx ts-node test-supabase.ts
```

---

### **Step 6: Set Up Event Indexer (Optional - 10 minutes)**

**Option A: Run Locally**

```bash
# Install dependencies
npm install casper-js-sdk

# Set environment variables
export SUPABASE_URL=your-url
export SUPABASE_SERVICE_KEY=your-service-key
export CASPER_NODE_URL=https://node.testnet.casper.network
export CONTRACT_HASH=your-contract-hash

# Run indexer
npx ts-node indexer/event-listener.ts
```

**Option B: Deploy to Railway/Render**

1. Push code to GitHub
2. Connect to Railway/Render
3. Set environment variables
4. Deploy

---

## 📱 Frontend Usage Examples

### **Example 1: Dashboard Page**

```typescript
// app/dashboard/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { getUserEscrows } from '@/lib/supabase';

export default function Dashboard() {
  const [escrows, setEscrows] = useState([]);
  const userAccount = 'account-hash-...'; // From wallet

  useEffect(() => {
    async function loadEscrows() {
      const data = await getUserEscrows(userAccount);
      setEscrows(data);
    }
    loadEscrows();
  }, [userAccount]);

  return (
    <div>
      <h1>My Escrows</h1>
      {escrows.map(escrow => (
        <div key={escrow.escrow_code}>
          <h3>{escrow.escrow_code}</h3>
          <p>Amount: {escrow.total_amount}</p>
          <p>Status: {escrow.status}</p>
        </div>
      ))}
    </div>
  );
}
```

### **Example 2: Public Discovery**

```typescript
// app/discover/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { getOpenEscrows } from '@/lib/supabase';

export default function Discover() {
  const [escrows, setEscrows] = useState([]);

  useEffect(() => {
    async function loadEscrows() {
      const data = await getOpenEscrows(20, 0);
      setEscrows(data);
    }
    loadEscrows();
  }, []);

  return (
    <div>
      <h1>Open Escrows</h1>
      {escrows.map(escrow => (
        <div key={escrow.escrow_code}>
          <h3>{escrow.escrow_code}</h3>
          <p>Needs: {escrow.num_friends - escrow.joined_count} more participants</p>
          <button>Join</button>
        </div>
      ))}
    </div>
  );
}
```

### **Example 3: Real-time Updates**

```typescript
// app/escrow/[code]/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { getEscrowByCode, subscribeToEscrowUpdates } from '@/lib/supabase';

export default function EscrowDetails({ params }: { params: { code: string } }) {
  const [escrow, setEscrow] = useState(null);

  useEffect(() => {
    // Load initial data
    getEscrowByCode(params.code).then(setEscrow);

    // Subscribe to updates
    const subscription = subscribeToEscrowUpdates(
      params.code,
      (updated) => {
        setEscrow(updated);
        console.log('Escrow updated!', updated);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [params.code]);

  if (!escrow) return <div>Loading...</div>;

  return (
    <div>
      <h1>{escrow.escrow_code}</h1>
      <p>Participants: {escrow.joined_count}/{escrow.num_friends}</p>
      <p>Status: {escrow.status}</p>
    </div>
  );
}
```

### **Example 4: Platform Statistics**

```typescript
// app/stats/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { getPlatformStats } from '@/lib/supabase';

export default function Stats() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    getPlatformStats().then(setStats);
  }, []);

  if (!stats) return <div>Loading...</div>;

  return (
    <div>
      <h1>Platform Statistics</h1>
      <div>
        <p>Total Escrows: {stats.total_escrows}</p>
        <p>Open Escrows: {stats.open_escrows}</p>
        <p>Complete Escrows: {stats.complete_escrows}</p>
        <p>Total CSPR Pooled: {stats.total_cspr_pooled}</p>
      </div>
    </div>
  );
}
```

---

## 🔒 Security Best Practices

### **Row Level Security (RLS)**

Already configured in schema! The policies allow:
- ✅ Anyone can read escrows (public data)
- ✅ Anyone can read platform stats
- ✅ Service role (indexer) can write everything
- ✅ Frontend uses anon key (read-only)

### **Environment Variables**

```env
# Frontend (.env.local)
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx... # Safe to expose

# Backend/Indexer (.env)
SUPABASE_SERVICE_KEY=eyJxxx... # NEVER expose to frontend!
```

### **API Key Usage**

- **Anon Key**: Use in frontend (read-only access)
- **Service Key**: Use in backend indexer only (full access)

---

## 📊 Database Monitoring

### **Check Database Health**

1. Go to **Database** → **Tables**
2. Click on `escrows` table
3. View data and run queries

### **View Logs**

1. Go to **Logs** → **Postgres Logs**
2. Monitor queries and errors

### **Performance**

1. Go to **Database** → **Query Performance**
2. See slow queries
3. Add indexes if needed

---

## 🔄 Data Flow

```
Blockchain Event
      ↓
Event Indexer (Node.js)
      ↓
Supabase Database
      ↓
Frontend (Direct Query)
      ↓
User Interface
```

---

## 💰 Cost Estimate

### **Free Tier Includes:**
- ✅ 500MB database
- ✅ 2GB bandwidth/month
- ✅ 50,000 monthly active users
- ✅ Unlimited API requests
- ✅ Real-time subscriptions

### **When to Upgrade:**
- Database > 500MB
- Bandwidth > 2GB/month
- Need point-in-time recovery
- Need daily backups

**Pro Plan**: $25/month
- 8GB database
- 50GB bandwidth
- 7-day backups

---

## ✅ Checklist

- [ ] Supabase project created
- [ ] Database schema executed
- [ ] API keys copied to `.env.local`
- [ ] Dependencies installed
- [ ] Connection tested
- [ ] Frontend queries working
- [ ] Event indexer running (optional)
- [ ] Real-time subscriptions tested

---

## 🆘 Troubleshooting

### **Connection Error**
```
Error: Invalid API key
```
**Solution**: Check that `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are correct

### **No Data Returned**
```
{ data: [], error: null }
```
**Solution**: Database is empty. Run event indexer or insert test data

### **RLS Policy Error**
```
Error: new row violates row-level security policy
```
**Solution**: Use service key for writes, not anon key

### **Real-time Not Working**
```
Subscription not receiving updates
```
**Solution**: Check that Real-time is enabled in Supabase settings

---

## 🎉 You're Done!

Your Supabase integration is complete! You now have:
- ✅ Direct frontend database access (0 gas cost)
- ✅ Real-time updates
- ✅ Public escrow discovery
- ✅ Platform statistics
- ✅ Scalable architecture

**Next Steps:**
1. Build your frontend components
2. Deploy event indexer
3. Test with real contract
4. Launch! 🚀
