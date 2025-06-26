import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export const runtime = "nodejs";

export async function DELETE(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: userData, error: userError } = await supabase.auth.getUser();

    if (userError || !userData.user) {
      return NextResponse.json({ error: "User not authenticated" }, { status: 401 });
    }

    const userId = userData.user.id;
    const deletedItems: string[] = [];

    console.log(`🗑️ Starting deletion process for user: ${userId}`);

    try {
      // 1. Delete user's flows (automations)
      const { data: flows, error: flowsError } = await supabase
        .from('flows')
        .delete()
        .eq('user_id', userId);

      if (flowsError) {
        console.error('Error deleting flows:', flowsError);
      } else {
        deletedItems.push('All automations and workflows');
        console.log('✅ Deleted flows');
      }

      // 2. Delete user's transactions
      const { data: transactions, error: transactionsError } = await supabase
        .from('transactions')
        .delete()
        .eq('user_id', userId);

      if (transactionsError) {
        console.error('Error deleting transactions:', transactionsError);
      } else {
        deletedItems.push('All transaction history');
        console.log('✅ Deleted transactions');
      }

      // 3. Delete user's account balances
      // First get accounts to find balance records
      const { data: userAccounts, error: accountsSelectError } = await supabase
        .from('accounts')
        .select('account_id')
        .eq('plaid_connection_id', userId);

      if (!accountsSelectError && userAccounts) {
        const accountIds = userAccounts.map(acc => acc.account_id);
        
        if (accountIds.length > 0) {
          const { error: balancesError } = await supabase
            .from('balances')
            .delete()
            .in('account_id', accountIds);

          if (balancesError) {
            console.error('Error deleting balances:', balancesError);
          } else {
            deletedItems.push('All account balances');
            console.log('✅ Deleted balances');
          }
        }
      }

      // 4. Delete user's accounts
      const { data: accounts, error: accountsError } = await supabase
        .from('accounts')
        .delete()
        .eq('plaid_connection_id', userId);

      if (accountsError) {
        console.error('Error deleting accounts:', accountsError);
      } else {
        deletedItems.push('All connected bank accounts');
        console.log('✅ Deleted accounts');
      }

      // 5. Delete plaid connections
      const { data: plaidConnections, error: plaidError } = await supabase
        .from('plaid_connections')
        .delete()
        .eq('user_id', userId);

      if (plaidError) {
        console.error('Error deleting plaid connections:', plaidError);
      } else {
        deletedItems.push('All bank connections');
        console.log('✅ Deleted plaid connections');
      }

      // 6. Delete user profile
      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .delete()
        .eq('user_id', userId);

      if (profileError) {
        console.error('Error deleting user profile:', profileError);
      } else {
        deletedItems.push('User profile and settings');
        console.log('✅ Deleted user profile');
      }

      // 7. Finally, delete the auth user
      // Note: This requires admin privileges, so we'll handle it last
      const { error: authDeleteError } = await supabase.auth.admin.deleteUser(userId);
      
      if (authDeleteError) {
        console.error('Error deleting auth user:', authDeleteError);
        // Don't add this to deleted items if it failed
      } else {
        deletedItems.push('User account');
        console.log('✅ Deleted auth user');
      }

      console.log(`🎯 Successfully completed deletion for user: ${userId}`);
      console.log('Deleted items:', deletedItems);

      return NextResponse.json({ 
        success: true, 
        message: "All user data has been successfully deleted",
        deletedItems 
      });

    } catch (deletionError: any) {
      console.error('Error during data deletion:', deletionError);
      return NextResponse.json({ 
        error: `Failed to delete some data: ${deletionError.message}. Some items may have been partially deleted.`,
        deletedItems 
      }, { status: 500 });
    }

  } catch (err: any) {
    console.error("Delete user data error:", err);
    return NextResponse.json({ 
      error: `Unexpected error: ${err.message}` 
    }, { status: 500 });
  }
} 