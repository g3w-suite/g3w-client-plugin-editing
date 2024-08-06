/**
 * @param feature
 * @param coordinates
 *
 * @returns { boolean }
 */
export function isPointOnVertex({
  feature,
  coordinates,
 }) {
  const geometry = feature.getGeometry();
  const type     = geometry.getType();
  const coords   = c => g3wsdk.core.geoutils.areCoordinatesEqual(coordinates, c); // whether element have same coordinates
 
  switch (type) {
    case 'Polygon':
    case 'MultiLineString':
      return _.flatMap(geometry.getCoordinates()).some(coords);
 
    case 'LineString':
    case 'MultiPoint':
      return geometry.getCoordinates().some(coords);
 
    case 'MultiPolygon':
      return geometry.getPolygons().some(poly => _.flatMap(poly.getCoordinates()).some(coords));
 
    case 'Point':
      return g3wsdk.core.geoutils.areCoordinatesEqual(coordinates, geometry.getCoordinates());
 
    default:
      return false;
  }
 }