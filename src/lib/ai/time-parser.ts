/**
 * Time Parsing Utilities for AI Script Parser
 *
 * Handles various time format inputs:
 * - "0:30" -> 30 seconds
 * - "1:15" -> 75 seconds
 * - "30" or "30s" -> 30 seconds
 * - "at 5 seconds" -> 5 seconds
 * - Natural language: "half a minute" -> 30 seconds
 */

/**
 * Parse various time formats to seconds
 */
export function parseTimeToSeconds(input: string | number | null | undefined): number {
  if (typeof input === 'number') return input;
  if (!input || typeof input !== 'string') return 0;

  const normalized = input.toLowerCase().trim();

  // Direct seconds: "30", "30s", "30 seconds"
  const directMatch = normalized.match(/^(\d+(?:\.\d+)?)\s*(?:s|sec|seconds?)?$/);
  if (directMatch) return parseFloat(directMatch[1]);

  // MM:SS format: "0:30", "1:15"
  const mmssMatch = normalized.match(/^(\d+):(\d{2})$/);
  if (mmssMatch) return parseInt(mmssMatch[1]) * 60 + parseInt(mmssMatch[2]);

  // HH:MM:SS format: "0:01:30"
  const hhmmssMatch = normalized.match(/^(\d+):(\d{2}):(\d{2})$/);
  if (hhmmssMatch) {
    return (
      parseInt(hhmmssMatch[1]) * 3600 +
      parseInt(hhmmssMatch[2]) * 60 +
      parseInt(hhmmssMatch[3])
    );
  }

  // "at X" prefix: "at 0:30", "at 5 seconds"
  const atMatch = normalized.match(/^at\s+(.+)$/);
  if (atMatch) return parseTimeToSeconds(atMatch[1]);

  // Natural language map
  const naturalLanguageMap: Record<string, number> = {
    'start': 0,
    'beginning': 0,
    'the start': 0,
    'the beginning': 0,
    'half a second': 0.5,
    'one second': 1,
    'a second': 1,
    'two seconds': 2,
    'three seconds': 3,
    'five seconds': 5,
    'ten seconds': 10,
    'fifteen seconds': 15,
    'twenty seconds': 20,
    'thirty seconds': 30,
    'half a minute': 30,
    'one minute': 60,
    'a minute': 60,
    'ninety seconds': 90,
    'two minutes': 120,
    'three minutes': 180,
    'five minutes': 300,
  };

  if (naturalLanguageMap[normalized] !== undefined) {
    return naturalLanguageMap[normalized];
  }

  // X minutes Y seconds: "1 minute 30 seconds", "2 min 15 sec"
  const minSecMatch = normalized.match(
    /(\d+)\s*(?:min(?:ute)?s?)\s*(?:and\s*)?(\d+)\s*(?:sec(?:ond)?s?)?/
  );
  if (minSecMatch) {
    return parseInt(minSecMatch[1]) * 60 + parseInt(minSecMatch[2]);
  }

  // Just minutes: "2 minutes"
  const minOnlyMatch = normalized.match(/^(\d+)\s*(?:min(?:ute)?s?)$/);
  if (minOnlyMatch) {
    return parseInt(minOnlyMatch[1]) * 60;
  }

  // Fallback: try to parse as number
  const numMatch = normalized.match(/(\d+(?:\.\d+)?)/);
  if (numMatch) {
    return parseFloat(numMatch[1]);
  }

  throw new Error(`Unable to parse time format: "${input}"`);
}

/**
 * Format seconds to MM:SS string
 */
export function formatSecondsToTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Format seconds to human-readable string
 */
export function formatSecondsToHuman(seconds: number): string {
  if (seconds < 60) {
    return `${seconds}s`;
  }
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (secs === 0) {
    return `${mins}m`;
  }
  return `${mins}m ${secs}s`;
}

/**
 * Parse duration string
 * Examples: "3s", "3 seconds", "for 3 seconds", "over 3 seconds"
 */
export function parseDuration(input: string | number | null | undefined): number {
  if (typeof input === 'number') return input;
  if (!input || typeof input !== 'string') return 0;

  const normalized = input.toLowerCase().trim();

  // Remove common prefixes
  const withoutPrefix = normalized
    .replace(/^for\s+/, '')
    .replace(/^over\s+/, '')
    .replace(/^lasting\s+/, '')
    .replace(/^duration:?\s+/, '');

  return parseTimeToSeconds(withoutPrefix);
}

/**
 * Validate and clamp time values
 */
export function validateTime(
  time: number,
  options: { min?: number; max?: number; duration?: number } = {}
): number {
  const { min = 0, max = Infinity, duration } = options;

  let validated = Math.max(min, time);

  if (duration !== undefined) {
    validated = Math.min(validated, duration);
  }

  validated = Math.min(validated, max);

  return validated;
}

/**
 * Calculate end time from start time and duration
 */
export function calculateEndTime(
  startTime: number,
  duration: number,
  maxDuration?: number
): number {
  const endTime = startTime + duration;
  if (maxDuration !== undefined) {
    return Math.min(endTime, maxDuration);
  }
  return endTime;
}
