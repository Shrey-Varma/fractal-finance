import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { processBalanceThresholds, processNewTransactionTriggers } from "@/utils/balanceTriggerEngine";

export const runtime = "nodejs";

export async function PUT(req: NextRequest) {
  try {
    const { id, name, goal, start_date, end_date, workflow, is_active = true } = await req.json();

    if (!id || !workflow) {
      return NextResponse.json({ error: "Missing automation ID or workflow schema" }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: userData, error: userError } = await supabase.auth.getUser();

    if (userError || !userData.user) {
      return NextResponse.json({ error: "User not authenticated" }, { status: 401 });
    }

    const normalizeDate = (value: string | null, reference?: string | null, isStartDate = false) => {
      // For start_date: if null, empty, or "now", default to current day
      if (isStartDate && (!value || value.toLowerCase() === 'now')) {
        return new Date().toISOString().split('T')[0];
      }
      
      if (!value) return null;

      const lower = value.toLowerCase();
      if (lower === 'indefinite' || lower === 'trigger') {
        // Build a far future date in 2125 with same month/day as reference or today
        const baseDate = reference && !isNaN(Date.parse(reference))
          ? new Date(reference)
          : new Date();
        const future = new Date(2125, baseDate.getMonth(), baseDate.getDate());
        return future.toISOString().split('T')[0];
      }

      const parsed = new Date(value);
      if (isNaN(parsed.getTime())) return null;
      return parsed.toISOString().split('T')[0];
    };

    const updatePayload = {
      name: name || `Automation ${new Date().toISOString()}`,
      goal: goal || null,
      start_date: normalizeDate(start_date, null, true), // Pass true for isStartDate
      end_date: normalizeDate(end_date, start_date),
      is_active,
      schema: workflow,
      updated_at: new Date().toISOString(),
    };

    // Update the automation, but only if it belongs to the current user
    const { data, error } = await supabase
      .from("flows")
      .update(updatePayload)
      .eq('id', id)
      .eq('user_id', userData.user.id) // Ensure user can only update their own automations
      .select();

    if (error) {
      console.error("Error updating workflow:", error);
      return NextResponse.json({ error: "Failed to update workflow" }, { status: 500 });
    }

    if (!data || data.length === 0) {
      return NextResponse.json({ error: "Automation not found or you don't have permission to update it" }, { status: 404 });
    }

    const updatedFlow = data[0];

    // Check if the updated workflow contains immediate execution triggers
    const hasBalanceThresholdTrigger = workflow?.triggers?.some((trigger: any) => 
      trigger.type === 'balance_threshold'
    );
    const hasNewTransactionTrigger = workflow?.triggers?.some((trigger: any) => 
      trigger.type === 'new_transaction'
    );

    // Execute triggers immediately if they are supported for immediate execution
    if (hasBalanceThresholdTrigger || hasNewTransactionTrigger) {
      console.log('🎯 [UPDATE-WORKFLOW] Immediate execution triggers detected...');
      let allResults = {
        balanceThreshold: null as any,
        newTransaction: null as any,
        executed: false,
        totalExecutions: 0,
        totalNotifications: 0
      };

      try {
        // Run balance threshold checks if present
        if (hasBalanceThresholdTrigger) {
          console.log('⚖️ [UPDATE-WORKFLOW] Running balance threshold check...');
          allResults.balanceThreshold = await processBalanceThresholds(userData.user.id);
          allResults.executed = true;
          allResults.totalExecutions += allResults.balanceThreshold.triggersExecuted;
          allResults.totalNotifications += allResults.balanceThreshold.notificationsSent;
          console.log('✅ [UPDATE-WORKFLOW] Balance threshold check completed:', allResults.balanceThreshold);
        }

        // Run new transaction checks if present
        if (hasNewTransactionTrigger) {
          console.log('🆕 [UPDATE-WORKFLOW] Running new transaction check...');
          allResults.newTransaction = await processNewTransactionTriggers(userData.user.id);
          allResults.executed = true;
          allResults.totalExecutions += allResults.newTransaction.triggersExecuted;
          allResults.totalNotifications += allResults.newTransaction.notificationsSent;
          console.log('✅ [UPDATE-WORKFLOW] New transaction check completed:', allResults.newTransaction);
        }
        
        return NextResponse.json({ 
          success: true, 
          flow: updatedFlow,
          immediateCheck: allResults
        });
      } catch (checkError) {
        console.error('❌ [UPDATE-WORKFLOW] Error during immediate trigger execution:', checkError);
        // Don't fail the update if trigger execution fails, just log it
        return NextResponse.json({ 
          success: true, 
          flow: updatedFlow,
          immediateCheck: {
            executed: false,
            error: 'Trigger execution failed but workflow updated successfully'
          }
        });
      }
    }

    return NextResponse.json({ success: true, flow: updatedFlow });
  } catch (err: any) {
    console.error("Update workflow error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
} 