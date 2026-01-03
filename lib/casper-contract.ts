/**
 * Casper Smart Contract Integration
 * 
 * Functions for interacting with the deployed escrow contract
 * Using Casper Wallet for signing
 */

import {
    PublicKey,
    Args,
    Deploy,
    DeployHeader,
    ExecutableDeployItem,
    StoredContractByHash,
    ContractHash,
    CLValue,
} from 'casper-js-sdk';

// Configuration from environment variables
export const NODE_URL = process.env.NEXT_PUBLIC_CASPER_NODE_URL || 'https://rpc.testnet.casperlabs.io/rpc';
export const CHAIN_NAME = process.env.NEXT_PUBLIC_CHAIN_NAME || 'casper-test';
export const CONTRACT_HASH = process.env.NEXT_PUBLIC_CONTRACT_HASH || '';

/**
 * Get Casper Wallet Provider
 */
function getWalletProvider() {
    if (typeof window === 'undefined' || !window.CasperWalletProvider) {
        throw new Error('Casper Wallet not found. Please install the Casper Wallet extension.');
    }
    return window.CasperWalletProvider();
}

/**
 * Create a deploy for contract interaction
 */
function createContractDeploy(
    publicKey: PublicKey,
    entryPoint: string,
    args: Args,
    paymentAmount: string
): Deploy {
    const contractHash = ContractHash.newContract(CONTRACT_HASH);

    const header = DeployHeader.default();
    header.account = publicKey;
    header.chainName = CHAIN_NAME;

    const session = new ExecutableDeployItem();
    session.storedContractByHash = new StoredContractByHash(
        contractHash,
        entryPoint,
        args
    );

    const payment = ExecutableDeployItem.standardPayment(paymentAmount);

    const deploy = Deploy.makeDeploy(header, payment, session);

    return deploy;
}

/**
 * Send deploy to the network
 */
async function sendDeploy(deploy: Deploy): Promise<string> {
    const response = await fetch(NODE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            jsonrpc: '2.0',
            method: 'account_put_deploy',
            params: { deploy: Deploy.toJSON(deploy) },
            id: 1
        })
    });

    const data = await response.json();

    if (data.error) {
        throw new Error(data.error.message || 'Failed to send deploy');
    }

    return data.result.deploy_hash;
}

/**
 * Create a new escrow using Casper Wallet
 */
export async function createEscrow(
    publicKeyHex: string,
    totalAmountMotes: string,
    numParticipants: number,
    password: string
): Promise<string> {
    if (!CONTRACT_HASH) {
        throw new Error('Contract hash not configured');
    }

    const provider = getWalletProvider();
    const publicKey = PublicKey.fromHex(publicKeyHex);

    // Build runtime arguments
    const argsMap = new Map<string, CLValue>();
    argsMap.set('total_amount', CLValue.newCLUInt256(totalAmountMotes));
    argsMap.set('num_friends', CLValue.newCLUint8(numParticipants));
    argsMap.set('password', CLValue.newCLString(password));
    const args = new Args(argsMap);

    // Create deploy
    const deploy = createContractDeploy(
        publicKey,
        'create_escrow',
        args,
        '5000000000' // 5 CSPR
    );

    // Sign with wallet
    const deployJSON = JSON.stringify(Deploy.toJSON(deploy));
    const signedDeployJSON = await provider.sign(deployJSON, publicKeyHex);
    const signedDeploy = Deploy.fromJSON(JSON.parse(signedDeployJSON));

    // Send to network
    const deployHash = await sendDeploy(signedDeploy);

    return deployHash;
}

/**
 * Join an existing escrow
 */
export async function joinEscrow(
    publicKeyHex: string,
    escrowCode: string,
    amountMotes: string,
    password: string
): Promise<string> {
    if (!CONTRACT_HASH) {
        throw new Error('Contract hash not configured');
    }

    const provider = getWalletProvider();
    const publicKey = PublicKey.fromHex(publicKeyHex);

    // Build runtime arguments
    const argsMap = new Map<string, CLValue>();
    argsMap.set('escrow_code', CLValue.newCLString(escrowCode));
    argsMap.set('amount', CLValue.newCLUInt512(amountMotes));
    argsMap.set('password', CLValue.newCLString(password));
    const args = new Args(argsMap);

    // Create deploy
    const deploy = createContractDeploy(
        publicKey,
        'join_escrow',
        args,
        '5000000000' // 5 CSPR
    );

    // Sign with wallet
    const deployJSON = JSON.stringify(Deploy.toJSON(deploy));
    const signedDeployJSON = await provider.sign(deployJSON, publicKeyHex);
    const signedDeploy = Deploy.fromJSON(JSON.parse(signedDeployJSON));

    // Send to network
    const deployHash = await sendDeploy(signedDeploy);

    return deployHash;
}

/**
 * Withdraw from completed escrow
 */
export async function withdrawFromEscrow(
    publicKeyHex: string,
    escrowCode: string
): Promise<string> {
    if (!CONTRACT_HASH) {
        throw new Error('Contract hash not configured');
    }

    const provider = getWalletProvider();
    const publicKey = PublicKey.fromHex(publicKeyHex);

    // Build runtime arguments
    const argsMap = new Map<string, CLValue>();
    argsMap.set('escrow_code', CLValue.newCLString(escrowCode));
    const args = new Args(argsMap);

    // Create deploy
    const deploy = createContractDeploy(
        publicKey,
        'withdraw',
        args,
        '3000000000' // 3 CSPR
    );

    // Sign with wallet
    const deployJSON = JSON.stringify(Deploy.toJSON(deploy));
    const signedDeployJSON = await provider.sign(deployJSON, publicKeyHex);
    const signedDeploy = Deploy.fromJSON(JSON.parse(signedDeployJSON));

    // Send to network
    const deployHash = await sendDeploy(signedDeploy);

    return deployHash;
}

/**
 * Cancel an escrow (creator only)
 */
export async function cancelEscrow(
    publicKeyHex: string,
    escrowCode: string
): Promise<string> {
    if (!CONTRACT_HASH) {
        throw new Error('Contract hash not configured');
    }

    const provider = getWalletProvider();
    const publicKey = PublicKey.fromHex(publicKeyHex);

    // Build runtime arguments
    const argsMap = new Map<string, CLValue>();
    argsMap.set('escrow_code', CLValue.newCLString(escrowCode));
    const args = new Args(argsMap);

    // Create deploy
    const deploy = createContractDeploy(
        publicKey,
        'cancel_escrow',
        args,
        '3000000000' // 3 CSPR
    );

    // Sign with wallet
    const deployJSON = JSON.stringify(Deploy.toJSON(deploy));
    const signedDeployJSON = await provider.sign(deployJSON, publicKeyHex);
    const signedDeploy = Deploy.fromJSON(JSON.parse(signedDeployJSON));

    // Send to network
    const deployHash = await sendDeploy(signedDeploy);

    return deployHash;
}

/**
 * Wait for deploy to be processed
 */
export async function waitForDeploy(deployHash: string, timeout: number = 180000) {
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
        try {
            const response = await fetch(NODE_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    jsonrpc: '2.0',
                    method: 'info_get_deploy',
                    params: { deploy_hash: deployHash },
                    id: 1
                })
            });

            const data = await response.json();

            if (data.result && data.result.execution_results && data.result.execution_results.length > 0) {
                const result = data.result.execution_results[0].result;

                if (result.Success) {
                    return { success: true, result, deploy: data.result.deploy };
                } else if (result.Failure) {
                    return {
                        success: false,
                        error: result.Failure.error_message,
                        deploy: data.result.deploy
                    };
                }
            }
        } catch (error) {
            // Deploy not found yet, continue waiting
        }

        // Wait 5 seconds before checking again
        await new Promise(resolve => setTimeout(resolve, 5000));
    }

    throw new Error('Deploy timeout - transaction took too long to process');
}

/**
 * Query escrow information from the contract
 */
export async function getEscrowInfo(escrowCode: string) {
    if (!CONTRACT_HASH) {
        throw new Error('Contract hash not configured');
    }

    try {
        // Get state root hash
        const stateResponse = await fetch(NODE_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                jsonrpc: '2.0',
                method: 'chain_get_state_root_hash',
                params: {},
                id: 1
            })
        });

        const stateData = await stateResponse.json();
        const stateRootHash = stateData.result.state_root_hash;

        // Query dictionary item
        const response = await fetch(NODE_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                jsonrpc: '2.0',
                method: 'state_get_dictionary_item',
                params: {
                    state_root_hash: stateRootHash,
                    dictionary_identifier: {
                        ContractNamedKey: {
                            key: `escrow_${escrowCode}`,
                            dictionary_name: 'escrows',
                            dictionary_item_key: escrowCode
                        }
                    }
                },
                id: 1
            })
        });

        const data = await response.json();
        return data.result;
    } catch (error) {
        console.error('Error querying escrow info:', error);
        return null;
    }
}
