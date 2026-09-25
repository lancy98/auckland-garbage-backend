import {HttpsError} from "firebase-functions/https";

export const AUCKLAND_GARBAGE_COLLECTION_APP_ID =
  "1:90260538177:ios:6ed524c2ee6ba48bb297c0";

/**
 * Rejects callable requests from any other Firebase app.
 * @param {string | undefined} appId Verified Firebase App ID.
 */
export function requireAucklandGarbageCollectionApp(
  appId: string | undefined,
): void {
  // The Functions emulator accepts the simulator debug token without
  // supplying its app ID. Its callable middleware still requires a token.
  if (process.env.FUNCTIONS_EMULATOR === "true" && appId === undefined) {
    return;
  }

  if (appId !== AUCKLAND_GARBAGE_COLLECTION_APP_ID) {
    throw new HttpsError("permission-denied", "App is not authorized");
  }
}
