import { TravelAgent } from '@travelgpt/packages/core/src/agent-logic';
import { apiConfig, llmConfig } from '@travelgpt/packages/core/src/config';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { query } = await request.json();

    if (!query) {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 });
    }

    const travelAgent = new TravelAgent(llmConfig, apiConfig);
    await travelAgent.initialize(); // Initialize the LLM connection

    const travelPlan = await travelAgent.generateTravelPlan(query);

    return NextResponse.json(travelPlan, { status: 200 });
  } catch (error: any) {
    console.error('Error in /api/agent/send:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
