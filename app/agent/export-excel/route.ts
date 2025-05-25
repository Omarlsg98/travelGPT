import { ExcelExporter, generateFixedScheduleData } from "@travelgpt/packages/core/src/schedule-management";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const activities = generateFixedScheduleData();
    const excelExporter = new ExcelExporter();
    const buffer = await excelExporter.exportCombinedExcel(activities);

    const headers = new Headers();
    headers.append("Content-Disposition", "attachment; filename=\"travel_schedule.xlsx\"");
    headers.append("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");

    return new NextResponse(buffer, { headers });
  } catch (error) {
    console.error("Error generating Excel file:", error);
    return new NextResponse("Error generating Excel file", { status: 500 });
  }
}
