import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: userData, error: userError } = await supabase.auth.getUser();

    if (userError || !userData.user) {
      return NextResponse.json({ error: "User not authenticated" }, { status: 401 });
    }

    // Get all unique goals from user's flows
    const { data: flows, error } = await supabase
      .from('flows')
      .select('goal')
      .eq('user_id', userData.user.id)
      .not('goal', 'is', null);

    if (error) {
      console.error("Error fetching goals:", error);
      return NextResponse.json({ error: "Failed to fetch goals" }, { status: 500 });
    }

    // Extract unique goal names
    const uniqueGoals = Array.from(new Set(
      flows?.map(flow => flow.goal).filter(Boolean) || []
    )).sort();

    return NextResponse.json({ 
      success: true, 
      goals: uniqueGoals 
    });
  } catch (err: any) {
    console.error("Get goals error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
} 