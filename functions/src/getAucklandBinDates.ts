/**
 * Import function triggers from their respective submodules:
 *
 * import {onCall} from "firebase-functions/v2/https";
 * import {onDocumentWritten} from "firebase-functions/v2/firestore";
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

import {HttpsError, onCall} from "firebase-functions/https";
import * as cheerio from "cheerio";

type BinType = "rubbish" | "recycling" | "foodScraps";

interface BinDate {
  type: BinType;
  dateText: string;
  date: string;
}

interface BinConfig {
  type: BinType;
  label: string;
}

const BIN_CONFIGS: BinConfig[] = [
  {
    type: "rubbish",
    label: "Rubbish",
  },
  {
    type: "foodScraps",
    label: "Food scraps",
  },
  {
    type: "recycling",
    label: "Recycling",
  },
];

const DAY_PATTERN =
  "(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)";
const MONTH_PATTERN =
  "(?:January|February|March|April|May|June|July|August|" +
  "September|October|November|December)";
const DATE_PATTERN =
  `${DAY_PATTERN},\\s*\\d{1,2}\\s+${MONTH_PATTERN}(?:\\s+\\d{4})?`;
const MONTHS = new Map([
  ["january", 1],
  ["february", 2],
  ["march", 3],
  ["april", 4],
  ["may", 5],
  ["june", 6],
  ["july", 7],
  ["august", 8],
  ["september", 9],
  ["october", 10],
  ["november", 11],
  ["december", 12],
]);

const normalizeText = (value: string) => value.replace(/\s+/g, " ").trim();

const escapeRegExp = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const findDateAfterLabel = (text: string, label: string) => {
  const match = normalizeText(text).match(
    new RegExp(`${escapeRegExp(label)}\\s*:\\s*(${DATE_PATTERN})`, "i"),
  );

  return match?.[1] ? normalizeText(match[1]) : null;
};

const padDatePart = (value: number) => value.toString().padStart(2, "0");

const getCurrentDate = () => {
  const now = new Date();

  return {
    year: now.getUTCFullYear(),
    month: now.getUTCMonth() + 1,
    day: now.getUTCDate(),
  };
};

const toIsoDate = (year: number, month: number, day: number) =>
  `${year}-${padDatePart(month)}-${padDatePart(day)}`;

const inferYearForMonthDay = (
  month: number,
  day: number,
  currentDate = getCurrentDate(),
) => {
  const currentTimestamp = Date.UTC(
    currentDate.year,
    currentDate.month - 1,
    currentDate.day,
  );
  const sameYearTimestamp = Date.UTC(currentDate.year, month - 1, day);

  if (sameYearTimestamp < currentTimestamp) {
    return currentDate.year + 1;
  }

  return currentDate.year;
};

const convertAucklandDateTextToIsoDate = (dateText: string) => {
  const match = normalizeText(dateText).match(
    new RegExp(`^${DAY_PATTERN},\\s*(\\d{1,2})\\s+` +
      `(${MONTH_PATTERN})(?:\\s+(\\d{4}))?$`, "i"),
  );

  if (!match) {
    return null;
  }

  const day = Number(match[1]);
  const month = MONTHS.get(match[2].toLowerCase());

  if (!month) {
    return null;
  }

  const year = match[3] ?
    Number(match[3]) :
    inferYearForMonthDay(month, day);

  return toIsoDate(year, month, day);
};

export const parseAucklandBinDates = (html: string): BinDate[] => {
  const $ = cheerio.load(html);
  const collections: BinDate[] = [];
  const seenTypes = new Set<BinType>();

  const addCollection = (type: BinType, dateText: string | null) => {
    if (!dateText || seenTypes.has(type)) {
      return;
    }

    const date = convertAucklandDateTextToIsoDate(dateText);

    if (!date) {
      return;
    }

    collections.push({
      type,
      dateText,
      date,
    });
    seenTypes.add(type);
  };

  const pageText = normalizeText($("body").text());

  for (const bin of BIN_CONFIGS) {
    addCollection(bin.type, findDateAfterLabel(pageText, bin.label));
  }

  return collections;
};

export const getAucklandBinDates = onCall(
  {
    enforceAppCheck: true,
  },
  async (request) => {
    const propertyId = request.data?.propertyId as string | undefined;

    if (!propertyId || !/^\d+$/.test(propertyId)) {
      throw new HttpsError("invalid-argument", "Valid propertyId is required");
    }

    try {
      const url =
        "https://experience.aucklandcouncil.govt.nz/" +
        `rubbish-recycling-collection-days/${propertyId}.html`;

      const pageResponse = await fetch(url);

      if (!pageResponse.ok) {
        throw new HttpsError(
          "unavailable",
          "Failed to fetch Auckland bin dates",
          {status: pageResponse.status},
        );
      }

      const html = await pageResponse.text();
      const collections = parseAucklandBinDates(html);

      return {
        propertyId,
        url,
        collections,
      };
    } catch (error: unknown) {
      console.error(error);

      if (error instanceof HttpsError) {
        throw error;
      }

      throw new HttpsError("internal", "Unable to fetch Auckland bin dates");
    }
  },
);
