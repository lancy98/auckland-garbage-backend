/**
 * Import function triggers from their respective submodules:
 *
 * import {onCall} from "firebase-functions/v2/https";
 * import {onDocumentWritten} from "firebase-functions/v2/firestore";
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

import {HttpsError, onCall} from "firebase-functions/https";

export const searchProperty = onCall(
  {
    enforceAppCheck: true,
  },
  async (request) => {
    const query = request.data?.query as string | undefined;

    if (!query || query.trim() === "") {
      throw new HttpsError("invalid-argument", "query is required");
    }

    try {
      const encodedQuery = encodeURIComponent(`"${query}"`);
      const url = "https://experience.aucklandcouncil.govt.nz/" +
        `nextapi/property?query=${encodedQuery}&pageSize=20`;

      const responseFromURL = await fetch(url);

      if (!responseFromURL.ok) {
        throw new HttpsError(
          "unavailable",
          "Failed to fetch property data",
          {status: responseFromURL.status},
        );
      }

      return await responseFromURL.json();
    } catch (error) {
      if (error instanceof HttpsError) {
        throw error;
      }

      throw new HttpsError("internal", "Internal server error");
    }
  },
);
