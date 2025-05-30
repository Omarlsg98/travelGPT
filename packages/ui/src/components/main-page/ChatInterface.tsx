"use client";

import { Activity } from "@travelgpt/packages/core/src";
import { Button } from "@travelgpt/packages/ui/src/shadcn/ui/button";
import { Input } from "@travelgpt/packages/ui/src/shadcn/ui/input";
import React, { useState } from "react";

export function ChatInterface({ setPlan }: { setPlan: (plan: Activity[]) => void }) {
  const [chatVisible, setChatVisible] = useState(true);
  const [messages, setMessages] = useState<{ text: string; sender: "user" | "agent" }[]>([
    { text: "Welcome to the Travel Agent! Tell me about your travel plans.", sender: "agent" }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

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

        if (data.conversation) {
          setMessages((prevMessages) => [
            ...prevMessages,
            { text: data.conversation, sender: "agent" },
          ]);
          setPlan(data.plan);
        } else {
          setMessages((prevMessages) => [
            ...prevMessages,
            { text: "Agent responded, but no conversational message found.", sender: "agent" },
          ]);
        }

        setLoading(false);
      } catch (error) {
        console.error("Failed to send message to agent:", error);
        setMessages((prevMessages) => [
          ...prevMessages,
          { text: `Error: Failed to get response from agent. ${error instanceof Error ? error.message : String(error)}`, sender: "agent" },
        ]);
      }
    }
  };

  return (
    <>
      {/* Chat panel toggle button */}
      <div className="flex flex-col justify-center">
        <button
          onClick={() => setChatVisible(!chatVisible)}
          className="p-1 rounded bg-gray-300 dark:bg-gray-700 hover:bg-gray-400 dark:hover:bg-gray-600"
          aria-label={chatVisible ? "Hide chat panel" : "Show chat panel"}
          title={chatVisible ? "Hide chat panel" : "Show chat panel"}
        >
          {chatVisible ? (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6 text-gray-700 dark:text-gray-300"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          ) : (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6 text-gray-700 dark:text-gray-300"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          )}
        </button>
      </div>

      {/* Chat panel (left) */}
      {chatVisible && (
        <div className="w-full max-w-2xl h-[80vh] flex flex-col">
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((msg, index) => (
              <div
                key={index}
                className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[70%] p-3 rounded-lg ${msg.sender === "user"
                    ? "bg-blue-500 text-white"
                    : "bg-gray-300 text-gray-800 dark:bg-gray-700 dark:text-gray-200"
                    }`}
                >
                  {msg.text}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="max-w-[70%] p-3 rounded-lg bg-gray-300 text-gray-800 dark:bg-gray-700 dark:text-gray-200 animate-pulse">
                  Agent is answering...
                </div>
              </div>
            )}
          </div>
          <div className="flex flex-col gap-2 p-4 border-t">
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
                className="flex-1 rounded border border-gray-300 dark:border-gray-700 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
              />
              <Button onClick={handleSendMessage} disabled={loading}>
                {loading ? (
                  <svg
                    className="animate-spin h-5 w-5 text-white mx-auto"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth="4"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                    ></path>
                  </svg>
                ) : (
                  "Send"
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
