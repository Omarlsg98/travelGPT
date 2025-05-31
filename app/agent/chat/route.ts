import { PrismaClient } from "@prisma/client";
import { NextResponse } from "next/server";

const dbClient = new PrismaClient();

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const chatId = url.searchParams.get("chat_id");
    if (!chatId) {
      return NextResponse.json({ error: "chat_id is required" }, { status: 400 });
    }

    // Fetch plan by id
    const planRecord = await dbClient.plan.findUnique({
      where: { id: chatId },
    });

    if (!planRecord) {
      return NextResponse.json({ error: "Chat not found" }, { status: 404 });
    }

    // Fetch activities for the plan
    const activities = await dbClient.activity.findMany({
      where: { plan_id: planRecord.id },
    });

    // Fetch messages linked to the user and plan creation time (approximate conversation)
    const messagesRaw = await dbClient.message.findMany({
      where: { user_id: planRecord.user_id },
      orderBy: { time: "asc" },
    });

    return NextResponse.json({
      plan: activities,
      messages: messagesRaw,
    });
  } catch (error: any) {
    console.error("Error in /agent/chat GET:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    // Upsert user Omar
    const user = await dbClient.user.upsert({
      where: { user_id: "omar-unique-id" },
      update: {},
      create: {
        user_id: "omar-unique-id",
        name: "Omar",
        summary: "Seed user Omar",
        preferences: "{}",
      },
    });

    // Get last plan for user Omar
    const lastPlan = await dbClient.plan.findFirst({
      where: { user_id: user.user_id },
      orderBy: { timeCreation: "desc" },
    });

    if (!lastPlan) {
      // If no plan exists, create a new empty plan (optional)
      const newPlan = await dbClient.plan.create({
        data: {
          user_id: user.user_id,
          timeCreation: new Date(),
          version_number: 1,
          message_id_created: "",
          context: "{}",
          summary_of_plan: "",
        },
      });

    await dbClient.message.create({
      data: {
        user_id: user.user_id,
        plan_id: newPlan.id,
        message: "Welcome to the Travel Agent! Tell me about your travel plans.",
        message_type: "outgoing",
        sender: "agent",
        time: new Date(),
      },
    });

      return NextResponse.json({ chat_id: newPlan.id });
    } else {
      return NextResponse.json({ chat_id: lastPlan.id });
    }
  } catch (error: any) {
    console.error("Error in /agent/chat POST:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
