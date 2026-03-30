export function output(
  data: unknown,
  flags: { json?: boolean; raw?: boolean; table?: boolean }
): void {
  if (flags.raw) {
    process.stdout.write(JSON.stringify(data) + "\n");
    return;
  }

  if (flags.table) {
    printTable(data);
    return;
  }

  // Default: json mode
  process.stdout.write(JSON.stringify(data, null, 2) + "\n");
}

function printTable(data: unknown): void {
  if (Array.isArray(data)) {
    if (data.length === 0) {
      process.stdout.write("(empty)\n");
      return;
    }
    const keys = Object.keys(data[0] as Record<string, unknown>);
    const widths = keys.map((k) =>
      Math.max(
        k.length,
        ...data.map((row: Record<string, unknown>) => String(row[k] ?? "").length)
      )
    );

    const header = keys.map((k, i) => k.padEnd(widths[i]!)).join("  ");
    const separator = widths.map((w) => "-".repeat(w)).join("  ");
    process.stdout.write(header + "\n");
    process.stdout.write(separator + "\n");
    for (const row of data) {
      const line = keys
        .map((k, i) => String((row as Record<string, unknown>)[k] ?? "").padEnd(widths[i]!))
        .join("  ");
      process.stdout.write(line + "\n");
    }
  } else if (data !== null && typeof data === "object") {
    const entries = Object.entries(data as Record<string, unknown>);
    const maxKeyLen = Math.max(...entries.map(([k]) => k.length));
    for (const [key, value] of entries) {
      process.stdout.write(`${key.padEnd(maxKeyLen)}  ${value}\n`);
    }
  } else {
    process.stdout.write(String(data) + "\n");
  }
}
