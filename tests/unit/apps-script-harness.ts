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
  const props = new Map<string, string>(secret ? [["OVIAN_SECRET", secret]] : []);
  const mails: { to: string; subject: string; body: string }[] = [];
  const sheets = new Map<string, FakeSheet>();
  const rawAppends: unknown[][] = [];

  /** Any method not modelled is a chainable no-op (formatting, validation, notes…). */
  const chain = <T extends object>(base: T): T =>
    new Proxy(base, { get: (t, k) => (k in t ? (t as Record<string | symbol, unknown>)[k] : () => chain(base)) });

  interface FakeSheet {
    rows: unknown[][];
    appendRow(r: unknown[]): void;
    getLastRow(): number;
    getMaxRows(): number;
    getDataRange(): { getValues(): unknown[][] };
    getRange(r: number, c: number, nr?: number, nc?: number): unknown;
  }

  function makeSheet(name: string): FakeSheet {
    const rows: unknown[][] = [];
    const sheet = chain({
      rows,
      appendRow(r: unknown[]) {
        if (name === "Đơn hàng") rawAppends.push([...r]);
        rows.push(r.map((v) => (typeof v === "string" && v.startsWith("'") ? v.slice(1) : v)));
      },
      getLastRow: () => rows.length,
      getMaxRows: () => 1000,
      getDataRange: () => ({ getValues: () => rows.map((r) => [...r]) }),
      getRange: (r: number, c: number, nr?: number, nc?: number) => {
        const range = chain({
          getValue: () => rows[r - 1]?.[c - 1] ?? "",
          getValues: () => Array.from({ length: nr ?? 1 }, (_, i) => Array.from({ length: nc ?? 1 }, (_, j) => rows[r - 1 + i]?.[c - 1 + j] ?? "")),
          setValues(v: unknown[][]) {
            v.forEach((row, i) => {
              rows[r - 1 + i] ??= [];
              row.forEach((cell, j) => { rows[r - 1 + i]![c - 1 + j] = cell; });
            });
            return range;
          },
        });
        return range;
      },
    }) as FakeSheet;
    return sheet;
  }

  const spreadsheet = chain({
    getSheetByName: (n: string) => sheets.get(n) ?? null,
    insertSheet: (n: string) => {
      const s = makeSheet(n);
      sheets.set(n, s);
      return s;
    },
    getUrl: () => "https://docs.google.com/spreadsheets/d/test",
  });

  const builder = chain({ build: () => ({}) });
  const context = vm.createContext({
    console: { error: () => {}, log: () => {} },
    JSON, Object, String, Number, Array, Math, Date, isFinite,
    PropertiesService: { getScriptProperties: () => ({ getProperty: (k: string) => props.get(k) ?? null, setProperty: (k: string, v: string) => props.set(k, v) }) },
    LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) },
    ContentService: { MimeType: { JSON: "json" }, createTextOutput: (s: string) => ({ content: s, setMimeType() { return this; } }) },
    MailApp: { sendEmail: (to: string, subject: string, body: string) => mails.push({ to, subject, body }) },
    SpreadsheetApp: { flush() {}, newDataValidation: () => builder, getActiveSpreadsheet: () => spreadsheet },
  });
  vm.runInContext(`${code}\n;globalThis.__api = { doPost, doGet, setup, HEADERS };`, context);
  const api = (context as unknown as { __api: { doPost: (e: unknown) => { content: string }; doGet: () => { content: string }; setup: () => void; HEADERS: string[] } }).__api;

  const post = (body: unknown) => JSON.parse(api.doPost({ postData: { contents: typeof body === "string" ? body : JSON.stringify(body) } }).content);
  /** fetch replacement: routes the website's request into doPost, like the real web app. */
  const fetch = async (_url: string, init: { body: string }) => new Response(api.doPost({ postData: { contents: init.body } }).content, { status: 200 });

  return {
    api,
    get rows() {
      return sheets.get("Đơn hàng")?.rows ?? [];
    },
    /** Add a phone number to the "Chặn" blocklist sheet. */
    block(phone: string, reason = "spam") {
      sheets.get("Chặn")?.appendRow([phone, reason, new Date()]);
    },
    rawAppends,
    props,
    mails,
    post,
    fetch,
    col: (h: string) => api.HEADERS.indexOf(h),
  };
}
