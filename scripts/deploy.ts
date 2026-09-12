import { readFile, unlink, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

type Run = (args: string[]) => Promise<string>;
export async function ensureDatabase(name: string, run: Run): Promise<string> {
  const find = async () => {
    const databases: unknown = JSON.parse(await run(["d1", "list", "--json"]));
    if (!Array.isArray(databases)) throw new Error("Invalid D1 database list");
    const match = databases.find((db) => db.name === name);
    if (!match) return undefined;
    if (typeof match.uuid !== "string" || !match.uuid)
      throw new Error("Missing D1 database ID");
    return match.uuid;
  };
  const existing = await find();
  if (existing) return existing;
  try {
    await run(["d1", "create", name, "--update-config=false"]);
  } catch (error) {
    const concurrent = await find();
    if (concurrent) return concurrent;
    throw error;
  }
  const id = await find();
  if (!id) throw new Error(`Database ${name} was not found after creation`);
  return id;
}

export async function ensureBucket(name: string, run: Run) {
  try {
    await run(["r2", "bucket", "info", name]);
    return;
  } catch {}
  try {
    await run(["r2", "bucket", "create", name]);
  } catch (error) {
    try {
      await run(["r2", "bucket", "info", name]);
    } catch {
      throw error;
    }
  }
}

export async function deployWorkers(
  navigationConfig: string,
  mainConfig: string,
  run: Run,
) {
  await run([
    "d1",
    "migrations",
    "apply",
    "DB",
    "--remote",
    "--config",
    navigationConfig,
  ]);
  await run(["deploy", "--config", navigationConfig]);
  await run(["deploy", "--config", mainConfig]);
}

export function deploymentEnvironment(
  source: Record<string, string | undefined>,
  args: string[],
  mainConfig: string,
) {
  const env: Record<string, string | undefined> = { ...source, CI: "true" };
  const config = args[args.indexOf("--config") + 1];
  if (
    args[0] === "deploy" &&
    config &&
    resolve(config) !== resolve(mainConfig)
  ) {
    // Workers Builds targets the connected main Worker; the explicit child
    // deployment must use its own configured name in the same account.
    delete env.WRANGLER_CI_OVERRIDE_NAME;
    delete env.WRANGLER_CI_MATCH_TAG;
  }
  return env;
}

async function deploy() {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
  const run: Run = async (args) => {
    const child = Bun.spawn(["bunx", "wrangler", ...args], {
      cwd: root,
      env: deploymentEnvironment(
        process.env,
        args,
        resolve(root, "wrangler.jsonc"),
      ),
      stdin: "ignore",
      stdout: "pipe",
      stderr: "inherit",
    });
    const output = await new Response(child.stdout).text();
    if ((await child.exited) !== 0)
      throw new Error(`Wrangler ${args[0]} failed`);
    if (!args.includes("--json")) process.stdout.write(output);
    return output;
  };
  const config = Bun.JSONC.parse(
    await readFile(resolve(root, "apps/navigation/wrangler.jsonc"), "utf8"),
  ) as {
    r2_buckets?: Array<{ bucket_name: string }>;
    d1_databases?: Array<{
      binding: string;
      database_name: string;
      database_id?: string;
      preview_database_id?: string;
    }>;
  };
  const database = config.d1_databases?.find(
    (item: { binding: string }) => item.binding === "DB",
  );
  if (!database?.database_name) throw new Error("DB configuration is missing");
  database.database_id ||= await ensureDatabase(database.database_name, run);
  delete database.preview_database_id;
  for (const bucket of config.r2_buckets || [])
    await ensureBucket(bucket.bucket_name, run);
  // Keep generated IDs out of source configuration and local database identity.
  const generated = resolve(
    root,
    "apps/navigation",
    `.wrangler.deploy-${process.pid}.json`,
  );
  try {
    await writeFile(generated, JSON.stringify(config, null, 2), { flag: "wx" });
    await deployWorkers(generated, resolve(root, "wrangler.jsonc"), run);
  } finally {
    await unlink(generated).catch(() => {});
  }
}
if (import.meta.main) await deploy();
