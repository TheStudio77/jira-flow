# jira-flow — session rules

- Read `README.md` first: what lives where, the contract, the host, the sync.
- jira-flow is a service — an engine, its server with a page, a JSON contract — not a claude-module module: no core,
  no model. A host runs the engine in its own process or talks to the server; either way it only calls the engine and
  never reaches Jira itself.
- English only in code, comments, messages, README and schemas. Other languages only in `locales/<lang>.json` and
  `tests/fixtures/`. Keys, statuses and codes are enum values (`src/enums.mjs`) with a label in `locales/en.json`;
  a text a person reads — a key in `locales/` (`textOf`), the page's texts — `page.*` keys.
- The service knows no host: no product names, folders or formats of a host anywhere; the check is
  `JIRA_FLOW_FORBID=<words> npm test` with the words of the hosts you know (run only when the human asks).
- Nothing personal in the repository: no site names, emails, account ids or people of a real Jira; tests use
  `example.atlassian.net`, `KEY` and made-up ids.
- The token goes only into the Authorization header and the host's secret store (`localHost`: `secrets.json`, mode
  600) — never into results, events, logs or the page.
- Jira is written only when a person asks (apply, a new project) or the sync of a space is on. Live checks on a real
  Jira only with the owner's consent.
- A change of the contract (`contract/calls.schema.json`, `events.schema.json`: routes, bodies, results, events) —
  `CONTRACT` in `index.mjs` and `version` in `package.json` go up together; the routes of `src/server.mjs` and the
  table of the contract stay equal (a test checks).
- No AI in commits or pull requests: no co-author trailers, no "Generated with".
- Do not run tests in the session (`npm test`): the pull request runs them; only when the human asks.
- A test file is no longer than 1500 lines: a suite, a scene and the shared code in `tests/` — helpers and the runner. A
  long file runs as one process and is not split between the blocks of a run. A file past the limit is split into suite
  files by topic (`tests/<topic>.test.mjs`), the shared code goes to its own file next to them (`tests/helpers.mjs`).
  Checks move word for word and in the same order; a suite sets up by itself the environment the checks before the cut
  left. The runner runs the suites one after another. A new check goes to the suite of its topic, not to the biggest
  one. In repositories with test-audit (from 0.4.0) a long file is an auditor error.
- Changes go through pull requests; tags and pushes only when the owner asks.
