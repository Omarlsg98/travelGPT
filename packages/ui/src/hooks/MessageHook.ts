"use client";

import { useState } from "react";

export function useMessage() {
  const [messages, setMessages] = useState<
    { text: string; sender: "user" | "agent" }[]
  >([]);

  return {
    messages,
    setMessages,
  };
}
