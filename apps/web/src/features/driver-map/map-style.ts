export const LIGHT_MAP_STYLE: google.maps.MapTypeStyle[] = [
  { elementType: 'geometry', stylers: [{ color: '#eceae4' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#5b616b' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#f7f6f2' }] },
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ visibility: 'on' }, { color: '#dfe7d6' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#ffffff' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#e1dfd8' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#fbe3c8' }] },
  { featureType: 'road.highway', elementType: 'geometry.stroke', stylers: [{ color: '#efc9a0' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#cfe3ee' }] },
  { featureType: 'administrative', elementType: 'geometry.stroke', stylers: [{ color: '#d6d3ca' }] },
];

