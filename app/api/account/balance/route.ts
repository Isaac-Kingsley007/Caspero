import { NextRequest, NextResponse } from 'next/server';

const CASPER_RPC_URL = process.env.NEXT_PUBLIC_CASPER_NODE_URL || 'https://rpc.testnet.casperlabs.io';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const publicKey = searchParams.get('publicKey');

        if (!publicKey) {
            return NextResponse.json({ error: 'Public key is required' }, { status: 400 });
        }

        console.log('Fetching balance for public key:', publicKey);

        // Call Casper RPC to get account balance
        const response = await fetch(CASPER_RPC_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                jsonrpc: '2.0',
                method: 'state_get_balance',
                params: {
                    state_identifier: null,
                    purse_identifier: {
                        main_purse_under_public_key: publicKey
                    }
                },
                id: 1
            })
        });

        const data = await response.json();

        if (data.error) {
            console.error('RPC error:', data.error);
            return NextResponse.json({ balance: '0' });
        }

        const balance = data.result?.balance_value || '0';
        console.log('Balance fetched:', balance);

        return NextResponse.json({ balance });
    } catch (error) {
        console.error('Error fetching balance:', error);
        return NextResponse.json({ balance: '0' });
    }
}