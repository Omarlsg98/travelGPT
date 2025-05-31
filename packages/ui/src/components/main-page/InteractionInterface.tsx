"use client";

import {
  Activity,
  ExcelExporter,
} from "@travelgpt/packages/core/src/schedule-management";
import { Button } from "@travelgpt/packages/ui/src/shadcn/ui/button";
import { useState } from "react";

export function CalendarView({ activities }: { activities: Activity[] }) {
  // Determine date range
  const allDates = activities.flatMap((a) => [
    a.initialDatetime,
    a.finalDatetime,
  ]);
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
  stayActivities.sort(
    (a, b) => a.initialDatetime.getTime() - b.initialDatetime.getTime()
  );

  // Render other activities by hour and day
  const otherActivities = activities.filter((a) => a.activityType !== "Stay");

  // Helper to check if two dates are same day
  const isSameDay = (d1: Date, d2: Date) =>
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate();

  const getDayDate = (date: Date): Date => {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0); // Normalize to start of day
    return d;
  };

  // Returns the maximum number of overlapping Stay activities for any day (number)
  const getMaxOverlappingStays = (activities: Activity[]): number => {
    const stayCounts: Record<string, number> = {};
    activities.forEach((activity) => {
      if (activity.activityType === "Stay") {
        for (
          let d = new Date(activity.initialDatetime);
          d <= activity.finalDatetime;
          d.setDate(d.getDate() + 1)
        ) {
          const key = d.toISOString().split("T")[0];
          stayCounts[key] = (stayCounts[key] || 0) + 1;
        }
      }
    });
    return Math.max(0, ...Object.values(stayCounts)) + 1;
  };

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
          <th className="border border-gray-300 dark:border-gray-700 bg-gray-100 dark:bg-gray-700 sticky top-0 z-10 w-16">
            Time
          </th>
          {days.map((day) => (
            <th
              key={day.toISOString()}
              className="border border-gray-300 dark:border-gray-700 bg-gray-100 dark:bg-gray-700 sticky top-0 z-10"
              title={day.toLocaleDateString()}
            >
              {day.toLocaleDateString("en-US", {
                weekday: "short",
                month: "short",
                day: "numeric",
              })}
            </th>
          ))}
        </tr>
        {/* Stay activities row */}
        {stayActivities.length > 0 &&
          Array.from({
            length: getMaxOverlappingStays(stayActivities),
          }).map((_, rowIdx) => (
            <tr key={`stay-row-${rowIdx}`}>
              {stayActivities.length > 0 && rowIdx === 0 && (
                <td
                  className="border border-gray-300 dark:border-gray-700 bg-purple-100 dark:bg-purple-700 font-semibold"
                  rowSpan={getMaxOverlappingStays(stayActivities)}
                >
                  Stays
                </td>
              )}
              {days.map((day, dayIdx) => {
                // Pick the stay for this row (using modulo)
                // Get all stays for this row by striding stayActivities with step getMaxOverlappingStays
                const staysForThisRow = [];
                for (
                  let i = rowIdx;
                  i < stayActivities.length;
                  i += getMaxOverlappingStays(stayActivities)
                ) {
                  staysForThisRow.push(stayActivities[i]);
                }
                if (staysForThisRow.length === 0) {
                  return (
                    <td
                      key={day.toISOString()}
                      className="border border-gray-300 dark:border-gray-700"
                    ></td>
                  );
                }
                // Filter stays covering this day
                const stay = staysForThisRow.filter(
                  (a) =>
                    getDayDate(a.initialDatetime) <= day &&
                    getDayDate(a.finalDatetime) >= day
                )[0];
                // Only render if this stay hasn't already been rendered for this day in a previous cell
                if (stay) {
                  // Find all days this stay covers
                  const startIdx = days.findIndex((d) =>
                    isSameDay(d, stay.initialDatetime)
                  );
                  const endIdx = days.findIndex((d) =>
                    isSameDay(d, stay.finalDatetime)
                  );
                  const colSpan = endIdx - startIdx + 1;
                  // Only render at the start day for this stay and this row
                  if (getDayDate(stay.initialDatetime) < day) {
                    return null; // Skip rendering this cell
                  }
                  return (
                    <td
                      key={day.toISOString()}
                      colSpan={colSpan}
                      rowSpan={1}
                      className="border border-gray-300 dark:border-gray-700 bg-purple-300 dark:bg-purple-600 text-center font-semibold"
                    >
                      {`${stay.city}${
                        stay.providerCompany
                          ? `, ${stay.providerCompany}`
                          : ", TBD"
                      }`}
                    </td>
                  );
                }
                // No stay for this row/day
                return (
                  <td
                    key={day.toISOString()}
                    className="border border-gray-300 dark:border-gray-700"
                  ></td>
                );
              })}
            </tr>
          ))}
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
                const startDayKey = activity.initialDatetime
                  .toISOString()
                  .split("T")[0];
                if (dayKey === startDayKey && hour === startHour) {
                  const colSpan = 1;
                  const rowSpan = endHour - startHour + 1;
                  return (
                    <td
                      key={dayKey + hour}
                      rowSpan={rowSpan}
                      className={`${getActivityColor(
                        activity.activityType
                      )} border border-gray-300 dark:border-gray-700 text-center align-middle`}
                      title={`${activity.activityName} (${activity.city})`}
                    >
                      {activity.activityName}
                    </td>
                  );
                }
                return null; // skip cells merged by rowspan
              }
              return (
                <td
                  key={dayKey + hour}
                  className="border border-gray-300 dark:border-gray-700"
                ></td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function ListView({
  plan,
  extraFieldKeys,
  listColumns,
}: {
  plan: Activity[];
  extraFieldKeys: string[];
  listColumns: { header: string; key: string }[];
}) {
  return (
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
            <tr
              key={idx}
              className="border-b border-gray-200 dark:border-gray-700"
            >
              {listColumns.map((col) => (
                <td key={col.key} className="px-2 py-1 text-xs">
                  {(() => {
                    switch (col.key) {
                      case "initialDatetime":
                        return new Date(
                          activity.initialDatetime
                        ).toLocaleString();
                      case "finalDatetime":
                        return new Date(
                          activity.finalDatetime
                        ).toLocaleString();
                      case "totalTime":
                        const start = new Date(activity.initialDatetime);
                        const end = new Date(activity.finalDatetime);
                        const diff = end.getTime() - start.getTime();
                        const totalMinutes = Math.floor(diff / (1000 * 60));
                        const days = Math.floor(totalMinutes / (60 * 24));
                        const hours = Math.floor(
                          (totalMinutes % (60 * 24)) / 60
                        );
                        const minutes = totalMinutes % 60;
                        if (days > 0) {
                          return `${days}d`;
                        }
                        return `${hours}h`;
                      case "weekday":
                        return new Date(
                          activity.initialDatetime
                        ).toLocaleDateString("en-US", { weekday: "long" });
                      case "city":
                        return activity.city;
                      case "activityName":
                        return activity.activityName;
                      case "activityType":
                        return activity.activityType;
                      case "price":
                        return activity.price !== undefined
                          ? activity.price
                          : "";
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
  );
}

interface IProps {
  plan: Activity[];
  setPlan: (plan: Activity[]) => void;
}

export function InteractionInterface({ plan, setPlan }: IProps) {
  const [planView, setPlanView] = useState<"list" | "calendar">("list");

  const listColumns = [
    { header: "Initial Datetime", key: "initialDatetime" },
    { header: "Final Datetime", key: "finalDatetime" },
    { header: "Time Elapsed", key: "totalTime" },
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

  const extraFieldKeys = Array.from(
    plan.reduce((set, activity) => {
      if (activity.extraFields) {
        Object.keys(activity.extraFields).forEach((key) => set.add(key));
      }
      return set;
    }, new Set<string>())
  );

  const planWithDates = plan.map((activity) => ({
    ...activity,
    initialDatetime: new Date(activity.initialDatetime),
    finalDatetime: new Date(activity.finalDatetime),
  }));

  const handleGenerateExcel = async () => {
    try {
      if (plan.length === 0) {
        alert(
          "No travel plan available to generate Excel. Please get a plan first."
        );
        return;
      }

      const excelExporter = new ExcelExporter();
      const buffer = await excelExporter.exportCombinedExcel(plan);

      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
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
    <div
      className={`w-full max-w-2xl h-[80vh] flex flex-col bg-white dark:bg-gray-800 rounded-lg shadow p-4 transition-all duration-300`}
    >
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
          <ListView
            plan={plan}
            extraFieldKeys={extraFieldKeys}
            listColumns={listColumns}
          />
        ) : (
          <CalendarView activities={planWithDates} />
        )}
      </div>
      <div className="mt-4">
        <Button onClick={handleGenerateExcel} className="w-full">
          Generate Excel
        </Button>
      </div>
    </div>
  );
}
