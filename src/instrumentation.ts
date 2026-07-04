/**
 * Built-in trash sweeper — runs inside the server process so no external
 * cron/scheduler is needed. Set DOCKET_TRASH_TTL_DAYS=0 to disable
 * (e.g. when you prefer an external `npm run cleanup` schedule).
 */
const SWEEP_INTERVAL_MS = 6 * 60 * 60 * 1000;
const FIRST_SWEEP_DELAY_MS = 30 * 1000;

export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const ttl = Number(process.env.DOCKET_TRASH_TTL_DAYS ?? 30);
  if (!(ttl > 0)) return;

  const { sweepTrash } = await import("./lib/store");
  const sweep = async () => {
    try {
      const { removed } = await sweepTrash(ttl);
      if (removed > 0) {
        console.log(
          `[docket] trash sweep: purged ${removed} item(s) (ttl ${ttl}d)`,
        );
      }
    } catch (err) {
      console.error("[docket] trash sweep failed:", err);
    }
  };
  setTimeout(sweep, FIRST_SWEEP_DELAY_MS);
  setInterval(sweep, SWEEP_INTERVAL_MS);
  console.log(`[docket] trash sweeper armed (ttl ${ttl}d, every 6h)`);
}
