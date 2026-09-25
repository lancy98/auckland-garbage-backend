# Auckland Garbage Collection Backend

Firebase Cloud Functions backend for looking up Auckland Council property records and rubbish, recycling, and food scraps collection dates.

The project exposes HTTPS callable Firebase Functions intended for the Auckland Garbage Collection iOS app. Both functions require Firebase App Check and verify the calling Firebase App ID.

## Features

- Search Auckland Council property records by address or query text.
- Fetch upcoming collection dates for a specific Auckland Council property ID.
- Parse collection results into a small, client-friendly JSON shape.
- TypeScript-based Firebase Functions project with linting and build checks.

## Tech Stack

- Firebase Cloud Functions
- Firebase Admin SDK
- Firebase Functions SDK
- TypeScript
- Cheerio for parsing Auckland Council collection-day pages

## Project Structure

```text
.
├── firebase.json
└── functions
    ├── package.json
    ├── src
    │   ├── appCheck.ts
    │   ├── getAucklandBinDates.ts
    │   ├── index.ts
    │   └── searchProperty.ts
    └── tsconfig.json
```

## Functions

### `searchProperty`

Searches Auckland Council property records.

Callable payload:

```json
{
  "query": "1 Queen Street"
}
```

The function obtains a search session from Auckland Council's collection-day
page, then calls the property API with that session and returns its JSON
response.

### `getAucklandBinDates`

Fetches and parses rubbish, recycling, and food scraps collection dates for a property.

Callable payload:

```json
{
  "propertyId": "123456789"
}
```

Example response shape:

```json
{
  "propertyId": "123456789",
  "url": "https://experience.aucklandcouncil.govt.nz/rubbish-recycling-collection-days/123456789.html",
  "collections": [
    {
      "type": "rubbish",
      "dateText": "Monday, 12 May",
      "date": "2026-05-12"
    }
  ]
}
```

Collection `type` values are:

- `rubbish`
- `recycling`
- `foodScraps`

## App Check

Both callable functions require a valid Firebase App Check token from the
Auckland Garbage Collection iOS app. The allowed Firebase App ID is in
`functions/src/appCheck.ts`; update it if the Firebase iOS app is replaced.

Register the iOS app with the App Attest provider in Firebase Console >
Security > App Check before deploying these functions. On the iOS simulator,
the Debug build uses the App Check debug provider and the local Functions
emulator. To test App Attest itself, run on a signed physical device against
deployed functions. Register any debug token used against deployed functions
in the Firebase console, and keep it out of source control.

## Requirements

- Node.js 24, matching the Firebase Functions runtime configured in `functions/package.json`
- npm
- Firebase CLI
- Access to a Firebase project with Cloud Functions enabled

Install the Firebase CLI if needed:

```sh
npm install -g firebase-tools
```

## Setup

Install dependencies:

```sh
cd functions
npm install
```

Log in to Firebase:

```sh
firebase login
```

Select or verify the Firebase project:

```sh
firebase use
```

## Development

Run linting:

```sh
cd functions
npm run lint
```

Run the callable tests:

```sh
cd functions
npm test
```

Build the TypeScript source:

```sh
cd functions
npm run build
```

Start the Firebase Functions emulator:

```sh
cd functions
npm run serve
```

Open the Firebase Functions shell:

```sh
cd functions
npm run shell
```

## Deployment

Deploy only the Cloud Functions:

```sh
cd functions
npm run deploy
```

View function logs:

```sh
cd functions
npm run logs
```

The root `firebase.json` runs linting and TypeScript compilation before deployment.

## Error Handling

The functions return Firebase `HttpsError` responses for invalid input and upstream service failures.

Common error codes:

- `invalid-argument`: missing or invalid request data
- `unavailable`: Auckland Council upstream request failed
- `internal`: unexpected server-side failure

## External Dependency

This backend depends on public Auckland Council endpoints under:

- `https://experience.aucklandcouncil.govt.nz/rubbish-recycling-collection-days.html`
- `https://experience.aucklandcouncil.govt.nz/nextapi/property`
- `https://experience.aucklandcouncil.govt.nz/rubbish-recycling-collection-days/{propertyId}.html`

Changes to Auckland Council's API responses or page markup may require parser updates.

## License

This project is licensed under a custom BSD-style license. See [LICENSE.md](LICENSE.md) for details.
