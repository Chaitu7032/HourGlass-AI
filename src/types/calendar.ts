export interface GoogleCalendarConnectionStatus {
  connected: boolean;
  email?: string;
  calendars?: Array<{
    id: string;
    summary: string;
    primary?: boolean;
  }>;
  expiresAt?: string;
}

export interface CalendarBusyBlock {
  start: string;
  end: string;
}

export interface CalendarAvailabilitySnapshot {
  connected: boolean;
  timezone: string;
  rangeStart: string;
  rangeEnd: string;
  busyBlocks: CalendarBusyBlock[];
  selectedCalendarIds: string[];
  fetchedAt: string;
}
