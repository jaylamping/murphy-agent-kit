export interface ResourceClaim {
  resourceId: string;
  kind: string;
  mode: "exclusive-write" | "shared-read";
}

export interface SubtaskLane {
  subtaskId: string;
  claims: ResourceClaim[];
  allowedPaths: string[];
  dependsOn: string[];
}

export interface StoryLane {
  storyId: string;
  claims: ResourceClaim[];
  dependsOn: string[];
  subtasks: SubtaskLane[];
}

export interface WipLimits {
  storyLanes: number;
  pupsPerStory: number;
  noses: number;
  leads: number;
  judges: number;
  sharedFoundationLanes: number;
}

export interface SchedulePlan {
  readyStories: string[];
  blockedStories: Array<{ storyId: string; reason: string }>;
  readySubtasks: Array<{ storyId: string; subtaskId: string }>;
  blockedSubtasks: Array<{
    storyId: string;
    subtaskId: string;
    reason: string;
  }>;
  claimConflicts: Array<{ a: string; b: string; resourceId: string }>;
}

function claimsConflict(a: ResourceClaim[], b: ResourceClaim[]): string | null {
  for (const ca of a) {
    for (const cb of b) {
      if (ca.resourceId !== cb.resourceId) continue;
      if (ca.mode === "exclusive-write" || cb.mode === "exclusive-write") {
        return ca.resourceId;
      }
    }
  }
  return null;
}

export class ParallelScheduler {
  constructor(private readonly limits: WipLimits) {}

  plan(
    stories: StoryLane[],
    active: {
      storyIds: Set<string>;
      subtaskIds: Set<string>;
      noseCount: number;
      leadCount: number;
      judgeCount: number;
    },
  ): SchedulePlan {
    const result: SchedulePlan = {
      readyStories: [],
      blockedStories: [],
      readySubtasks: [],
      blockedSubtasks: [],
      claimConflicts: [],
    };

    const completed = new Set(
      stories
        .filter((s) => active.storyIds.has(`done:${s.storyId}`))
        .map((s) => s.storyId),
    );

    // Detect pairwise claim conflicts among stories
    for (let i = 0; i < stories.length; i++) {
      for (let j = i + 1; j < stories.length; j++) {
        const conflict = claimsConflict(stories[i].claims, stories[j].claims);
        if (conflict) {
          result.claimConflicts.push({
            a: stories[i].storyId,
            b: stories[j].storyId,
            resourceId: conflict,
          });
        }
      }
    }

    const activeExclusive = new Set<string>();
    for (const s of stories) {
      if (!active.storyIds.has(s.storyId)) continue;
      for (const c of s.claims) {
        if (c.mode === "exclusive-write") activeExclusive.add(c.resourceId);
      }
    }

    for (const story of stories) {
      if (active.storyIds.has(story.storyId) || completed.has(story.storyId)) {
        continue;
      }
      const unmet = story.dependsOn.filter((d) => !completed.has(d));
      if (unmet.length) {
        result.blockedStories.push({
          storyId: story.storyId,
          reason: `depends-on:${unmet.join(",")}`,
        });
        continue;
      }
      const conflict = story.claims.find(
        (c) =>
          c.mode === "exclusive-write" && activeExclusive.has(c.resourceId),
      );
      if (conflict) {
        result.blockedStories.push({
          storyId: story.storyId,
          reason: `claim-conflict:${conflict.resourceId}`,
        });
        continue;
      }
      if (result.readyStories.length + active.storyIds.size >= this.limits.storyLanes) {
        result.blockedStories.push({
          storyId: story.storyId,
          reason: "wip-story-lanes",
        });
        continue;
      }
      result.readyStories.push(story.storyId);
      for (const c of story.claims) {
        if (c.mode === "exclusive-write") activeExclusive.add(c.resourceId);
      }
    }

    for (const story of stories) {
      if (!active.storyIds.has(story.storyId) && !result.readyStories.includes(story.storyId)) {
        continue;
      }
      const activePups = [...active.subtaskIds].filter((id) =>
        id.startsWith(`${story.storyId}/`),
      ).length;
      const activeClaims: ResourceClaim[] = [];
      for (const st of story.subtasks) {
        if (active.subtaskIds.has(`${story.storyId}/${st.subtaskId}`)) {
          activeClaims.push(...st.claims);
        }
      }

      for (const st of story.subtasks) {
        const key = `${story.storyId}/${st.subtaskId}`;
        if (active.subtaskIds.has(key)) continue;
        const unmet = st.dependsOn.filter(
          (d) => !active.subtaskIds.has(`done:${story.storyId}/${d}`),
        );
        // treat done markers
        const unmetDep = st.dependsOn.filter((d) => {
          return !active.subtaskIds.has(`done:${story.storyId}/${d}`);
        });
        if (unmetDep.length && st.dependsOn.length) {
          // only block if dependency not marked done
          const allDone = st.dependsOn.every((d) =>
            active.subtaskIds.has(`done:${story.storyId}/${d}`),
          );
          if (!allDone) {
            result.blockedSubtasks.push({
              storyId: story.storyId,
              subtaskId: st.subtaskId,
              reason: `depends-on:${st.dependsOn.join(",")}`,
            });
            continue;
          }
        }
        void unmet;
        const conflict = claimsConflict(st.claims, activeClaims);
        if (conflict) {
          result.blockedSubtasks.push({
            storyId: story.storyId,
            subtaskId: st.subtaskId,
            reason: `claim-conflict:${conflict}`,
          });
          continue;
        }
        if (activePups + result.readySubtasks.filter((r) => r.storyId === story.storyId).length >= this.limits.pupsPerStory) {
          result.blockedSubtasks.push({
            storyId: story.storyId,
            subtaskId: st.subtaskId,
            reason: "wip-pups-per-story",
          });
          continue;
        }
        result.readySubtasks.push({
          storyId: story.storyId,
          subtaskId: st.subtaskId,
        });
        activeClaims.push(...st.claims);
      }
    }

    return result;
  }

  canStartNose(activeNoses: number): boolean {
    return activeNoses < this.limits.noses;
  }

  canStartLead(activeLeads: number): boolean {
    return activeLeads < this.limits.leads;
  }

  canStartJudge(activeJudges: number): boolean {
    return activeJudges < this.limits.judges;
  }
}

/**
 * Shepherd glance is due once merged-since-checkpoint reaches min (at least every min turns).
 * max is retained for profile docs; eligibility is count >= min.
 */
export function shouldInvokeShepherd(
  mergedCount: number,
  min = 3,
  _max = 3,
): boolean {
  return mergedCount >= min;
}

/** Shepherd glance due when merged count reaches min (default ≥3). */
export function shepherdDue(
  mergedSinceCheckpoint: number,
  min = 3,
  _max = 3,
): boolean {
  return mergedSinceCheckpoint >= min;
}
