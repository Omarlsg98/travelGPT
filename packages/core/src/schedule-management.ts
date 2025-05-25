// packages/core/src/schedule-management.ts

/**
 * Interface for a single activity in the travel schedule.
 */
export interface Activity {
  initialDatetime: Date;
  finalDatetime: Date;
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

/**
 * Generates fixed sample travel schedule data.
 * @returns An array of sample Activity objects.
 */
export function generateFixedScheduleData(): Activity[] {
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  return [
    {
      initialDatetime: new Date(today.setHours(15, 0, 0, 0)),
      finalDatetime: new Date(tomorrow.setHours(11, 0, 0, 0)),
      city: "Paris",
      activityName: "Hotel Stay",
      activityType: "Stay",
      price: 200,
      providerCompany: "Hotel Parisian",
      purchased: true,
    },
    {
      initialDatetime: new Date(today.setHours(9, 0, 0, 0)),
      finalDatetime: new Date(today.setHours(10, 0, 0, 0)),
      city: "Paris",
      activityName: "Eiffel Tower Visit",
      activityType: "Attraction",
      price: 25,
      purchased: true,
    },
    {
      initialDatetime: new Date(today.setHours(12, 0, 0, 0)),
      finalDatetime: new Date(today.setHours(13, 0, 0, 0)),
      city: "Paris",
      activityName: "Lunch at Le Comptoir",
      activityType: "Meal",
      price: 50,
      purchased: false,
    },
    {
      initialDatetime: new Date(tomorrow.setHours(8, 0, 0, 0)),
      finalDatetime: new Date(tomorrow.setHours(11, 0, 0, 0)),
      city: "Paris",
      activityName: "Flight to Rome",
      activityType: "Flight",
      price: 120,
      providerCompany: "Air France",
      purchased: true,
      extraFields: {
        flightNumber: "AF123",
        baggageIncluded: true,
      },
    },
    {
      initialDatetime: new Date(tomorrow.setHours(14, 0, 0, 0)),
      finalDatetime: new Date(tomorrow.setHours(18, 0, 0, 0)),
      city: "Rome",
      activityName: "Colosseum Tour",
      activityType: "Attraction",
      price: 30,
      purchased: false,
      extraDetails: "Includes skip-the-line access",
    },
  ];
}

/**
 * Exports travel activities to Excel in various formats.
 * This class would typically depend on an Excel library (e.g., 'exceljs').
 */
export class ExcelExporter {
  /**
   * Adds a worksheet with a list of activities to an existing workbook.
   * @param workbook The ExcelJS Workbook object.
   * @param activities An array of Activity objects.
   */
  public addActivitiesAsListWorksheet(workbook: ExcelJS.Workbook, activities: Activity[]): void {
    const worksheet = workbook.addWorksheet("Activities List");

    const extraFieldKeys = new Set<string>();
    activities.forEach(activity => {
      if (activity.extraFields) {
        Object.keys(activity.extraFields).forEach(key => extraFieldKeys.add(key));
      }
    });

    const columns: Partial<ExcelJS.Column>[] = [
      { header: "Initial Datetime", key: "initialDatetime", width: 20 },
      { header: "Final Datetime", key: "finalDatetime", width: 20 },
      { header: "Weekday", key: "weekday", width: 15 },
      { header: "City", key: "city", width: 15 },
      { header: "Activity Name", key: "activityName", width: 30 },
      { header: "Activity Type", key: "activityType", width: 20 },
      { header: "Price", key: "price", width: 10 },
      { header: "Provider", key: "providerCompany", width: 20 },
      { header: "Extra Details", key: "extraDetails", width: 30 },
      { header: "Purchased", key: "purchased", width: 15 },
      { header: "Link to Buy", key: "linkToBuy", width: 30 },
    ];

    // Add dynamic columns for extraFields
    Array.from(extraFieldKeys).sort().forEach(key => {
      columns.push({ header: `Extra: ${key}`, key: `extraFields.${key}`, width: 20 });
    });

    worksheet.columns = columns;

    activities.forEach((activity) => {
      const rowData: Record<string, any> = {
        ...activity,
        weekday: activity.initialDatetime.toLocaleDateString('en-US', { weekday: 'long' }),
        initialDatetime: activity.initialDatetime.toISOString(),
        finalDatetime: activity.finalDatetime.toISOString(),
      };

      // Flatten extraFields into rowData for ExcelJS
      if (activity.extraFields) {
        for (const key in activity.extraFields) {
          rowData[`extraFields.${key}`] = activity.extraFields[key];
        }
      }

      worksheet.addRow(rowData);
    });
    console.log(`Activities list worksheet added.`);
  }

  /**
   * Adds a worksheet with activities formatted as a calendar to an existing workbook.
   * "Stay" activities span across days at the top. Other activities are marked
   * with colors and joined cells hour by hour and day by day.
   * @param workbook The ExcelJS Workbook object.
   * @param activities An array of Activity objects.
   */
  public addActivitiesAsCalendarWorksheet(workbook: ExcelJS.Workbook, activities: Activity[]): void {
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
        stayRow.getCell(startCol).value = `${stay.city}, ${stay.providerCompany || 'N/A'}`;
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
    console.log(`Activities calendar worksheet added.`);
  }

  /**
   * Exports all views (list and calendar) to a single Excel file with different tabs.
   * @param activities An array of Activity objects.
   * @returns A promise that resolves with the Excel file buffer.
   */
  public async exportCombinedExcel(activities: Activity[]): Promise<Buffer> {
    console.log(`Exporting combined Excel file...`);
    const workbook = new ExcelJS.Workbook();
    this.addActivitiesAsListWorksheet(workbook, activities);
    this.addActivitiesAsCalendarWorksheet(workbook, activities);
    const buffer = await workbook.xlsx.writeBuffer();
    console.log(`Combined Excel file exported.`);
    return buffer as Buffer;
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
