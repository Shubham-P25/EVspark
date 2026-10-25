import { distToSegment, toLocal } from './geo-local';
import type { LatLng } from './types';

export function distToSegmentLatLng(p: LatLng, a: LatLng, b: LatLng): number {
  return distToSegment(toLocal(a, p), toLocal(a, a), toLocal(a, b));
}
