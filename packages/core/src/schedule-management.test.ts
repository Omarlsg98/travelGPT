import * as ExcelJS from 'exceljs';
import * as fs from 'fs/promises';
import { Activity, ExcelExporter, ScheduleParser } from './schedule-management';

// Mock ExcelJS and fs/promises for testing purposes
jest.mock('exceljs');
jest.mock('fs/promises');

describe('ScheduleParser', () => {
  let parser: ScheduleParser;

  beforeEach(() => {
    parser = new ScheduleParser();
  });

  it('should parse a valid JSON schedule string into Activity objects', () => {
    const llmOutput = JSON.stringify([
      {
        initialDatetime: "2025-06-01T08:00:00Z",
        finalDatetime: "2025-06-01T10:00:00Z",
        weekday: "Sunday",
        city: "New York",
        activityName: "Flight to LA",
        activityType: "Flight",
        price: 250,
        purchased: false,
      },
      {
        initialDatetime: "2025-06-01T12:00:00Z",
        finalDatetime: "2025-06-05T10:00:00Z",
        weekday: "Sunday",
        city: "Los Angeles",
        activityName: "Hotel Stay",
        activityType: "Stay",
        price: 800,
        purchased: false,
      },
    ]);

    const activities = parser.parseSchedule(llmOutput);

    expect(activities).toHaveLength(2);
    expect(activities[0].activityName).toBe("Flight to LA");
    expect(activities[0].initialDatetime).toEqual(new Date("2025-06-01T08:00:00Z"));
    expect(activities[1].activityType).toBe("Stay");
    expect(activities[1].finalDatetime).toEqual(new Date("2025-06-05T10:00:00Z"));
  });

  it('should throw an error for invalid JSON string', () => {
    const llmOutput = "this is not valid json";
    expect(() => parser.parseSchedule(llmOutput)).toThrow(/Invalid LLM schedule output format: Unexpected token 'h'/);
  });

  it('should throw an error if the parsed JSON is not an array', () => {
    const llmOutput = JSON.stringify({ initialDatetime: "2025-06-01T08:00:00Z" });
    expect(() => parser.parseSchedule(llmOutput)).toThrow("Invalid LLM schedule output format: LLM output is not an array.");
  });
});

describe('ExcelExporter', () => {
  let exporter: ExcelExporter;
  const mockActivities: Activity[] = [
    {
      initialDatetime: new Date("2025-06-01T08:00:00Z"),
      finalDatetime: new Date("2025-06-01T10:00:00Z"),
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
      initialDatetime: new Date("2025-06-01T12:00:00Z"),
      finalDatetime: new Date("2025-06-05T10:00:00Z"), // Corrected invalid date string
      weekday: "Sunday",
      city: "Los Angeles",
      activityName: "Hotel Stay",
      activityType: "Stay",
      price: 800,
      providerCompany: "HotelY",
      purchased: false,
    },
    {
      initialDatetime: new Date("2025-06-02T14:00:00Z"),
      finalDatetime: new Date("2025-06-02T16:00:00Z"),
      weekday: "Monday",
      city: "Los Angeles",
      activityName: "Hollywood Tour",
      activityType: "Attraction",
      price: 50,
      purchased: true,
    },
  ];

  beforeEach(() => {
    exporter = new ExcelExporter();
    // Reset mocks before each test
    jest.clearAllMocks();
  });

  it('should export activities as a list to an Excel file', async () => {
    const mockWorksheet = {
      addRow: jest.fn(),
      columns: [], // This will be set by the code
    };
    const mockWorkbook = {
      addWorksheet: jest.fn().mockReturnValue(mockWorksheet),
      xlsx: {
        writeBuffer: jest.fn().mockResolvedValue(Buffer.from('mock excel data')),
      },
    };
    (ExcelJS.Workbook as jest.Mock).mockImplementation(() => mockWorkbook);

    const filename = "test_list.xlsx";
    await exporter.exportActivitiesAsList(mockActivities, filename);

    expect(ExcelJS.Workbook).toHaveBeenCalledTimes(1);
    expect(mockWorkbook.addWorksheet).toHaveBeenCalledWith("Activities List");
    expect(mockWorksheet.addRow).toHaveBeenCalledTimes(mockActivities.length);
    expect(mockWorkbook.xlsx.writeBuffer).toHaveBeenCalledTimes(1);
    expect(fs.writeFile).toHaveBeenCalledWith(filename, Buffer.from('mock excel data'));
  });

  it('should export activities as a calendar to an Excel file', async () => {
    const mockWorksheet: any = { // Cast mockWorksheet to any to allow flexible mocking
      _columns: [] as Partial<ExcelJS.Column>[], // Explicitly type _columns
      set columns(cols: Partial<ExcelJS.Column>[]) { this._columns = cols; }, // Mock setter
      get columns() { return this._columns; }, // Mock getter
      addRow: jest.fn(),
      insertRow: jest.fn((rowNum, data) => {
        // Simulate inserting a row and returning a mock cell
        return {
          getCell: jest.fn(() => ({
            value: '',
            fill: {},
            alignment: {},
          })),
          number: rowNum, // Return the row number for mergeCells
        };
      }),
      mergeCells: jest.fn(),
      getCell: jest.fn().mockReturnValue({
        value: '',
        fill: {},
        alignment: {},
      }),
    };
    const mockWorkbook = {
      addWorksheet: jest.fn().mockReturnValue(mockWorksheet),
      xlsx: {
        writeBuffer: jest.fn().mockResolvedValue(Buffer.from('mock calendar data')),
      },
    };
    (ExcelJS.Workbook as jest.Mock).mockImplementation(() => mockWorkbook);

    const filename = "test_calendar.xlsx";
    await exporter.exportActivitiesAsCalendar(mockActivities, filename);

    expect(ExcelJS.Workbook).toHaveBeenCalledTimes(1);
    expect(mockWorkbook.addWorksheet).toHaveBeenCalledWith("Travel Calendar");
    // Calculate expected days dynamically based on mockActivities
    const allDates = mockActivities.flatMap(a => [a.initialDatetime, a.finalDatetime]);
    const minDate = new Date(Math.min(...allDates.map(d => d.getTime())));
    const maxDate = new Date(Math.max(...allDates.map(d => d.getTime())));
    minDate.setHours(0, 0, 0, 0);
    maxDate.setHours(23, 59, 59, 999);
    let expectedDays = 0;
    for (let d = new Date(minDate); d <= maxDate; d.setDate(d.getDate() + 1)) {
      expectedDays++;
    }
    expect(mockWorksheet.columns).toHaveLength(expectedDays + 1); // Time column + days
    expect(mockWorksheet.addRow).toHaveBeenCalledTimes(24); // 24 hours
    expect(mockWorksheet.insertRow).toHaveBeenCalledTimes(1); // For "Stay" activity
    expect(mockWorksheet.mergeCells).toHaveBeenCalled();
    expect(mockWorkbook.xlsx.writeBuffer).toHaveBeenCalledTimes(1);
    expect(fs.writeFile).toHaveBeenCalledWith(filename, Buffer.from('mock calendar data'));
  });
});
