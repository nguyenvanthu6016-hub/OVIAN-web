import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

/**
 * Runs integrations/google-sheets/Code.gs in a VM with minimal fakes of the Apps Script services,
 * so the real script is tested (not a re-implementation). The fake sheet strips a leading
 * apostrophe the way Google Sheets does, and keeps the raw appended values for assertions.
 */
export function loadAppsScript(secret = "s".repeat(32)) {
  const code = readFileSync(fileURLToPath(new URL("../../integrations/google-sheets/Code.gs", import.meta.url)), "utf8");
  const rows: unknown[][] = [];
  const rawAppends: unknown[][] = [];
  const props = new Map<string, string>(secret ? [["OVIAN_SECRET", secret]] : []);
  const mails: { to: string; subject: string; body: string }[] = [];
  let sheetExists = false;

  const anyRange = new Proxy({}, { get: () => () => anyRange }); // every range method is chainable no-op
  const sheet = {
    appendRow(r: unknown[]) {
      rawAppends.push([...r]);
      rows.push(r.map((v) => (typeof v === "string" && v.startsWith("'") ? v.slice(1) : v)));
    },
    getLastRow: () => rows.length,
    getMaxRows: () => 1000,
    getDataRange: () => ({ getValues: () => rows.map((r) => [...r]) }),
    getRange: (r: number, c: number, nr?: number, nc?: number) => ({
      ...anyRange,
      setValues(v: unknown[][]) {
        if (r === 1 && nr === 1) rows[0] = [...(v[0] ?? [])];
        void c; void nc;
        return this;
      },
      setFontWeight() { return this; },
      setBackground() { return this; },
      setNumberFormat() { return this; },
      setWrap() { return this; },
      setDataValidation() { return this; },
      insertCheckboxes() { return this; },
    }),
    setFrozenRows() {},
    setFrozenColumns() {},
    setColumnWidth() {},
    hideColumns() {},
  };
  const builder: Record<string, () => unknown> = {};
  for (const m of ["requireValueInList", "setAllowInvalid"]) builder[m] = () => builder;
  builder.build = () => ({});

  const context = vm.createContext({
    console: { error: () => {}, log: () => {} },
    JSON, Object, String, Number, Array, Math, Date, isFinite,
    PropertiesService: { getScriptProperties: () => ({ getProperty: (k: string) => props.get(k) ?? null, setProperty: (k: string, v: string) => props.set(k, v) }) },
    LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) },
    ContentService: { MimeType: { JSON: "json" }, createTextOutput: (s: string) => ({ content: s, setMimeType() { return this; } }) },
    MailApp: { sendEmail: (to: string, subject: string, body: string) => mails.push({ to, subject, body }) },
    SpreadsheetApp: {
      flush() {},
      newDataValidation: () => builder,
      getActiveSpreadsheet: () => ({
        getSheetByName: () => (sheetExists ? sheet : null),
        insertSheet: () => { sheetExists = true; return sheet; },
        getUrl: () => "https://docs.google.com/spreadsheets/d/test",
      }),
    },
  });
  vm.runInContext(`${code}\n;globalThis.__api = { doPost, doGet, setup, HEADERS };`, context);
  const api = (context as unknown as { __api: { doPost: (e: unknown) => { content: string }; doGet: () => { content: string }; setup: () => void; HEADERS: string[] } }).__api;

  const post = (body: unknown) => JSON.parse(api.doPost({ postData: { contents: typeof body === "string" ? body : JSON.stringify(body) } }).content);
  /** fetch replacement: routes the website's request into doPost, like the real web app. */
  const fetch = async (_url: string, init: { body: string }) => new Response(api.doPost({ postData: { contents: init.body } }).content, { status: 200 });

  return { api, rows, rawAppends, props, mails, post, fetch, col: (h: string) => api.HEADERS.indexOf(h) };
}
