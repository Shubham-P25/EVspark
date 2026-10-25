export interface PresenceOptions {
  enterM: number;
  exitM: number;
  dwellS: number;
}

export interface PresenceState {
  inside: boolean;
  counted: boolean;
  transitions: number;
}

export function createPresenceTracker(opts: PresenceOptions = { enterM: 80, exitM: 100, dwellS: 300 }) {
  let inside = false;
  let since = 0;
  let transitions = 0;

  return function update(distanceM: number, t: number): PresenceState {
    if (!inside && distanceM <= opts.enterM) {
      inside = true;
      since = t;
      transitions++;
    } else if (inside && distanceM > opts.exitM) {
      inside = false;
      transitions++;
    }
    return { inside, counted: inside && t - since >= opts.dwellS, transitions };
  };
}
