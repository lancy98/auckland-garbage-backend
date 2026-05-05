/**
 * Import function triggers from their respective submodules:
 *
 * import {onCall} from "firebase-functions/v2/https";
 * import {onDocumentWritten} from "firebase-functions/v2/firestore";
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

import {onRequest} from "firebase-functions/https";

export const searchProperty = onRequest(async (request, response) => {
  try {
    const query = request.query.query as string;

    if (!query || query.trim() === "") {
      response.status(400).json({error: "query is required"});
      return;
    }

    const url = `https://experience.aucklandcouncil.govt.nz/nextapi/property?query=${encodeURIComponent(`"${query}"`)}&pageSize=20`;

    const responseFromURL = await fetch(url);

    if (!responseFromURL.ok) {
      response
        .status(responseFromURL.status)
        .json({error: "Failed to fetch property data"});
      return;
    }

    const data = await responseFromURL.json();

    response.status(200).json(data);
    return;
  } catch (error) {
    response.status(500).json({error: "Internal server error"});
  }
});
