import type { Command } from "commander";

/**
 * Walk to the true root command. Global options (--profile, --json, --raw,
 * --dry-run, …) are declared on the root program, and commander routes them
 * there regardless of where they appear on the command line. Leaf actions must
 * read them from the root rather than from their own opts.
 */
export function rootCmd(cmd: Command): Command {
	let c = cmd;
	while (c.parent) c = c.parent;
	return c;
}

/** Resolve a profile override, preferring an explicit leaf value, then the global root option. */
export function resolveProfileOverride(
	opts: { profile?: string },
	cmd: Command,
): string | undefined {
	return opts.profile ?? (rootCmd(cmd).opts().profile as string | undefined);
}
