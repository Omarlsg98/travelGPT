"use client";

import { Activity } from "@travelgpt/packages/core/src";
import { ChatInterface } from "@travelgpt/packages/ui/src/components/main-page/ChatInterface";

import { InteractionInterface } from "@travelgpt/packages/ui/src/components/main-page/InteractionInterface";
import { useMessage } from "@travelgpt/packages/ui/src/hooks/MessageHook";
import { usePlan } from "@travelgpt/packages/ui/src/hooks/PlanHook";
import { use, useEffect, useState } from "react";

interface ChatInterfaceProps {
  setPlan: (plan: Activity[]) => void;
  initialMessages?: { text: string; sender: "user" | "agent" }[];
}

function ChatInterfaceWrapper({
  initialMessages,
  setPlan,
}: ChatInterfaceProps) {
  const [messages, setMessages] = useState<
    { text: string; sender: "user" | "agent" }[]
  >(initialMessages || []);

  useEffect(() => {
    setMessages(initialMessages || []);
  }, [initialMessages]);

  return;
}

interface ChatPageProps {
  params: Promise<{ chat_id: string }>;
}

export default function ChatPage({ params }: ChatPageProps) {
  const { chat_id } = use(params);
  const { messages, setMessages } = useMessage();
  const { plan, setPlan } = usePlan();

  useEffect(() => {
    async function loadChatData() {
      try {
        const res = await fetch(`/agent/chat?chat_id=${chat_id}`, {
          cache: "no-store",
        });
        if (!res.ok) {
          window.location.href = "/404";
          throw new Error("Failed to fetch chat data");
        }
        const data = await res.json();
        setMessages(
          data.messages.map((msg: any) => ({
            text: msg.message, 
            sender: msg.sender,
          }))
        );
        setPlan(data.plan);
      } catch (error) {
        console.error("Error loading chat data:", error);
      }
    }
    loadChatData();
  }, [chat_id]);

  return (
    <div className="flex flex-row items-start justify-center min-h-screen p-4 bg-gray-100 dark:bg-gray-900 gap-2">
      <ChatInterface
        setPlan={setPlan}
        messages={messages}
        setMessages={setMessages}
      />
      <InteractionInterface plan={plan} setPlan={setPlan} />
    </div>
  );
}
