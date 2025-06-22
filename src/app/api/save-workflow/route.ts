import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { processBalanceThresholds, processNewTransactionTriggers } from "@/utils/balanceTriggerEngine";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const { name, start_date, end_date, workflow, is_active = true } = await req.json();

    if (!workflow) {
      return NextResponse.json({ error: "Missing workflow schema" }, { status: 400 });
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

    const insertPayload = {
      user_id: userData.user.id,
      name: name || `Automation ${new Date().toISOString()}`,
      start_date: normalizeDate(start_date, null, true), // Pass true for isStartDate
      end_date: normalizeDate(end_date, start_date),
      is_active,
      schema: workflow,
    };

    // Use regular supabase client - RLS policies will handle authorization
    const { data, error } = await supabase.from("flows").insert(insertPayload).select();

    if (error) {
      console.error("Error saving workflow:", error);
      return NextResponse.json({ error: "Failed to save workflow" }, { status: 500 });
    }

    const savedFlow = data?.[0];

    // Check if the workflow contains immediate execution triggers
    const hasBalanceThresholdTrigger = workflow?.triggers?.some((trigger: any) => 
      trigger.type === 'balance_threshold'
    );
    const hasNewTransactionTrigger = workflow?.triggers?.some((trigger: any) => 
      trigger.type === 'new_transaction'
    );

    // Execute triggers immediately if they are supported for immediate execution
    if (hasBalanceThresholdTrigger || hasNewTransactionTrigger) {
      console.log('🎯 [SAVE-WORKFLOW] Immediate execution triggers detected...');
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
          console.log('⚖️ [SAVE-WORKFLOW] Running balance threshold check...');
          allResults.balanceThreshold = await processBalanceThresholds(userData.user.id);
          allResults.executed = true;
          allResults.totalExecutions += allResults.balanceThreshold.triggersExecuted;
          allResults.totalNotifications += allResults.balanceThreshold.notificationsSent;
          console.log('✅ [SAVE-WORKFLOW] Balance threshold check completed:', allResults.balanceThreshold);
        }

        // Run new transaction checks if present
        if (hasNewTransactionTrigger) {
          console.log('🆕 [SAVE-WORKFLOW] Running new transaction check...');
          allResults.newTransaction = await processNewTransactionTriggers(userData.user.id);
          allResults.executed = true;
          allResults.totalExecutions += allResults.newTransaction.triggersExecuted;
          allResults.totalNotifications += allResults.newTransaction.notificationsSent;
          console.log('✅ [SAVE-WORKFLOW] New transaction check completed:', allResults.newTransaction);
        }
        
        return NextResponse.json({ 
          success: true, 
          flow: savedFlow,
          immediateCheck: allResults
        });
      } catch (checkError) {
        console.error('❌ [SAVE-WORKFLOW] Error during immediate trigger execution:', checkError);
        // Don't fail the save if trigger execution fails, just log it
        return NextResponse.json({ 
          success: true, 
          flow: savedFlow,
          immediateCheck: {
            executed: false,
            error: 'Trigger execution failed but workflow saved successfully'
          }
        });
      }
    }

    return NextResponse.json({ success: true, flow: savedFlow });
  } catch (err: any) {
    console.error("Save workflow error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
} 