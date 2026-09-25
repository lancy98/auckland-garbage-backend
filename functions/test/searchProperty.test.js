const assert = require("node:assert/strict");
const {afterEach, test} = require("node:test");
const {searchProperty} = require("../lib/searchProperty");
const {AUCKLAND_GARBAGE_COLLECTION_APP_ID} = require("../lib/appCheck");

const originalFetch = global.fetch;
const authorizedApp = {appId: AUCKLAND_GARBAGE_COLLECTION_APP_ID};
const token = "eyJhbGciOiJIUzI1NiJ9.eyJleHAiOjk5OTk5OTk5OTl9.signature";

afterEach(() => {
  global.fetch = originalFetch;
});

test("searches with the council page session token", async () => {
  const calls = [];
  global.fetch = async (url, options) => {
    calls.push({url: String(url), options});
    if (calls.length === 1) {
      return new Response(
        `<script>initialToken\\":\\"${token}\\"</script>`,
      );
    }
    return Response.json({items: [{id: "123", address: "1 Queen Street"}]});
  };

  const result = await searchProperty.run({
    app: authorizedApp,
    data: {query: " 1 Queen Street "},
  });

  assert.deepEqual(result, {
    items: [{id: "123", address: "1 Queen Street"}],
  });
  assert.equal(
    calls[0].url,
    "https://experience.aucklandcouncil.govt.nz/" +
      "rubbish-recycling-collection-days.html",
  );
  const searchUrl = new URL(calls[1].url);
  assert.equal(searchUrl.pathname, "/nextapi/property");
  assert.equal(searchUrl.searchParams.get("query"), "1 Queen Street");
  assert.equal(searchUrl.searchParams.get("pageSize"), "20");
  assert.equal(calls[1].options.headers.Authorization, `Bearer ${token}`);
});

test("rejects invalid queries before contacting the council", async () => {
  global.fetch = () => {
    throw new Error("unexpected request");
  };

  for (const query of [undefined, 42, "   "]) {
    await assert.rejects(
      searchProperty.run({app: authorizedApp, data: {query}}),
      {code: "invalid-argument"},
    );
  }
});

test("reports an unavailable session when the page has no token", async () => {
  global.fetch = async () => new Response("<html></html>");

  await assert.rejects(
    searchProperty.run({app: authorizedApp, data: {query: "Queen Street"}}),
    {code: "unavailable"},
  );
});

test("reports the council search failure with its status", async () => {
  global.fetch = async (url) => {
    if (String(url).endsWith(".html")) {
      return new Response(`initialToken\\":\\"${token}\\"`);
    }
    return new Response("Unauthorized", {status: 401});
  };

  await assert.rejects(
    searchProperty.run({app: authorizedApp, data: {query: "Queen Street"}}),
    {code: "unavailable", details: {status: 401}},
  );
});

test("rejects calls from another app or without App Check", async () => {
  global.fetch = () => {
    throw new Error("unexpected request");
  };

  for (const app of [undefined, {appId: "other-app"}]) {
    await assert.rejects(
      searchProperty.run({app, data: {query: "Queen Street"}}),
      {code: "permission-denied"},
    );
  }
});

test("accepts an omitted app ID only in the Functions emulator", async () => {
  const previousValue = process.env.FUNCTIONS_EMULATOR;
  process.env.FUNCTIONS_EMULATOR = "true";
  global.fetch = async (url) => {
    if (String(url).endsWith(".html")) {
      return new Response(`initialToken\\":\\"${token}\\"`);
    }
    return Response.json({items: []});
  };

  try {
    await assert.doesNotReject(
      searchProperty.run({
        app: {appId: undefined}, data: {query: "Queen Street"},
      }),
    );
    await assert.rejects(
      searchProperty.run({
        app: {appId: "other-app"}, data: {query: "Queen Street"},
      }),
      {code: "permission-denied"},
    );
  } finally {
    if (previousValue === undefined) {
      delete process.env.FUNCTIONS_EMULATOR;
    } else {
      process.env.FUNCTIONS_EMULATOR = previousValue;
    }
  }
});
