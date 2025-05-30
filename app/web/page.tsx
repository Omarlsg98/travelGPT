

"use client";

import { ChatInterface } from "@travelgpt/packages/ui/src/components/main-page/ChatInterface";
import { InteractionInterface } from "@travelgpt/packages/ui/src/components/main-page/InteractionInterface";

import { usePlan } from "@travelgpt/packages/ui/hooks/PlanHook";

export default function Home() {
  const { plan, setPlan } = usePlan();

  return (
    <div className="flex flex-row items-start justify-center min-h-screen p-4 bg-gray-100 dark:bg-gray-900 gap-2">
      <ChatInterface setPlan={setPlan} />
      <InteractionInterface plan={plan} setPlan={setPlan}/>
    </div>
  );
}
