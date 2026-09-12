import { spawn } from "node:child_process";
import { createServer } from "node:net";

const args = process.argv.slice(2);
const portFlag = args.find((arg) => arg.startsWith("--port="));
const portIndex = args.indexOf("--port");
const port = Number(
  portFlag?.slice(7) ?? (portIndex < 0 ? 5175 : args[portIndex + 1]),
);
if (!Number.isInteger(port) || port < 1 || port > 65535 || port === 8787)
  throw new Error("请选择有效且不同于导航服务 8787 的桌面端口");
for (const candidate of [port, 8787]) {
  await new Promise<void>((resolve, reject) => {
    const probe = createServer();
    probe.once("error", () =>
      reject(new Error(`端口 ${candidate} 已被占用，请先结束原开发服务`)),
    );
    probe.listen(candidate, "127.0.0.1", () => probe.close(() => resolve()));
  });
}

const migration = Bun.spawnSync(["bun", "run", "navigation:migrate:local"], {
  stdout: "inherit",
  stderr: "inherit",
});
if (migration.exitCode !== 0) process.exit(migration.exitCode);

const navigationBuild = Bun.spawnSync(["bun", "run", "build:navigation"], {
  stdout: "inherit",
  stderr: "inherit",
});
if (navigationBuild.exitCode !== 0) process.exit(navigationBuild.exitCode);

const processes = [
  spawn(process.execPath, ["run", "navigation:dev"], {
    stdio: "inherit",
    detached: true,
  }),
  spawn(process.execPath, ["run", "dev:desktop", ...args], {
    stdio: "inherit",
    detached: true,
  }),
];
const stop = () => {
  for (const child of processes) {
    if (!child.pid) continue;
    try {
      process.kill(-child.pid, "SIGTERM");
    } catch {}
  }
};
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
const code = await Promise.race(
  processes.map(
    (child) =>
      new Promise<number>((resolve) => {
        child.once("error", (error) => {
          console.error(error.message);
          resolve(1);
        });
        child.once("exit", (status, signal) =>
          resolve(
            status ?? (signal === "SIGINT" || signal === "SIGTERM" ? 0 : 1),
          ),
        );
      }),
  ),
);
stop();
process.exit(code);
