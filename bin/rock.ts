#!/usr/bin/env bun

import { Command } from "commander";
import { makeConfigCommand } from "../src/commands/config.ts";
import { makeRawCommand } from "../src/commands/raw.ts";
import { makePeopleCommand } from "../src/commands/people.ts";
import { makeWorkflowsCommand } from "../src/commands/workflows.ts";
import { makeGivingCommand } from "../src/commands/giving.ts";
import { makeAttendanceCommand } from "../src/commands/attendance.ts";
import { makeContentCommand } from "../src/commands/content.ts";
import { makeCampusesCommand } from "../src/commands/campuses.ts";
import { makeCommCommand } from "../src/commands/communication.ts";
import { makeGroupsCommand } from "../src/commands/groups.ts";

const program = new Command();

program
  .name("rock")
  .description("CLI tool for the Rock RMS REST API")
  .version("0.1.0")
  .option("--json", "Output as formatted JSON")
  .option("--table", "Output as table")
  .option("--raw", "Output as compact JSON")
  .option("--dry-run", "Show what would be done without executing")
  .option("--verbose", "Enable verbose logging")
  .option("--profile <name>", "Use a specific config profile");

// Register commands
program.addCommand(makeConfigCommand());
program.addCommand(makeRawCommand());

// Wave 2 command registrations
program.addCommand(makePeopleCommand());
program.addCommand(makeGroupsCommand());
program.addCommand(makeAttendanceCommand());
program.addCommand(makeWorkflowsCommand());
program.addCommand(makeGivingCommand());
program.addCommand(makeContentCommand());
program.addCommand(makeCampusesCommand());
program.addCommand(makeCommCommand());

program.parse();
