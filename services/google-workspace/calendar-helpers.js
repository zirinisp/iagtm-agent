/**
 * Google Calendar Helpers
 *
 * List and create calendar events via gws CLI.
 * Requires Calendar API enabled on GCP project 519727030587.
 *
 * Usage:
 *   import { listEvents, createEvent } from './calendar-helpers.js';
 *   const events = await listEvents('primary', '2026-03-13T00:00:00Z', '2026-03-14T00:00:00Z');
 *
 * Registered in services/REGISTRY.md
 */

import { gws } from './gws-wrapper.js';

/**
 * List calendar events in a time range.
 * @param {string} calendarId - Calendar ID ('primary' for default)
 * @param {string} timeMin - Start time (ISO 8601)
 * @param {string} timeMax - End time (ISO 8601)
 * @param {number} [maxResults=20]
 * @returns {Promise<Array<object>>} Array of event objects
 */
export async function listEvents(calendarId, timeMin, timeMax, maxResults = 20) {
  const result = await gws('calendar events list', {
    params: {
      calendarId: calendarId || 'primary',
      timeMin,
      timeMax,
      maxResults,
      singleEvents: true,
      orderBy: 'startTime',
    },
  });
  return result.items || [];
}

/**
 * Create a calendar event.
 * @param {string} calendarId - Calendar ID ('primary' for default)
 * @param {object} event
 * @param {string} event.summary - Event title
 * @param {string} event.start - Start time (ISO 8601) or date (YYYY-MM-DD for all-day)
 * @param {string} event.end - End time (ISO 8601) or date
 * @param {string} [event.description] - Event description
 * @param {string} [event.location] - Event location
 * @returns {Promise<{id: string, summary: string, url: string}>}
 */
export async function createEvent(calendarId, event) {
  const isAllDay = event.start && !event.start.includes('T');

  const body = {
    summary: event.summary,
    description: event.description,
    location: event.location,
    start: isAllDay ? { date: event.start } : { dateTime: event.start },
    end: isAllDay ? { date: event.end } : { dateTime: event.end },
  };

  const result = await gws('calendar events insert', {
    params: { calendarId: calendarId || 'primary' },
    json: body,
  });

  return {
    id: result.id,
    summary: result.summary,
    url: result.htmlLink,
    start: result.start,
    end: result.end,
  };
}

/**
 * Get a specific calendar event.
 * @param {string} calendarId
 * @param {string} eventId
 * @returns {Promise<object>}
 */
export async function getEvent(calendarId, eventId) {
  return gws('calendar events get', {
    params: { calendarId: calendarId || 'primary', eventId },
  });
}

// --- CLI ---

if (process.argv[1]?.endsWith('calendar-helpers.js')) {
  const [,, action, ...rest] = process.argv;

  if (action === 'list') {
    const now = new Date();
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const events = await listEvents('primary', now.toISOString(), tomorrow.toISOString());
    if (events.length === 0) {
      console.log('No events in the next 24 hours');
    } else {
      for (const e of events) {
        const start = e.start?.dateTime || e.start?.date || '?';
        console.log(`  ${start} — ${e.summary || '(no title)'}`);
      }
    }
  } else {
    console.log('Usage: node calendar-helpers.js <list>');
  }
}
