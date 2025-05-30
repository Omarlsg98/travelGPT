"use client";

import { Activity, ExcelExporter } from "@travelgpt/packages/core/src/schedule-management";
import { Button } from "@travelgpt/packages/ui/src/shadcn/ui/button";
import { Card, CardContent, CardFooter } from "@travelgpt/packages/ui/src/shadcn/ui/card";
import { Input } from "@travelgpt/packages/ui/src/shadcn/ui/input";
import React, { useState } from "react";

function CalendarView({ activities }: { activities: Activity[] }) {
  // Determine date range
  const allDates = activities.flatMap((a) => [a.initialDatetime, a.finalDatetime]);
  const minDate = new Date(Math.min(...allDates.map((d) => d.getTime())));
  const maxDate = new Date(Math.max(...allDates.map((d) => d.getTime())));

  // Normalize minDate to start of day
  minDate.setHours(0, 0, 0, 0);
  maxDate.setHours(23, 59, 59, 999);

  // Generate array of days
  const days: Date[] = [];
  for (let d = new Date(minDate); d <= maxDate; d.setDate(d.getDate() + 1)) {
    days.push(new Date(d));
  }

  // Generate array of hours (0-23)
  const hours = Array.from({ length: 24 }, (_, i) => i);

  // Helper to get activity color
  const getActivityColor = (activityType: Activity["activityType"]) => {
    switch (activityType) {
      case "Flight":
        return "bg-red-200";
      case "Transportation":
        return "bg-yellow-200";
      case "Attraction":
        return "bg-green-200";
      case "Meal":
        return "bg-blue-200";
      case "Other":
        return "bg-gray-200";
      case "Stay":
        return "bg-purple-200";
      default:
        return "bg-white";
    }
  };

  // Render Stay activities as merged cells at top
  const stayActivities = activities.filter((a) => a.activityType === "Stay");

  // Render other activities by hour and day
  const otherActivities = activities.filter((a) => a.activityType !== "Stay");

  // Helper to check if two dates are same day
  const isSameDay = (d1: Date, d2: Date) =>
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate();

  // Build a map for quick lookup of activities by day and hour
  const activityMap: Record<string, Record<number, Activity | null>> = {};
  days.forEach((day) => {
    const dayKey = day.toISOString().split("T")[0];
    activityMap[dayKey] = {};
    hours.forEach((hour) => {
      activityMap[dayKey][hour] = null;
    });
  });

  otherActivities.forEach((activity) => {
    const startDayKey = activity.initialDatetime.toISOString().split("T")[0];
    const endDayKey = activity.finalDatetime.toISOString().split("T")[0];
    const startHour = activity.initialDatetime.getHours();
    const endHour = activity.finalDatetime.getHours();

    // Only map activities that start and end on the same day for simplicity
    if (startDayKey === endDayKey && activityMap[startDayKey]) {
      for (let h = startHour; h <= endHour; h++) {
        activityMap[startDayKey][h] = activity;
      }
    }
  });

  return (
    <table className="min-w-full border border-gray-300 dark:border-gray-700 table-fixed text-xs">
      <thead>
        <tr>
          <th className="border border-gray-300 dark:border-gray-700 bg-gray-100 dark:bg-gray-700 sticky top-0 z-10 w-16">Time</th>
          {days.map((day) => (
            <th
              key={day.toISOString()}
              className="border border-gray-300 dark:border-gray-700 bg-gray-100 dark:bg-gray-700 sticky top-0 z-10"
              title={day.toLocaleDateString()}
            >
              {day.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
            </th>
          ))}
        </tr>
        {/* Stay activities row */}
        {stayActivities.length > 0 && (
          <tr>
            <td className="border border-gray-300 dark:border-gray-700 bg-purple-100 dark:bg-purple-700 font-semibold">Stay</td>
            {days.map((day, idx) => {
              // Check if any stay activity covers this day
              const stay = stayActivities.find(
                (a) =>
                  a.initialDatetime <= day &&
                  a.finalDatetime >= day
              );
              if (stay) {
                // Calculate span of days for this stay
                const startIdx = days.findIndex((d) => isSameDay(d, stay.initialDatetime));
                const endIdx = days.findIndex((d) => isSameDay(d, stay.finalDatetime));
                const colSpan = endIdx - startIdx + 1;
                if (idx === startIdx) {
                  return (
                    <td
                      key={day.toISOString()}
                      colSpan={colSpan}
                      className="border border-gray-300 dark:border-gray-700 bg-purple-300 dark:bg-purple-600 text-center font-semibold"
                    >
                      {stay.city}, {stay.providerCompany ?? "N/A"}
                    </td>
                  );
                }
                return null; // skip cells covered by colspan
              }
              return <td key={day.toISOString()} className="border border-gray-300 dark:border-gray-700"></td>;
            })}
          </tr>
        )}
      </thead>
      <tbody>
        {hours.map((hour) => (
          <tr key={hour}>
            <td className="border border-gray-300 dark:border-gray-700 bg-gray-100 dark:bg-gray-700 text-right pr-1 font-mono">
              {hour.toString().padStart(2, "0")}:00
            </td>
            {days.map((day) => {
              const dayKey = day.toISOString().split("T")[0];
              const activity = activityMap[dayKey]?.[hour];
              if (activity) {
                // Check if this is the first hour cell for this activity to render merged cells
                const startHour = activity.initialDatetime.getHours();
                const endHour = activity.finalDatetime.getHours();
                const startDayKey = activity.initialDatetime.toISOString().split("T")[0];
                if (dayKey === startDayKey && hour === startHour) {
                  const colSpan = 1;
                  const rowSpan = endHour - startHour + 1;
                  return (
                    <td
                      key={dayKey + hour}
                      rowSpan={rowSpan}
                      className={`${getActivityColor(activity.activityType)} border border-gray-300 dark:border-gray-700 text-center align-middle`}
                      title={`${activity.activityName} (${activity.city})`}
                    >
                      {activity.activityName}
                    </td>
                  );
                }
                return null; // skip cells merged by rowspan
              }
              return <td key={dayKey + hour} className="border border-gray-300 dark:border-gray-700"></td>;
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

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

  const handleGenerateExcel = async () => {
    try {
      if (plan.length === 0) {
        alert("No travel plan available to generate Excel. Please get a plan first.");
        return;
      }

      // The ExcelExporter expects an array of Activity objects
      const excelExporter = new ExcelExporter();
      const buffer = await excelExporter.exportCombinedExcel(plan);

      const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
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

  // Plan view toggle state
  const [planView, setPlanView] = useState<"list" | "calendar">("list");

  // Table columns for list view (matching Excel export)
  const listColumns = [
    { header: "Initial Datetime", key: "initialDatetime" },
    { header: "Final Datetime", key: "finalDatetime" },
    { header: "Weekday", key: "weekday" },
    { header: "City", key: "city" },
    { header: "Activity Name", key: "activityName" },
    { header: "Activity Type", key: "activityType" },
    { header: "Price", key: "price" },
    { header: "Provider", key: "providerCompany" },
    { header: "Extra Details", key: "extraDetails" },
    { header: "Purchased", key: "purchased" },
    { header: "Link to Buy", key: "linkToBuy" },
  ];

  // Helper to get all extraField keys for dynamic columns
  const extraFieldKeys = Array.from(
    plan.reduce((set, activity) => {
      if (activity.extraFields) {
        Object.keys(activity.extraFields).forEach((key) => set.add(key));
      }
      return set;
    }, new Set<string>())
  );

  return (
    <div className="flex flex-row items-start justify-center min-h-screen p-4 bg-gray-100 dark:bg-gray-900 gap-6">
      {/* Chat panel (left) */}
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
          {loading && (
            <div className="flex justify-start">
              <div className="max-w-[70%] p-3 rounded-lg bg-gray-300 text-gray-800 dark:bg-gray-700 dark:text-gray-200 animate-pulse">
                Agent is answering...
              </div>
            </div>
          )}
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
            <Button onClick={handleSendMessage} disabled={loading}>
              {loading ? (
                <svg
                  className="animate-spin h-5 w-5 text-white mx-auto"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
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
          <Button onClick={handleGenerateExcel} className="w-full">
            Generate Excel
          </Button>
        </CardFooter>
      </Card>

      {/* Plan panel (right) */}
      <div className="w-full max-w-3xl h-[70vh] flex flex-col bg-white dark:bg-gray-800 rounded-lg shadow p-4">
        {/* Toggle */}
        <div className="flex justify-end mb-4">
          <Button
            variant={planView === "list" ? "default" : "outline"}
            onClick={() => setPlanView("list")}
            className="mr-2"
          >
            List
          </Button>
          <Button
            variant={planView === "calendar" ? "default" : "outline"}
            onClick={() => setPlanView("calendar")}
          >
            Calendar
          </Button>
        </div>
        {/* Plan content */}
        <div className="flex-1 overflow-y-auto">
          {plan.length === 0 ? (
            <div className="text-gray-500 dark:text-gray-400 flex items-center justify-center h-full">
              No plan available. Get a plan to see it here.
            </div>
          ) : planView === "list" ? (
            // List/Table view
            <div className="overflow-x-auto">
              <table className="min-w-full border border-gray-300 dark:border-gray-700">
                <thead>
                  <tr>
                    {listColumns.map((col) => (
                      <th
                        key={col.key}
                        className="px-2 py-1 border-b border-gray-300 dark:border-gray-700 bg-gray-100 dark:bg-gray-700 text-left text-xs font-semibold"
                      >
                        {col.header}
                      </th>
                    ))}
                    {extraFieldKeys.map((key) => (
                      <th
                        key={key}
                        className="px-2 py-1 border-b border-gray-300 dark:border-gray-700 bg-gray-100 dark:bg-gray-700 text-left text-xs font-semibold"
                      >
                        Extra: {key}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {plan.map((activity, idx) => (
                    <tr key={idx} className="border-b border-gray-200 dark:border-gray-700">
                      {listColumns.map((col) => (
                        <td key={col.key} className="px-2 py-1 text-xs">
                          {(() => {
                            switch (col.key) {
                              case "initialDatetime":
                                return new Date(activity.initialDatetime).toLocaleString();
                              case "finalDatetime":
                                return new Date(activity.finalDatetime).toLocaleString();
                              case "weekday":
                                return new Date(activity.initialDatetime).toLocaleDateString("en-US", { weekday: "long" });
                              case "city":
                                return activity.city;
                              case "activityName":
                                return activity.activityName;
                              case "activityType":
                                return activity.activityType;
                              case "price":
                                return activity.price !== undefined ? activity.price : "";
                              case "providerCompany":
                                return activity.providerCompany ?? "";
                              case "extraDetails":
                                return activity.extraDetails ?? "";
                              case "purchased":
                                return activity.purchased ? "Yes" : "No";
                              case "linkToBuy":
                                return activity.linkToBuy ?? "";
                              default:
                                return "";
                            }
                          })()}
                        </td>
                      ))}
                      {extraFieldKeys.map((key) => (
                        <td key={key} className="px-2 py-1 text-xs">
                          {activity.extraFields?.[key] ?? ""}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            // Calendar view
            <div className="overflow-x-auto">
              <CalendarView activities={plan} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
