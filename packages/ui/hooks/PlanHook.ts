"use client";

import { Activity } from "@travelgpt/packages/core/src/schedule-management";
import { useState } from "react";

export function usePlan() {
  const [plan, setPlan] = useState<Activity[]>([]);

  return {
    plan,
    setPlan,
 };
}
