import "server-only";

import { readFileSync } from "node:fs";
import { join } from "node:path";

const ENV_EXAMPLE_PATH = join(process.cwd(), ".env.example");
const GLOBAL_KEY = "__kepi_env_verify_done__";

type EnvVariableDefinition = {
  name: string;
  optional: boolean;
};

function parseEnvDefinitions(source: string): EnvVariableDefinition[] {
  const definitions = new Map<string, EnvVariableDefinition>();
  const lines = source.split(/\r?\n/u);

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const match = trimmed.match(/^#?\s*([A-Z][A-Z0-9_]*)\s*=/u);
    if (!match) continue;

    const name = match[1];
    const optional = trimmed.startsWith("#");
    const existing = definitions.get(name);
    if (!existing) {
      definitions.set(name, { name, optional });
      continue;
    }
    definitions.set(name, { name, optional: existing.optional && optional });
  }

  return [...definitions.values()];
}

function missingFromProcessEnv(definition: EnvVariableDefinition): boolean {
  const current = process.env[definition.name];
  return typeof current !== "string" || current.trim().length === 0;
}

export function verifyEnvFromExampleAtBoot(): void {
  const flagStore = globalThis as typeof globalThis & Record<string, boolean | undefined>;
  if (flagStore[GLOBAL_KEY]) {
    return;
  }
  flagStore[GLOBAL_KEY] = true;

  try {
    const envExample = readFileSync(ENV_EXAMPLE_PATH, "utf8");
    const definitions = parseEnvDefinitions(envExample);
    const missing = definitions.filter(missingFromProcessEnv);
    if (missing.length === 0) {
      process.stdout.write("[env:verify] All .env.example variables are set.\n");
      return;
    }

    const missingRequired = missing.filter((item) => !item.optional).map((item) => item.name);
    const missingOptional = missing.filter((item) => item.optional).map((item) => item.name);

    if (missingRequired.length > 0) {
      process.stderr.write(
        `[env:verify] Missing required environment variables (${missingRequired.length}): ${missingRequired.join(", ")}\n`,
      );
    }
    if (missingOptional.length > 0) {
      process.stderr.write(
        `[env:verify] Missing optional environment variables (${missingOptional.length}): ${missingOptional.join(", ")}\n`,
      );
    }
  } catch (error) {
    const reason = error instanceof Error ? error.message : "unknown error";
    process.stderr.write(`[env:verify] Could not verify environment variables: ${reason}\n`);
  }
}
