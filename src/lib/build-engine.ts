/**
 * Simulated build engine for the prototype.
 *
 * Drives queued/running BuildJob rows in the store on a timer and appends log
 * lines. The desktop engine replaces `useBuildEngine` with real progress
 * events; the BuildJob shape and store calls stay identical.
 */
import { useEffect, useRef } from "react";
import { useStore } from "./store";
import { BUILD_STEPS } from "./project-analysis";
import type { BuildJob } from "./types";

const TICK_MS = 700;
const MAX_CONCURRENT = 1;

function stamp() {
  return new Date().toISOString().slice(11, 19);
}

export function useBuildEngine() {
  const store = useStore();
  const ref = useRef(store);
  ref.current = store;

  useEffect(() => {
    const timer = setInterval(() => {
      const s = ref.current;
      const builds = s.state.builds;
      const running = builds.filter((b) => b.status === "running");

      // Promote queued jobs when there is capacity.
      if (running.length < MAX_CONCURRENT) {
        const next = [...builds].reverse().find((b) => b.status === "queued");
        if (next) {
          s.updateBuild(next.id, {
            status: "running",
            startedAt: Date.now(),
            progress: 1,
            log: [`${stamp()} [INFO] Starting build for ${next.label}`],
          });
          return;
        }
      }

      for (const b of running) advance(s, b);
    }, TICK_MS);
    return () => clearInterval(timer);
  }, []);
}

function advance(s: ReturnType<typeof useStore>, b: BuildJob) {
  const per = 100 / BUILD_STEPS.length;
  const before = Math.floor(b.progress / per);
  const progress = Math.min(100, b.progress + 6 + Math.round(Math.random() * 9));
  const after = Math.min(BUILD_STEPS.length - 1, Math.floor(progress / per));

  const log = [...b.log];
  if (after !== before) log.push(`${stamp()} [STEP] ${BUILD_STEPS[after]}…`);
  if (progress >= 100) {
    log.push(`${stamp()} [OK] ${b.label} written · ${(1.2 + Math.random() * 3).toFixed(1)} MB`);
    s.updateBuild(b.id, { status: "success", progress: 100, finishedAt: Date.now(), log });
    s.pushNotification({
      title: "Build complete",
      body: `${b.label} finished successfully.`,
      level: "success",
      actionLabel: "Open queue",
      actionRoute: "queue",
    });
    s.logActivity({ kind: "build", entityType: "project", entityId: b.projectId, summary: `Built ${b.label}` });
    return;
  }
  s.updateBuild(b.id, { progress, log: log.slice(-40) });
}
