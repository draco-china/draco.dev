/** Same-document bridge. It never creates an audio element or crosses origins. */
export interface PlayerSnapshot {
  connected: boolean;
  title: string;
  artist: string;
  cover: string;
  playing: boolean;
  progress: number;
  duration: number;
  message?: string;
}
const empty = (): PlayerSnapshot => ({
  connected: false,
  title: "",
  artist: "",
  cover: "",
  playing: false,
  progress: 0,
  duration: 0,
});
let snapshot = empty();
export interface PlayerController {
  toggle: () => Promise<void>;
  previous: () => Promise<void>;
  next: () => Promise<void>;
  seek: (seconds: number) => Promise<void>;
}
let controller: PlayerController | undefined;
const subscribers = new Set<(value: PlayerSnapshot) => void>();
function publish(value: PlayerSnapshot) {
  snapshot = value;
  for (const subscriber of subscribers) subscriber({ ...snapshot });
}
export function readPlayer(): PlayerSnapshot {
  return { ...snapshot };
}
export function subscribePlayer(listener: (value: PlayerSnapshot) => void) {
  subscribers.add(listener);
  listener(readPlayer());
  return () => {
    subscribers.delete(listener);
  };
}
export function attachPlayer(controls: PlayerController) {
  controller = controls;
  return {
    update(value: Omit<PlayerSnapshot, "connected">) {
      if (controller === controls) publish({ ...value, connected: true });
    },
    dispose() {
      if (controller === controls) {
        controller = undefined;
        publish(empty());
      }
    },
  };
}
export async function togglePlayer() {
  await controller?.toggle();
}

export async function previousPlayer() {
  await controller?.previous();
}
export async function nextPlayer() {
  await controller?.next();
}
export async function seekPlayer(seconds: number) {
  if (Number.isFinite(seconds))
    await controller?.seek(Math.max(0, Math.min(snapshot.duration, seconds)));
}
