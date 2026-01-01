/**
 * Supabase Client Configuration
 * Frontend integration for direct database access
 */

import { createClient } from '@supabase/supabase-js';

// Environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Create Supabase client for frontend
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        persistSession: false, // We're not using Supabase auth
    },
});

// Types
export interface Escrow {
    id: string;
    escrow_code: string;
    creator: string;
    total_amount: number;
    split_amount: number;
    num_friends: number;
    joined_count: number;
    status: 'Open' | 'Complete' | 'Cancelled';
    accumulated_scspr: number;
    initial_scspr: number;
    has_password: boolean;
    created_at: string;
    updated_at: string;
    completed_at?: string;
}

export interface UserEscrow {
    id: string;
    user_account: string;
    escrow_code: string;
    is_creator: boolean;
    joined_at: string;
}

export interface Participant {
    id: string;
    escrow_code: string;
    participant: string;
    cspr_contributed: number;
    scspr_received: number;
    withdrawn: boolean;
    joined_at: string;
    withdrawn_at?: string;
}

export interface PlatformStats {
    total_escrows: number;
    open_escrows: number;
    complete_escrows: number;
    cancelled_escrows: number;
    total_cspr_pooled: number;
    total_yield_earned: number;
    total_participants: number;
    updated_at: string;
}

// ============================================================================
// ESCROW QUERIES
// ============================================================================

/**
 * Get all open escrows (public discovery)
 */
export async function getOpenEscrows(limit = 20, offset = 0) {
    const { data, error } = await supabase
        .from('escrows')
        .select('*')
        .eq('status', 'Open')
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

    if (error) throw error;
    return data as Escrow[];
}

/**
 * Get escrow by code
 */
export async function getEscrowByCode(escrowCode: string) {
    const { data, error } = await supabase
        .from('escrows')
        .select('*')
        .eq('escrow_code', escrowCode)
        .single();

    if (error) throw error;
    return data as Escrow;
}

/**
 * Get user's escrows (both created and joined)
 */
export async function getUserEscrows(userAccount: string, statusFilter?: string) {
    let query = supabase
        .from('user_dashboard')
        .select('*')
        .eq('user_account', userAccount)
        .order('created_at', { ascending: false });

    if (statusFilter) {
        query = query.eq('status', statusFilter);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data;
}

/**
 * Get escrows created by user
 */
export async function getCreatedEscrows(userAccount: string) {
    const { data, error } = await supabase
        .from('user_escrows')
        .select(`
      *,
      escrows (*)
    `)
        .eq('user_account', userAccount)
        .eq('is_creator', true)
        .order('joined_at', { ascending: false });

    if (error) throw error;
    return data;
}

/**
 * Get escrows user joined (not creator)
 */
export async function getJoinedEscrows(userAccount: string) {
    const { data, error } = await supabase
        .from('user_escrows')
        .select(`
      *,
      escrows (*)
    `)
        .eq('user_account', userAccount)
        .eq('is_creator', false)
        .order('joined_at', { ascending: false });

    if (error) throw error;
    return data;
}

/**
 * Search escrows by amount range
 */
export async function searchEscrowsByAmount(minAmount: number, maxAmount: number) {
    const { data, error } = await supabase
        .from('escrows')
        .select('*')
        .eq('status', 'Open')
        .gte('total_amount', minAmount)
        .lte('total_amount', maxAmount)
        .order('created_at', { ascending: false });

    if (error) throw error;
    return data as Escrow[];
}

/**
 * Get escrows that need participants
 */
export async function getEscrowsNeedingParticipants(limit = 20) {
    const { data, error } = await supabase
        .from('escrows')
        .select('*')
        .eq('status', 'Open')
        .lt('joined_count', supabase.rpc('num_friends'))
        .order('created_at', { ascending: false })
        .limit(limit);

    if (error) throw error;
    return data as Escrow[];
}

// ============================================================================
// PARTICIPANT QUERIES
// ============================================================================

/**
 * Get participants of an escrow
 */
export async function getEscrowParticipants(escrowCode: string) {
    const { data, error } = await supabase
        .from('participants')
        .select('*')
        .eq('escrow_code', escrowCode)
        .order('joined_at', { ascending: true });

    if (error) throw error;
    return data as Participant[];
}

/**
 * Get participant status
 */
export async function getParticipantStatus(escrowCode: string, participant: string) {
    const { data, error } = await supabase
        .from('participants')
        .select('*')
        .eq('escrow_code', escrowCode)
        .eq('participant', participant)
        .single();

    if (error) {
        if (error.code === 'PGRST116') return null; // Not found
        throw error;
    }
    return data as Participant;
}

/**
 * Check if user can withdraw
 */
export async function canUserWithdraw(escrowCode: string, userAccount: string) {
    const participant = await getParticipantStatus(escrowCode, userAccount);
    if (!participant) return false;

    const escrow = await getEscrowByCode(escrowCode);
    return escrow.status === 'Complete' && !participant.withdrawn;
}

// ============================================================================
// STATISTICS
// ============================================================================

/**
 * Get platform statistics
 */
export async function getPlatformStats() {
    const { data, error } = await supabase
        .from('platform_stats')
        .select('*')
        .single();

    if (error) throw error;
    return data as PlatformStats;
}

/**
 * Get user statistics
 */
export async function getUserStats(userAccount: string) {
    const { data: escrows, error } = await supabase
        .from('user_escrows')
        .select('escrow_code, is_creator')
        .eq('user_account', userAccount);

    if (error) throw error;

    const totalEscrows = escrows?.length || 0;
    const createdCount = escrows?.filter(e => e.is_creator).length || 0;
    const joinedCount = totalEscrows - createdCount;

    return {
        total_escrows: totalEscrows,
        created_escrows: createdCount,
        joined_escrows: joinedCount,
    };
}

// ============================================================================
// REAL-TIME SUBSCRIPTIONS
// ============================================================================

/**
 * Subscribe to new escrows
 */
export function subscribeToNewEscrows(callback: (escrow: Escrow) => void) {
    return supabase
        .channel('new-escrows')
        .on(
            'postgres_changes',
            {
                event: 'INSERT',
                schema: 'public',
                table: 'escrows',
            },
            (payload) => {
                callback(payload.new as Escrow);
            }
        )
        .subscribe();
}

/**
 * Subscribe to escrow updates
 */
export function subscribeToEscrowUpdates(
    escrowCode: string,
    callback: (escrow: Escrow) => void
) {
    return supabase
        .channel(`escrow-${escrowCode}`)
        .on(
            'postgres_changes',
            {
                event: 'UPDATE',
                schema: 'public',
                table: 'escrows',
                filter: `escrow_code=eq.${escrowCode}`,
            },
            (payload) => {
                callback(payload.new as Escrow);
            }
        )
        .subscribe();
}

/**
 * Subscribe to participant joins
 */
export function subscribeToParticipantJoins(
    escrowCode: string,
    callback: (participant: Participant) => void
) {
    return supabase
        .channel(`participants-${escrowCode}`)
        .on(
            'postgres_changes',
            {
                event: 'INSERT',
                schema: 'public',
                table: 'participants',
                filter: `escrow_code=eq.${escrowCode}`,
            },
            (payload) => {
                callback(payload.new as Participant);
            }
        )
        .subscribe();
}

/**
 * Subscribe to user's escrows
 */
export function subscribeToUserEscrows(
    userAccount: string,
    callback: (data: any) => void
) {
    return supabase
        .channel(`user-escrows-${userAccount}`)
        .on(
            'postgres_changes',
            {
                event: '*',
                schema: 'public',
                table: 'user_escrows',
                filter: `user_account=eq.${userAccount}`,
            },
            (payload) => {
                callback(payload);
            }
        )
        .subscribe();
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Format CSPR amount (convert from motes)
 */
export function formatCSPR(motes: number): string {
    return (motes / 1e9).toFixed(2);
}

/**
 * Calculate completion percentage
 */
export function getCompletionPercentage(joinedCount: number, totalFriends: number): number {
    return Math.round((joinedCount / totalFriends) * 100);
}

/**
 * Check if escrow needs participants
 */
export function needsParticipants(escrow: Escrow): boolean {
    return escrow.status === 'Open' && escrow.joined_count < escrow.num_friends;
}

/**
 * Get time ago string
 */
export function getTimeAgo(timestamp: string): string {
    const now = new Date();
    const past = new Date(timestamp);
    const diffMs = now.getTime() - past.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
}
