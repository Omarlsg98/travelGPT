import { PrismaClient } from "@prisma/client";
import { Activity } from "@travelgpt/packages/core/src";
import { TravelAgent } from "@travelgpt/packages/core/src/agent-logic";
import { apiConfig, llmConfig } from "@travelgpt/packages/core/src/config";
import { NextResponse } from "next/server";

const dbClient = new PrismaClient();

export async function POST(request: Request) {
  try {
    const { query } = await request.json();

    if (!query) {
      return NextResponse.json({ error: "Query is required" }, { status: 400 });
    }

    // Upsert user Omar
    let user = await dbClient.user.upsert({
      where: { user_id: "omar-unique-id" },
      update: {},
      create: {
        user_id: "omar-unique-id",
        name: "Omar",
        summary: "Seed user Omar",
        preferences: "{}",
      },
    });

    // Save incoming message
    await dbClient.message.create({
      data: {
        time: new Date(),
        user_id: user.user_id,
        message: query,
        message_type: "incoming",
        sender: "user",
      },
    });

    // Fetch previous messages and last plan
    const previousMessages = await dbClient.message.findMany({
      where: { user_id: user.user_id },
      orderBy: { time: "asc" },
    });
    const plans = await dbClient.plan.findMany({
      where: { user_id: user.user_id },
      orderBy: { timeCreation: "desc" },
    });
    const lastPlan = plans.length > 0 ? plans[0] : null;

    // Prepare input for generateTravelPlan
    const travelAgent = new TravelAgent(llmConfig, apiConfig);
    await travelAgent.initialize();

    // generateTravelPlan expects a string query, so we combine context info into a string
    let contextString = query;
    if (previousMessages && previousMessages.length > 0) {
      contextString +=
        "\nPrevious messages:\n" +
        previousMessages.map((m: { message: string }) => m.message).join("\n");
    }
    if (lastPlan) {
      contextString +=
        "\nLast plan summary:\n" + (lastPlan.summary_of_plan || "");
    }

    const travelPlan: {
      conversation: string;
      travelDetails: {
        destination: string;
        startDate: string;
        endDate: string;
        days: number;
      };
      plan: Array<Activity>;
    } = await travelAgent.generateTravelPlan(contextString);

    // Save outgoing message and plan with activities
    const outgoingMessage = await dbClient.message.create({
      data: {
        time: new Date(),
        user_id: user.user_id,
        message: JSON.stringify(travelPlan.conversation),
        message_type: "outgoing",
        sender: "agent",
      },
    });

    const plan = await dbClient.plan.create({
      data: {
        user_id: user.user_id,
        timeCreation: new Date(),
        version_number: 1,
        message_id_created: outgoingMessage.id,
        context: JSON.stringify(travelPlan.travelDetails),
        summary_of_plan: "",
      },
    });

    if (
      travelPlan.plan &&
      Array.isArray(travelPlan.plan)
    ) {
      for (const activity of  travelPlan.plan) {
        await dbClient.activity.create({
          data: {
            plan_id: plan.id,
            initialDatetime: new Date(activity.initialDatetime),
            finalDatetime: new Date(activity.finalDatetime),
            city: activity.city,
            activityName: activity.activityName,
            activityType: activity.activityType,
            price: activity.price,
            providerCompany: activity.providerCompany,
            extraDetails: activity.extraDetails,
            extraFields: activity.extraFields,
            linkToBuy: activity.linkToBuy,
            purchased: activity.purchased,
          },
        });
      }
    }

    return NextResponse.json(travelPlan, { status: 200 });
  } catch (error: any) {
    console.error("Error in /api/agent/send:", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
