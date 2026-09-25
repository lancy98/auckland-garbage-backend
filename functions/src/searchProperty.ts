import {HttpsError, onCall} from "firebase-functions/https";
import {requireAucklandGarbageCollectionApp} from "./appCheck";

const COUNCIL_ORIGIN = "https://experience.aucklandcouncil.govt.nz";
const SEARCH_PAGE =
  `${COUNCIL_ORIGIN}/rubbish-recycling-collection-days.html`;
const SESSION_TOKEN_PATTERN =
  /initialToken.{0,10}?(eyJ[\w-]+\.[\w-]+\.[\w-]+)/;

export const searchProperty = onCall(
  {enforceAppCheck: true},
  async (request) => {
    requireAucklandGarbageCollectionApp(request.app?.appId);

    const query = request.data?.query;

    if (typeof query !== "string" || query.trim() === "") {
      throw new HttpsError("invalid-argument", "query is required");
    }

    try {
      const sessionResponse = await fetch(SEARCH_PAGE, {
        headers: {"Cache-Control": "no-cache"},
      });

      if (!sessionResponse.ok) {
        throw new HttpsError(
          "unavailable",
          "Failed to start Auckland Council property search",
          {status: sessionResponse.status},
        );
      }

      const page = await sessionResponse.text();
      const token = page.match(SESSION_TOKEN_PATTERN)?.[1];

      if (!token) {
        throw new HttpsError(
          "unavailable",
          "Auckland Council search session is unavailable",
        );
      }

      const url = new URL("/nextapi/property", COUNCIL_ORIGIN);
      url.searchParams.set("query", query.trim());
      url.searchParams.set("pageSize", "20");

      const response = await fetch(url, {
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new HttpsError(
          "unavailable",
          "Failed to fetch property data",
          {status: response.status},
        );
      }

      return await response.json();
    } catch (error) {
      if (error instanceof HttpsError) {
        throw error;
      }

      throw new HttpsError(
        "unavailable",
        "Unable to search Auckland properties",
      );
    }
  },
);
