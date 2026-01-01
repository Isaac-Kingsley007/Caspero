# Group Expense Escrow with Liquid Staking

**Dead-simple group escrow where friends pool CSPR for shared expenses — funds automatically stake for yield while waiting, then settle to the organizer.**

## 🚀 Overview

Managing group expenses is painful. Someone fronts the money, friends promise to pay back "later," and settling up creates awkward conversations and forgotten IOUs.

This protocol flips the model: **friends contribute upfront, funds earn staking rewards while pooled, and the organizer gets everything (including yield) to handle the expense.**

**Key Innovation**: Instead of idle money sitting in accounts, pooled CSPR automatically stakes to earn rewards, making group expenses profitable for organizers.

**Think**: Venmo request + Escrow + Liquid Staking = Fair group payments

## 💡 Problem

- **Awkward IOUs**: Someone fronts money, friends "owe" them indefinitely
- **Idle funds**: Money sits in accounts earning nothing while waiting for reimbursement  
- **Trust issues**: Friends might forget or delay payments
- **Settlement friction**: Chasing people for money ruins relationships

## ✅ Solution

A Casper-based escrow where friends contribute **upfront** and organizers get **yield as compensation**:

1. **Organizer creates escrow** for total expense amount
2. **Friends contribute their share** in CSPR (equal splits)
3. **Funds automatically stake** to earn sCSPR rewards
4. **When everyone joins**, organizer gets all sCSPR to pay the expense
5. **Yield compensates organizer** for handling the group expense

## 🔁 How It Works

### 1️⃣ Create Group Escrow
Organizer calls `create_escrow` with:
- **Total amount** needed for expense
- **Number of participants** (including themselves)
- Gets back unique **escrow code** to share with friends

### 2️⃣ Friends Join & Contribute  
Each participant (including organizer) calls `join_escrow` with:
- **Escrow code** from organizer
- **Their split amount** in CSPR (total ÷ participants)
- CSPR automatically stakes to sCSPR liquid staking tokens

### 3️⃣ Automatic Settlement
When all participants have joined:
- Escrow status changes to **Complete**
- **All accumulated sCSPR** transfers to organizer
- Organizer can use sCSPR or unstake to pay the expense

### 4️⃣ Yield Distribution
- **Organizer gets all staking rewards** as compensation for organizing
- **Friends get convenience** of not handling the payment directly
- **No IOUs or awkward follow-ups** needed

## 💰 Example: Dinner for 4 Friends

1. **Alice creates escrow**: $400 dinner, 4 people = $100 each
2. **Bob joins**: Contributes $100 CSPR → stakes to sCSPR
3. **Carol joins**: Contributes $100 CSPR → stakes to sCSPR  
4. **Dave joins**: Contributes $100 CSPR → stakes to sCSPR
5. **Alice joins**: Contributes her $100 CSPR → stakes to sCSPR
6. **Escrow completes**: Alice receives ~$400+ worth of sCSPR (including staking rewards)
7. **Alice pays restaurant**: Uses sCSPR or unstakes to CSPR

**Result**: Friends paid upfront, Alice got yield for organizing, no awkward IOUs!

## 🧱 Architecture

### Smart Contracts (Rust)
- **GroupEscrow Contract**: Handles escrow creation, deposits, staking, and settlement
- **Liquid Staking Integration**: Automatically stakes CSPR → sCSPR (placeholder in MVP)

### Frontend  
- **Next.js**: React-based UI for creating and joining escrows
- **Casper Wallet**: For signing transactions
- **casper-js-sdk**: Blockchain interaction

## 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| Blockchain | Casper Network |
| Smart Contracts | Rust (casper-contract, casper-types) |
| Frontend | Next.js, React |
| Wallet | Casper Wallet (Signer) |
| SDK | casper-js-sdk |

## 🧪 Demo Flow (Hackathon MVP)

1. **4 friends need to split dinner bill**
2. **Alice creates escrow** with total amount and participant count
3. **Each friend joins** with their CSPR contribution
4. **Funds automatically stake** to earn sCSPR rewards
5. **When all join**, Alice gets all sCSPR
6. **Alice pays restaurant** with earned sCSPR

## 🧠 Key Design Principles

- **Trust-minimized**: Smart contract handles all logic, no central authority
- **Yield-efficient**: Idle funds always earn staking rewards
- **Fair compensation**: Organizers get yield for doing the work
- **Human-friendly**: Solves real-world group payment problems
- **Automatic**: No manual settlement or vote needed

## 🔮 Future Enhancements

- **Governance mode**: Group voting for disputed expenses
- **Reimbursement requests**: Submit receipts for approval
- **Cross-chain deposits**: Accept other tokens
- **Mobile app**: Native iOS/Android experience
- **Expense oracles**: Real-world payment automation
- **NFT participation**: Proof of group membership

## 🏁 Why This Matters

This project turns a daily human problem into a capital-efficient, trustless protocol.

Instead of idle money and awkward settlements, groups earn yield while organizers get fairly compensated for their effort.

**Everyone wins**: Friends get convenience, organizers get yield, relationships stay intact.