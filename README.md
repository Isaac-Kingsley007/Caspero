# CasperGroup-Splits

A decentralized group escrow platform built on Casper Network that allows users to pool funds for shared expenses while earning staking rewards.

## Features

- **Group Escrows**: Create and join group escrows with friends
- **Automatic Staking**: Pooled CSPR is automatically staked to earn yield
- **Password Protection**: Optional password protection for private groups
- **Real-time Updates**: Live updates via Supabase integration
- **Wallet Integration**: Seamless integration with CSPR.click SDK
- **Transaction History**: Complete history of all escrow activities

## Tech Stack

- **Frontend**: Next.js 16, React 19, TypeScript, Tailwind CSS
- **Blockchain**: Casper Network, Smart Contract in Rust
- **Wallet**: CSPR.click SDK for multi-wallet support
- **Database**: Supabase for real-time data
- **Styling**: Tailwind CSS with custom components

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- A Casper wallet (Casper Wallet, Ledger, etc.)
- Supabase account
- Deployed escrow smart contract

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd caspero
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env.local
```

Edit `.env.local` with your configuration:
```env
# Casper Network Configuration
NEXT_PUBLIC_CASPER_NETWORK=testnet
NEXT_PUBLIC_CONTRACT_HASH=your_contract_hash_here
NEXT_PUBLIC_CONTRACT_PACKAGE_HASH=your_contract_package_hash_here

# CSPR.click Configuration
NEXT_PUBLIC_CSPR_CLICK_APP_ID=your_app_id_here

# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here
```

4. Set up Supabase database:
   - Create a new Supabase project
   - Run the SQL schema from `supabase/schema.sql`
   - Configure Row Level Security policies

5. Deploy the smart contract:
   - Navigate to `escrow_contract/`
   - Follow the deployment instructions in the contract directory
   - Update the contract hash in your environment variables

6. Start the development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

## Smart Contract

The escrow smart contract is located in `escrow_contract/contract/src/main.rs` and provides:

- **create_escrow**: Create a new group escrow
- **join_escrow**: Join an existing escrow
- **withdraw**: Withdraw funds plus yield when escrow is complete
- **cancel_escrow**: Cancel an escrow (creator only)
- **Query functions**: Get escrow info, participant status, user escrows

### Contract Features

- Password protection for escrows
- Automatic liquid staking integration
- Yield distribution based on contribution
- Event emission for indexing
- Gas-optimized storage using dictionaries

## Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Smart Contract │    │   Database      │
│   (Next.js)     │◄──►│   (Rust/Casper)  │◄──►│   (Supabase)    │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                        │                        │
         ▼                        ▼                        ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   CSPR.click    │    │   Event Indexer  │    │   Real-time     │
│   (Wallet SDK)  │    │   (Blockchain)   │    │   Subscriptions │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

## Key Components

### Frontend
- **Pages**: Browse, Create, My Escrows, History
- **Components**: EscrowCard, Forms, Modals, UI Components
- **Hooks**: useCsprClick for wallet integration
- **Services**: EscrowService for contract interaction

### Smart Contract
- **Entry Points**: create_escrow, join_escrow, withdraw, cancel_escrow
- **Query Functions**: get_escrow_info, get_participant_status
- **Storage**: Dictionary-based for gas optimization
- **Events**: Comprehensive event emission for indexing

### Database Schema
- **escrows**: Core escrow data
- **participants**: Participant contributions and withdrawals
- **events**: Blockchain event history
- **user_escrows**: User-escrow relationships

## Development

### Running Tests
```bash
# Frontend tests
npm test

# Smart contract tests
cd escrow_contract
make test
```

### Building for Production
```bash
npm run build
```

### Linting
```bash
npm run lint
```

## Deployment

### Frontend Deployment
1. Build the application: `npm run build`
2. Deploy to your preferred platform (Vercel, Netlify, etc.)
3. Set environment variables in your deployment platform

### Smart Contract Deployment
1. Navigate to `escrow_contract/`
2. Build the contract: `make build-contract`
3. Deploy using Casper client tools
4. Update contract hash in environment variables

### Database Setup
1. Create Supabase project
2. Run schema from `supabase/schema.sql`
3. Configure RLS policies
4. Set up event indexer (optional)

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support and questions:
- Create an issue on GitHub
- Join our Discord community
- Check the documentation

## Roadmap

- [ ] Mobile app development
- [ ] Multi-token support
- [ ] Advanced yield strategies
- [ ] Governance features
- [ ] Cross-chain integration