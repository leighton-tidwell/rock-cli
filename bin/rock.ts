#!/usr/bin/env bun

import { Command } from "commander";
import { makeConfigCommand } from "../src/commands/config.ts";
import { makeFilesCommand } from "../src/commands/files.ts";
import { makeRawCommand } from "../src/commands/raw.ts";
import { makeResourceCommand } from "../src/commands/resource.ts";
import { makeSqlCommand } from "../src/commands/sql.ts";

const program = new Command();

program
	.name("rock")
	.description("CLI tool for the Rock RMS v2 REST API")
	.version("0.2.0")
	.option("--json", "Output as formatted JSON")
	.option("--table", "Output as table")
	.option("--raw", "Output as compact JSON")
	.option("--dry-run", "Show what would be done without executing")
	.option("--verbose", "Enable verbose logging")
	.option("--profile <name>", "Use a specific config profile");

program.addCommand(makeConfigCommand());
program.addCommand(makeRawCommand());
program.addCommand(makeResourceCommand());
program.addCommand(makeSqlCommand());
program.addCommand(makeFilesCommand());

program.parse();
