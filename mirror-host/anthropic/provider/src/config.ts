// Mirror Desktop fork (CR173): the configuration is the Desktop's, fixed here. The person's
// `claude-bridge.json`, global or per project, belongs to their own Pi and is neither read nor
// written: the Desktop's turns must not change when the person tunes their bridge, and the
// Desktop must not leave marks in their files. Upstream loaded both files, project over global.

import { existsSync, readFileSync } from "fs";

export interface Config {
	/** Date (YYYY-MM-DD) the one-time startup notice was shown. Written by the extension, not the user. */
	startupNoticeShown?: string;
	/** Date (YYYY-MM-DD) the AskClaude deprecation notice was shown. Written by the extension, not the user. */
	askClaudeDeprecationShown?: string;
	askClaude?: {
		enabled?: boolean;
		name?: string;
		label?: string;
		description?: string;
		defaultMode?: "full" | "read" | "none";
		defaultIsolated?: boolean;
		allowFullMode?: boolean;
		appendSkills?: boolean;
	};
	/** Low-level Claude Agent SDK plumbing. Most users won't need these. */
	provider?: {
		strictMcpConfig?: boolean;
		autoMemoryEnabled?: boolean;
		pathToClaudeCodeExecutable?: string;
		// Subscription plan tier. Setting to "max" enables Opus 4.6 at 1M context
		plan?: "pro" | "max";
		// Set to true to opt into metered 1M context usage ("extra usage" in
		// Anthropic billing). Enables Sonnet 4.6 [1m] on every plan and Opus 4.6
		// [1m] on Pro.
		longContextExtraUsage?: boolean;
		// Model ids (e.g. "claude-future-9") whose declared 1M context Claude Code
		// does not actually serve; pins them to the bare id at 200K.
		forceTwoHundredK?: string[];
	};
}

export function tryParseJson(path: string): Partial<Config> {
	if (!existsSync(path)) return {};
	try {
		return JSON.parse(readFileSync(path, "utf-8"));
	} catch (e) {
		console.error(`claude-bridge: failed to parse ${path}: ${e}`);
		return {};
	}
}

/** Mirror Desktop fork (CR167): `disableAllHooks` keeps every hook the person has in Claude Code,
 *  Mirror's plugin included, out of the Desktop's turns; without it each turn ran the plugin's
 *  hooks and was logged a second time. Settings `env` and `apiKeyHelper` still load. The argument
 *  is kept for upstream's call sites and ignored. */
export function claudeCodeSettings(_provider: Config["provider"] = {}): { autoMemoryEnabled: boolean; disableAllHooks: boolean } {
	return { autoMemoryEnabled: false, disableAllHooks: true };
}

/** Upstream recorded the notice in the person's global config. The Desktop queues no notice and
 *  writes nothing there. */
export function markStartupNoticeShown(): string {
	return "";
}

/** As above, for the AskClaude notice; AskClaude is never registered in the Desktop. */
export function markAskClaudeDeprecationNoticeShown(): string {
	return "";
}

/** The Desktop's configuration. No AskClaude (a Desktop turn runs Claude with `tools: []` and Pi
 *  runs the tools); upstream's provider defaults (plan "pro", strict MCP config, the Claude Code
 *  binary the Agent SDK ships); the startup notice marked as shown, so none is queued. */
export function loadConfig(_cwd: string): Config {
	return {
		startupNoticeShown: "mirror-desktop",
		askClaudeDeprecationShown: "mirror-desktop",
		askClaude: {},
		provider: {},
	};
}
