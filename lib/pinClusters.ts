// When a day's pins overlap at the zoom that fits the whole day, the top marker's number
// hides the rest. Merge pins that sit within `radius` screen pixels into one marker that
// names its stops ("2–7"), so every row's number can be found on the map.

type Projected = { id: string; label: string; x: number; y: number };
export type PinGroup = { ids: string[]; label: string; x: number; y: number };

export function rangeLabel(labels: string[]): string {
  const nums = labels.map(Number).sort((a, b) => a - b);
  if (nums.length === 1) return String(nums[0]);
  const consecutive = nums.every((n, i) => i === 0 || n === nums[i - 1] + 1);
  return consecutive ? `${nums[0]}–${nums.at(-1)}` : `${nums[0]}+`;
}

export function clusterPins(pins: Projected[], radius: number, keepId?: string): PinGroup[] {
  const groups: { members: Projected[] }[] = [];
  for (const p of pins) {
    const home =
      p.id === keepId
        ? undefined
        : groups.find((g) => g.members[0].id !== keepId && g.members.some((m) => Math.hypot(m.x - p.x, m.y - p.y) < radius));
    if (home) home.members.push(p);
    else groups.push({ members: [p] });
  }
  return groups.map(({ members }) => ({
    ids: members.map((m) => m.id),
    label: rangeLabel(members.map((m) => m.label)),
    x: members.reduce((n, m) => n + m.x, 0) / members.length,
    y: members.reduce((n, m) => n + m.y, 0) / members.length,
  }));
}
