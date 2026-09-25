const assert = require("node:assert/strict");
const {afterEach, test} = require("node:test");
const {getAucklandBinDates} = require("../lib/getAucklandBinDates");
const {AUCKLAND_GARBAGE_COLLECTION_APP_ID} = require("../lib/appCheck");

const originalFetch = global.fetch;
const authorizedApp = {appId: AUCKLAND_GARBAGE_COLLECTION_APP_ID};

afterEach(() => {
  global.fetch = originalFetch;
});

test("returns collection dates from a serviced property page", async () => {
  const html = `<body>
    <h2>Your next collection dates</h2>
    <p>Rubbish: Thursday, 24 September 2026</p>
    <p>Food scraps: Thursday, 24 September 2026</p>
    <p>Recycling: Thursday, 1 October 2026</p>
  </body>`;
  global.fetch = async (url) => {
    assert.equal(
      String(url),
      "https://experience.aucklandcouncil.govt.nz/" +
        "rubbish-recycling-collection-days/12341294590.html",
    );
    return new Response(html);
  };

  const result = await getAucklandBinDates.run({
    app: authorizedApp,
    data: {propertyId: "12341294590"},
  });

  assert.deepEqual(result.collections, [
    {
      type: "rubbish", dateText: "Thursday, 24 September 2026",
      date: "2026-09-24",
    },
    {
      type: "foodScraps", dateText: "Thursday, 24 September 2026",
      date: "2026-09-24",
    },
    {
      type: "recycling", dateText: "Thursday, 1 October 2026",
      date: "2026-10-01",
    },
  ]);
});

test("returns no dates for a property with private collection", async () => {
  global.fetch = async () => new Response(`<body>
    <h2>Your next collection dates</h2>
    <p>Rubbish:</p><p>Food scraps:</p><p>Recycling:</p>
    <p>Private rubbish and recycling service. Contact your property manager.</p>
  </body>`);

  const result = await getAucklandBinDates.run({
    app: authorizedApp,
    data: {propertyId: "12347053714"},
  });

  assert.deepEqual(result.collections, []);
});

test("rejects property IDs that are not digit strings", async () => {
  global.fetch = () => {
    throw new Error("unexpected request");
  };

  for (const propertyId of [undefined, 12341294590, "12x", ""]) {
    await assert.rejects(
      getAucklandBinDates.run({app: authorizedApp, data: {propertyId}}),
      {code: "invalid-argument"},
    );
  }
});

test("rejects calls from another app or without App Check", async () => {
  global.fetch = () => {
    throw new Error("unexpected request");
  };

  for (const app of [undefined, {appId: "other-app"}]) {
    await assert.rejects(
      getAucklandBinDates.run({app, data: {propertyId: "12341294590"}}),
      {code: "permission-denied"},
    );
  }
});
