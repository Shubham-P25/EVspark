export interface MapAdapter {
  toPx(lat: number, lng: number): { x: number; y: number } | null; // container pixels
  zoom(): number;
  container(): HTMLElement;
  center(): { lat: number; lng: number };
}

export function googleAdapter(map: google.maps.Map): MapAdapter & { dispose(): void } {
  class Helper extends google.maps.OverlayView {
    onAdd() {}
    draw() {}
    onRemove() {}
  }
  const helper = new Helper();
  helper.setMap(map);

  return {
    toPx: (lat, lng) => {
      const proj = helper.getProjection();
      if (!proj) return null;
      const p = proj.fromLatLngToContainerPixel(new google.maps.LatLng(lat, lng));
      return p ? { x: p.x, y: p.y } : null;
    },
    zoom: () => map.getZoom() ?? 15,
    container: () => map.getDiv(),
    center: () => {
      const c = map.getCenter();
      if (!c) return { lat: 19.2, lng: 72.9 };
      return { lat: c.lat(), lng: c.lng() };
    },
    dispose: () => {
      helper.setMap(null);
    },
  };
}
