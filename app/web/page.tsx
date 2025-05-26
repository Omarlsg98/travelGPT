"use client";

import { Activity } from "@travelgpt/packages/core/src";
import { Button } from "@travelgpt/packages/ui/src/shadcn/ui/button";
import { Card, CardContent, CardFooter } from "@travelgpt/packages/ui/src/shadcn/ui/card";
import { Input } from "@travelgpt/packages/ui/src/shadcn/ui/input";
import { useState } from "react";

export default function Home() {
  const [messages, setMessages] = useState<{ text: string; sender: "user" | "agent" }[]>([
    { text: "Welcome to the Travel Agent! Tell me about your travel plans.", sender: "agent" }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [plan , setPlan] = useState<Activity[]>([]);

  const handleSendMessage = async () => {
    if (input.trim()) {
      const userMessage = input;
      setMessages((prevMessages) => [...prevMessages, { text: userMessage, sender: "user" }]);
      setInput("");

      try {
        setLoading(true);

        const response = await fetch("/agent/send", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ query: userMessage }),
        });

        if (!response.ok) {
          setLoading(false);
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log("Agent Response Data:", data);

        // Assuming the agent's conversational response is in data.conversation
        if (data.conversation) {
          setMessages((prevMessages) => [
            ...prevMessages,
            { text: data.conversation, sender: "agent" },
          ]);
        } else {
          setMessages((prevMessages) => [
            ...prevMessages,
            { text: "Agent responded, but no conversational message found.", sender: "agent" },
          ]);
        }

        // Assuming the agent's travel plan is in data.plan
        if (data.plan && Array.isArray(data.plan)) {
          setPlan(data.plan);
        } else {
          console.warn("No valid travel plan found in agent response.");
        }

      } catch (error) {
        console.error("Failed to send message to agent:", error);
        setMessages((prevMessages) => [
          ...prevMessages,
          { text: `Error: Failed to get response from agent. ${error instanceof Error ? error.message : String(error)}`, sender: "agent" },
        ]);
      }
    }
  };

  const handleGenerateExcel = async () => {
    try {
      const response = await fetch("/agent/export-excel");
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "travel_schedule.xlsx";
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      alert("Excel file generated and downloaded!");
    } catch (error) {
      console.error("Failed to generate Excel file:", error);
      alert("Failed to generate Excel file. Please try again.");
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-gray-100 dark:bg-gray-900">
      <Card className="w-full max-w-2xl h-[70vh] flex flex-col">
        <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((msg, index) => (
            <div
              key={index}
              className={`flex ${
                msg.sender === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`max-w-[70%] p-3 rounded-lg ${
                  msg.sender === "user"
                    ? "bg-blue-500 text-white"
                    : "bg-gray-300 text-gray-800 dark:bg-gray-700 dark:text-gray-200"
                }`}
              >
                {msg.text}
              </div>
            </div>
          ))}
        </CardContent>
        <CardFooter className="flex flex-col gap-2 p-4 border-t">
          <div className="flex w-full space-x-2">
            <Input
              placeholder="Type your message..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e: React.KeyboardEvent<HTMLInputElement>) => {
                if (e.key === "Enter") {
                  handleSendMessage();
                }
              }}
            />
            <Button onClick={handleSendMessage}>Send</Button>
          </div>
          <Button onClick={handleGenerateExcel} className="w-full">
            Generate Excel
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
