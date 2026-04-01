import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

export interface RockProfile {
	url: string;
	apiKey: string;
	defaultCampusId?: number;
}

export interface RockConfig {
	profiles: Record<string, RockProfile>;
	activeProfile: string;
}

function getConfigPath(): string {
	return process.env.ROCK_CONFIG_PATH || join(homedir(), ".rockrc.json");
}

export function loadConfig(): RockConfig {
	const configPath = getConfigPath();
	if (!existsSync(configPath)) {
		throw new Error(
			`Config file not found at ${configPath}. Run 'rock config init' to create one.`,
		);
	}
	const raw = readFileSync(configPath, "utf-8");
	return JSON.parse(raw) as RockConfig;
}

export function saveConfig(config: RockConfig): void {
	const configPath = getConfigPath();
	writeFileSync(configPath, JSON.stringify(config, null, 2), "utf-8");
}

export function getActiveProfile(profileOverride?: string): RockProfile {
	const config = loadConfig();
	const name = profileOverride || config.activeProfile;
	const profile = config.profiles[name];
	if (!profile) {
		throw new Error(
			`Profile '${name}' not found. Available profiles: ${Object.keys(config.profiles).join(", ")}`,
		);
	}
	return profile;
}
