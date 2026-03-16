/**
 * Humanized Schedule Generator
 *
 * Generates natural-looking publish timestamps for bulk-imported groups
 * so that Google sees organic human activity, not automated scheduling.
 *
 * Design principles:
 * - Vary count per day (weighted toward 4-5, never exactly the same)
 * - Never publish between 1AM-6AM (humans don't approve at 3AM)
 * - Min 45-minute gap between posts on the same day
 * - Weekend days publish fewer (1-3)
 * - ~10% chance to skip a weekday entirely
 * - Bias toward morning (7-10) and evening (18-22) windows
 * - Random seconds/milliseconds for timestamp uniqueness
 */

export interface ScheduleConfig {
  minPerDay: number; // default 3
  maxPerDay: number; // default 6
  startDate?: Date;  // default: tomorrow
}

// ──────────────────────────────────────
// Helpers
// ──────────────────────────────────────

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  d.setHours(0, 0, 0, 0);
  return d;
}

function getNextDay(): Date {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(0, 0, 0, 0);
  return d;
}

function weightedRandom(options: { value: number; weight: number }[]): number {
  const totalWeight = options.reduce((sum, o) => sum + o.weight, 0);
  let r = Math.random() * totalWeight;
  for (const opt of options) {
    r -= opt.weight;
    if (r <= 0) return opt.value;
  }
  return options[options.length - 1].value;
}

// ──────────────────────────────────────
// Day-level time generation
// ──────────────────────────────────────

function generateDayTimes(date: Date, count: number): Date[] {
  const slots: Date[] = [];
  const usedMinuteMarks: number[] = [];

  for (let i = 0; i < count; i++) {
    let hour: number;
    let minute: number;
    let totalMinutes: number;
    let attempts = 0;

    // Retry until we find a slot at least 45 min from all others
    do {
      const r = Math.random();
      if (r < 0.30) {
        hour = randomInt(7, 10);   // Morning
      } else if (r < 0.50) {
        hour = randomInt(11, 13);  // Midday
      } else if (r < 0.70) {
        hour = randomInt(14, 17);  // Afternoon
      } else {
        hour = randomInt(18, 22);  // Evening
      }
      minute = randomInt(0, 59);
      totalMinutes = hour * 60 + minute;
      attempts++;
    } while (
      usedMinuteMarks.some(m => Math.abs(m - totalMinutes) < 45) &&
      attempts < 50
    );

    usedMinuteMarks.push(totalMinutes);

    const d = new Date(date);
    d.setHours(hour, minute, randomInt(0, 59), randomInt(0, 999));
    slots.push(d);
  }

  return slots.sort((a, b) => a.getTime() - b.getTime());
}

// ──────────────────────────────────────
// Main schedule generator
// ──────────────────────────────────────

export function generateHumanSchedule(
  count: number,
  config: ScheduleConfig = { minPerDay: 3, maxPerDay: 6 }
): Date[] {
  if (count <= 0) return [];

  const schedules: Date[] = [];
  let currentDate = config.startDate
    ? new Date(config.startDate)
    : getNextDay();
  currentDate.setHours(0, 0, 0, 0);

  let remaining = count;

  while (remaining > 0) {
    const dayOfWeek = currentDate.getDay(); // 0=Sun, 6=Sat
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    // ~10% chance to skip a non-weekend day (only if enough left to spread)
    if (!isWeekend && Math.random() < 0.10 && remaining > config.maxPerDay) {
      currentDate = addDays(currentDate, 1);
      continue;
    }

    // Determine how many groups to publish this day
    let dayCount: number;
    if (isWeekend) {
      dayCount = Math.min(randomInt(1, 3), remaining);
    } else {
      // Weighted random: favour middle values (4-5) over extremes (3, 6)
      const weights = [];
      for (let v = config.minPerDay; v <= config.maxPerDay; v++) {
        const distFromCenter =
          Math.abs(v - (config.minPerDay + config.maxPerDay) / 2);
        const w = Math.max(1, 4 - distFromCenter * 2);
        weights.push({ value: v, weight: w });
      }
      dayCount = Math.min(weightedRandom(weights), remaining);
    }

    // Generate random times for this day
    const times = generateDayTimes(currentDate, dayCount);
    schedules.push(...times);

    remaining -= dayCount;
    currentDate = addDays(currentDate, 1);
  }

  return schedules.sort((a, b) => a.getTime() - b.getTime());
}

/**
 * Given a total count and config, estimate how many calendar days
 * the schedule will span (for the UI preview).
 */
export function estimateScheduleDays(
  count: number,
  config: ScheduleConfig = { minPerDay: 3, maxPerDay: 6 }
): number {
  const avgPerDay = (config.minPerDay + config.maxPerDay) / 2;
  // Account for weekends (~2/7 days) producing fewer and ~10% skipped weekdays
  const effectiveAvg = avgPerDay * 0.82; // rough adjustment
  return Math.ceil(count / effectiveAvg);
}
