// packages/core/src/schedule-management.ts

/**
 * Interface for a single activity in the travel schedule.
 */
export interface Activity {
  initialDatetime: Date;
  finalDatetime: Date;
  weekday: string;
  city: string;
  activityName: string;
  activityType: "Stay" | "Flight" | "Transportation" | "Attraction" | "Meal" | "Other";
  price?: number; // Optional price
  providerCompany?: string; // Optional provider company
  extraDetails?: string; // Optional extra details
  extraFields?: Record<string, any>; // Optional flexible extra fields
  linkToBuy?: string; // Optional link to purchase
  purchased: boolean; // Indicates if the activity has been purchased
}

/**
 * Parses LLM-proposed schedules into a structured format.
 */
export class ScheduleParser {
  /**
   * Parses a raw LLM schedule string into an array of Activity objects.
   * This is a placeholder and needs actual implementation based on LLM output format.
   * @param llmScheduleOutput The raw string output from the LLM.
   * @returns An array of parsed Activity objects.
   */
  /**
   * Parses a raw LLM schedule string into an array of Activity objects.
   * Expected LLM output format: A JSON string representing an array of Activity objects.
   * Example:
   * ```json
   * [
   *   {
   *     "initialDatetime": "2025-06-01T08:00:00Z",
   *     "finalDatetime": "2025-06-01T10:00:00Z",
   *     "weekday": "Sunday",
   *     "city": "New York",
   *     "activityName": "Flight to LA",
   *     "activityType": "Flight",
   *     "price": 250,
   *     "providerCompany": "AirlineX",
   *     "linkToBuy": "http://example.com/flight",
   *     "purchased": false
   *   },
   *   {
   *     "initialDatetime": "2025-06-01T12:00:00Z",
   *     "finalDatetime": "2025-06-05T10:00:00Z",
   *     "weekday": "Sunday",
   *     "city": "Los Angeles",
   *     "activityName": "Hotel Stay",
   *     "activityType": "Stay",
   *     "price": 800,
   *     "providerCompany": "HotelY",
   *     "purchased": false
   *   }
   * ]
   * ```
   * @param llmScheduleOutput The raw string output from the LLM.
   * @returns An array of parsed Activity objects.
   * @throws Error if the JSON parsing fails or the format is unexpected.
   */
  public parseSchedule(llmScheduleOutput: string): Activity[] {
    try {
      const parsed = JSON.parse(llmScheduleOutput);
      if (!Array.isArray(parsed)) {
        throw new Error("LLM output is not an array.");
      }
      return parsed.map((item: any) => ({
        ...item,
        initialDatetime: new Date(item.initialDatetime),
        finalDatetime: new Date(item.finalDatetime),
      })) as Activity[];
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error("Failed to parse LLM schedule output:", error);
      throw new Error(`Invalid LLM schedule output format: ${errorMessage}`);
    }
  }
}

import * as ExcelJS from 'exceljs';
import * as fs from 'fs/promises'; // For writing dummy files

/**
 * Exports travel activities to Excel in various formats.
 * This class would typically depend on an Excel library (e.g., 'exceljs').
 */
export class ExcelExporter {
  /**
   * Exports a list of activities to an Excel file.
   * @param activities An array of Activity objects.
   * @param filename The name of the Excel file to create (e.g., "travel_list.xlsx").
   * @returns A promise that resolves when the file is written.
   */
  public async exportActivitiesAsList(activities: Activity[], filename: string): Promise<void> {
    console.log(`Exporting activities as list to ${filename}`);
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Activities List");

    worksheet.columns = [
      { header: "Initial Datetime", key: "initialDatetime", width: 20 },
      { header: "Final Datetime", key: "finalDatetime", width: 20 },
      { header: "Weekday", key: "weekday", width: 15 },
      { header: "City", key: "city", width: 15 },
      { header: "Activity Name", key: "activityName", width: 30 },
      { header: "Activity Type", key: "activityType", width: 20 },
      { header: "Price", key: "price", width: 10 },
      { header: "Provider", key: "providerCompany", width: 20 },
      { header: "Link", key: "linkToBuy", width: 40 },
      { header: "Purchased", key: "purchased", width: 15 },
    ];

    activities.forEach((activity) => {
      worksheet.addRow({
        ...activity,
        initialDatetime: activity.initialDatetime.toISOString(),
        finalDatetime: activity.finalDatetime.toISOString(),
      });
    });

    // For demonstration, write to a dummy text file instead of actual Excel
    // In a real scenario, you would use: await workbook.xlsx.writeFile(filename);
    const dummyContent = await workbook.xlsx.writeBuffer();
    await fs.writeFile(filename, dummyContent as any); // Cast to any to bypass TypeScript error

    console.log(`Excel list exported to dummy file: ${filename}`);
  }

  /**
   * Exports activities to an Excel file formatted as a calendar.
   * "Stay" activities span across days at the top. Other activities are marked
   * with colors and joined cells hour by hour and day by day.
   * @param activities An array of Activity objects.
   * @param filename The name of the Excel file to create (e.g., "travel_calendar.xlsx").
   * @returns A promise that resolves when the file is written.
   */
  public async exportActivitiesAsCalendar(activities: Activity[], filename: string): Promise<void> {
    console.log(`Exporting activities as calendar to ${filename}`);
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Travel Calendar");

    // Determine date range
    const allDates = activities.flatMap(a => [a.initialDatetime, a.finalDatetime]);
    const minDate = new Date(Math.min(...allDates.map(d => d.getTime())));
    const maxDate = new Date(Math.max(...allDates.map(d => d.getTime())));

    // Normalize minDate to start of day
    minDate.setHours(0, 0, 0, 0);
    maxDate.setHours(23, 59, 59, 999);

    const days: Date[] = [];
    for (let d = new Date(minDate); d <= maxDate; d.setDate(d.getDate() + 1)) {
      days.push(new Date(d));
    }

    // Setup columns: Time, then one column per day
    const columns: Partial<ExcelJS.Column>[] = [{ header: "Time", key: "time", width: 10 }];
    days.forEach(day => {
      columns.push({ header: day.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }), key: day.toISOString().split('T')[0], width: 20 });
    });
    worksheet.columns = columns;

    // Add time rows (e.g., 00:00, 01:00, ..., 23:00)
    for (let hour = 0; hour < 24; hour++) {
      const row: Record<string, string> = { time: `${String(hour).padStart(2, '0')}:00` };
      worksheet.addRow(row);
    }

    // Place "Stay" activities at the top
    const stayActivities = activities.filter(a => a.activityType === "Stay");
    stayActivities.forEach(stay => {
      const startDayIndex = days.findIndex(d => d.toDateString() === stay.initialDatetime.toDateString());
      const endDayIndex = days.findIndex(d => d.toDateString() === stay.finalDatetime.toDateString());

      if (startDayIndex !== -1 && endDayIndex !== -1) {
        const startCol = startDayIndex + 2; // +1 for Time column, +1 for 1-based index
        const endCol = endDayIndex + 2;

        // Add a new row for the stay activity at the top
        const stayRow = worksheet.insertRow(2, {}); // Insert after header and time row
        stayRow.getCell(startCol).value = stay.activityName;
        worksheet.mergeCells(stayRow.number, startCol, stayRow.number, endCol);
        stayRow.getCell(startCol).fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFD9E1F2' } // Light blue
        };
        stayRow.getCell(startCol).alignment = { vertical: 'middle', horizontal: 'center' };
      }
    });

    // Place other activities
    activities.filter(a => a.activityType !== "Stay").forEach(activity => {
      const startHour = activity.initialDatetime.getHours();
      const endHour = activity.finalDatetime.getHours();
      const startDayIndex = days.findIndex(d => d.toDateString() === activity.initialDatetime.toDateString());

      if (startDayIndex !== -1) {
        const col = startDayIndex + 2; // +1 for Time column, +1 for 1-based index

        for (let h = startHour; h <= endHour; h++) {
          const rowNum = h + 2; // +1 for header, +1 for 0-based hour to 1-based row
          const cell = worksheet.getCell(rowNum, col);
          cell.value = activity.activityName;
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: this.getActivityColor(activity.activityType) }
          };
          cell.alignment = { vertical: 'middle', horizontal: 'center' };
        }
        if (startHour !== endHour) {
          worksheet.mergeCells(startHour + 2, col, endHour + 2, col);
        }
      }
    });

    // For demonstration, write to a dummy text file instead of actual Excel
    const dummyContent = await workbook.xlsx.writeBuffer();
    await fs.writeFile(filename, dummyContent as any);

    console.log(`Excel calendar exported to dummy file: ${filename}`);
  }

  private getActivityColor(activityType: Activity['activityType']): string {
    switch (activityType) {
      case "Flight": return 'FFFFC7CE'; // Light Red
      case "Transportation": return 'FFFFFFCC'; // Light Yellow
      case "Attraction": return 'FFC6EFCE'; // Light Green
      case "Meal": return 'FFDDEBF7'; // Light Blue
      case "Other": return 'FFE7E6E6'; // Light Gray
      default: return 'FFFFFFFF'; // White
    }
  }
}
