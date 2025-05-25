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
  public parseSchedule(llmScheduleOutput: string): Activity[] {
    console.log("Parsing LLM schedule output:", llmScheduleOutput);
    // TODO: Implement robust parsing logic here.
    // This will likely involve regex, string manipulation, or a more sophisticated NLP approach
    // to extract details and populate the Activity interface.

    // Dummy data for demonstration
    return [
      {
        initialDatetime: new Date("2025-06-01T08:00:00"),
        finalDatetime: new Date("2025-06-01T10:00:00"),
        weekday: "Sunday",
        city: "New York",
        activityName: "Flight to LA",
        activityType: "Flight",
        price: 250,
        providerCompany: "AirlineX",
        linkToBuy: "http://example.com/flight",
        purchased: false,
      },
      {
        initialDatetime: new Date("2025-06-01T12:00:00"),
        finalDatetime: new Date("2025-06-05T10:00:00"),
        weekday: "Sunday",
        city: "Los Angeles",
        activityName: "Hotel Stay",
        activityType: "Stay",
        price: 800,
        providerCompany: "HotelY",
        purchased: false,
      },
      {
        initialDatetime: new Date("2025-06-02T14:00:00"),
        finalDatetime: new Date("2025-06-02T16:00:00"),
        weekday: "Monday",
        city: "Los Angeles",
        activityName: "Hollywood Tour",
        activityType: "Attraction",
        price: 50,
        purchased: true,
      },
    ];
  }
}

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
    // TODO: Implement actual Excel export using a library like 'exceljs'.
    // Example:
    // const workbook = new ExcelJS.Workbook();
    // const worksheet = workbook.addWorksheet("Activities List");
    // worksheet.columns = [
    //   { header: "Initial Datetime", key: "initialDatetime", width: 20 },
    //   { header: "Final Datetime", key: "finalDatetime", width: 20 },
    //   { header: "Weekday", key: "weekday", width: 15 },
    //   { header: "City", key: "city", width: 15 },
    //   { header: "Activity Name", key: "activityName", width: 30 },
    //   { header: "Activity Type", key: "activityType", width: 20 },
    //   { header: "Price", key: "price", width: 10 },
    //   { header: "Provider", key: "providerCompany", width: 20 },
    //   { header: "Link", key: "linkToBuy", width: 40 },
    //   { header: "Purchased", key: "purchased", width: 15 },
    // ];
    // activities.forEach((activity) => {
    //   worksheet.addRow(activity);
    // });
    // await workbook.xlsx.writeFile(filename);
    console.log("Excel list export placeholder executed.");
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
    // TODO: Implement complex Excel calendar export using a library like 'exceljs'.
    // This will involve:
    // 1. Determining the date range of the activities.
    // 2. Creating a grid for days and hours.
    // 3. Placing "Stay" activities in merged cells at the top rows for each day they span.
    // 4. Placing other activities in appropriate hourly slots, merging cells for duration,
    //    and applying colors based on activity type.
    console.log("Excel calendar export placeholder executed.");
  }
}
