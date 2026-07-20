export type Assignment = {
  key: string;
  value: string;
};

/** Parse the tiny `key=value` format used by the acceptance-worker lesson. */
export function parseAssignment(source: string): Assignment {
  const separator = source.indexOf("=");
  if (separator <= 0) throw new Error("expected key=value");

  const key = source.slice(0, separator).trim();
  const value = source.slice(separator + 1).trim();
  if (!key || !value) throw new Error("key and value are required");

  return { key, value };
}
