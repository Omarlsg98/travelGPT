"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function ChatPage() {
  const router = useRouter();

  useEffect(() => {
    async function fetchLastChat() {
      const response = await fetch("/agent/chat", {
        method: "POST",
      });
      if (response.ok) {
        const data = await response.json();
        if (data.chat_id) {
          router.replace(`/chat/${data.chat_id}`);
        }
      } else {
        console.error("Failed to fetch last chat");
      }
    }
    fetchLastChat();
  }, [router]);

  return <div>Loading...</div>;
}
