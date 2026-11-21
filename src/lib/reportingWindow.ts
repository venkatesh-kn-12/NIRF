/**
 * RP Reporting Window Helper for MCA Department Score Simulator
 *
 * Implements deterministic reporting-period window calculations for:
 * - Publications (calendar years)
 * - Patents: Published (publication date) & Granted (grant date)
 * - Research Projects & Consultancy (receipt date or financial year)
 *
 * In NIRF Engineering 2025, a 3-year assessment period is evaluated.
 * For Academic Year 2024-25:
 * - 3 Calendar Years: 2021, 2022, 2023 (or trailing up to 2024)
 * - 3 Financial Years: 2021-22, 2022-23, 2023-24
 */

export interface RPReportingWindow {
  academicYear: string;
  startCalendarYear: number;
  endCalendarYear: number;
  startDate: Date;
  endDate: Date;
  calendarYears: number[];
  financialYears: string[];
  yearsCount: number;
  description: string;
}

/**
 * Calculates the standard 3-year RP evaluation window for a given academic year.
 * e.g., "2024-25" -> Start Year: 2021, End Year: 2023 (or 2024 inclusive for recent activity)
 */
export function getRPReportingWindow(academicYear = "2024-25"): RPReportingWindow {
  // Parse starting year from academic year format "YYYY-YY" or "YYYY"
  const startYearMatch = academicYear.match(/^(\d{4})/);
  const baseEndYear = startYearMatch ? parseInt(startYearMatch[1], 10) : 2024;

  // Standard NIRF 3-calendar-year window preceding the assessment cycle:
  // e.g., for AY 2024-25, evaluation covers calendar years (baseEndYear - 3) to (baseEndYear - 1) = [2021, 2022, 2023].
  // However, for ongoing department simulations including recent work, we support up to baseEndYear (2024).
  const startCalYear = baseEndYear - 3; // e.g. 2021
  const endCalYear = baseEndYear;     // e.g. 2024 (inclusive of latest year)
  
  const calendarYears: number[] = [];
  for (let y = startCalYear; y <= endCalYear; y++) {
    calendarYears.push(y);
  }

  // Financial years covering the 3-year window
  const financialYears = [
    `${startCalYear}-${String(startCalYear + 1).slice(-2)}`, // e.g. 2021-22
    `${startCalYear + 1}-${String(startCalYear + 2).slice(-2)}`, // e.g. 2022-23
    `${startCalYear + 2}-${String(startCalYear + 3).slice(-2)}`, // e.g. 2023-24
    `${baseEndYear}-${String(baseEndYear + 1).slice(-2)}`,       // e.g. 2024-25
  ];

  const startDate = new Date(Date.UTC(startCalYear, 0, 1, 0, 0, 0, 0));
  const endDate = new Date(Date.UTC(endCalYear, 11, 31, 23, 59, 59, 999));

  return {
    academicYear,
    startCalendarYear: startCalYear,
    endCalendarYear: endCalYear,
    startDate,
    endDate,
    calendarYears,
    financialYears,
    yearsCount: 3, // N = 3 years NIRF normalisation divisor
    description: `3-Year Window (${startCalYear}–${endCalYear} / FYs ${financialYears[0]} to ${financialYears[financialYears.length - 1]})`,
  };
}

/**
 * Checks if a publication year falls within the RP reporting window.
 */
export function isPublicationInWindow(
  pubYear: number | undefined | null,
  window: RPReportingWindow
): boolean {
  if (!pubYear || isNaN(pubYear)) return false;
  return pubYear >= window.startCalendarYear && pubYear <= window.endCalendarYear;
}

/**
 * Checks if a date falls within the RP reporting window.
 */
export function isDateInWindow(
  date: Date | string | undefined | null,
  window: RPReportingWindow
): boolean {
  if (!date) return false;
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return false;
  return d >= window.startDate && d <= window.endDate;
}

/**
 * Checks if a financial year string falls within the RP reporting window.
 */
export function isFinancialYearInWindow(
  fy: string | undefined | null,
  window: RPReportingWindow
): boolean {
  if (!fy) return false;
  const cleaned = fy.trim();
  return window.financialYears.some(
    (wfy) => wfy.toLowerCase() === cleaned.toLowerCase()
  );
}

export interface GOReportingWindow {
  academicYear: string;
  graduatingYears: number[];
  cohortBatches: string[];
  startGradYear: number;
  endGradYear: number;
  yearsCount: number;
  description: string;
}

/**
 * Calculates the standard 3 graduating cohorts evaluation window for GO.
 * For MCA (2-year program), graduation in AY 2024-25 corresponds to:
 * - Graduating Years: 2022, 2023, 2024 (batches 2020-22, 2021-23, 2022-24)
 * - Or including 2023, 2024, 2025.
 */
export function getGOReportingWindow(academicYear = "2024-25"): GOReportingWindow {
  const match = academicYear.match(/^(\d{4})/);
  const baseEndYear = match ? parseInt(match[1], 10) : 2024;

  const graduatingYears = [baseEndYear - 2, baseEndYear - 1, baseEndYear]; // e.g. [2022, 2023, 2024]
  const cohortBatches = graduatingYears.map((yr) => `${yr - 2}-${yr}`); // e.g. ["2020-2022", "2021-2023", "2022-2024"]

  return {
    academicYear,
    graduatingYears,
    cohortBatches,
    startGradYear: graduatingYears[0],
    endGradYear: graduatingYears[graduatingYears.length - 1],
    yearsCount: 3,
    description: `3 Graduating Cohorts: ${cohortBatches.join(", ")} (Graduation Years ${graduatingYears.join(", ")})`,
  };
}

export type SimulationPolicy = "COMPLETED_BASELINE" | "CURRENT_PROVISIONAL";

export interface ScoreYearConfig {
  scoringYear: number;
  academicYear: string;
  policy: SimulationPolicy;
  isProvisional: boolean;
  provisionalCutoffDate: string;
  bannerMessage?: string;
  applicableCohorts: string[];
  applicableIntakeYears: number[];
  rpCalendarYears: number[];
  goGraduationYears: number[];
  financialYears: string[];
}

/**
 * Resolves scoring year policy parameters for MCA NIRF 2026 simulator.
 * - Policy A (COMPLETED_BASELINE): Evaluates completed 3-year baseline (e.g. 2023, 2024, 2025).
 * - Policy B (CURRENT_PROVISIONAL): Evaluates up to cutoff date in 2026 with a provisional status banner.
 */
export function getScoreYearConfig(
  scoringYear = 2026,
  policy: SimulationPolicy = "COMPLETED_BASELINE",
  academicYear = "2024-25",
  provisionalCutoffDate = "2026-02-28"
): ScoreYearConfig {
  const isProvisional = policy === "CURRENT_PROVISIONAL";
  const startYearMatch = academicYear.match(/^(\d{4})/);
  const baseYear = startYearMatch ? parseInt(startYearMatch[1], 10) : 2024;

  const applicableIntakeYears = [baseYear - 1, baseYear]; // e.g. [2023, 2024]
  const applicableCohorts = [
    `${baseYear - 1}-${baseYear + 1}`, // 2023-2025
    `${baseYear}-${baseYear + 2}`,     // 2024-2026
  ];

  const rpCalendarYears = isProvisional
    ? [scoringYear - 2, scoringYear - 1, scoringYear] // [2024, 2025, 2026]
    : [scoringYear - 3, scoringYear - 2, scoringYear - 1]; // [2023, 2024, 2025]

  const goGraduationYears = isProvisional
    ? [scoringYear - 2, scoringYear - 1, scoringYear]
    : [baseYear - 2, baseYear - 1, baseYear];

  const financialYears = [
    `${baseYear - 3}-${String(baseYear - 2).slice(-2)}`,
    `${baseYear - 2}-${String(baseYear - 1).slice(-2)}`,
    `${baseYear - 1}-${String(baseYear).slice(-2)}`,
    `${baseYear}-${String(baseYear + 1).slice(-2)}`,
  ];

  return {
    scoringYear,
    academicYear,
    policy,
    isProvisional,
    provisionalCutoffDate,
    bannerMessage: isProvisional
      ? `PROVISIONAL 2026 SIMULATION: Evaluated under Policy B (Current Provisional) up to cutoff date ${provisionalCutoffDate}. Subject to data revision until official cycle close.`
      : undefined,
    applicableCohorts,
    applicableIntakeYears,
    rpCalendarYears,
    goGraduationYears,
    financialYears,
  };
}
