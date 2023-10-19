/**
 * Util function to extract hole feature from polygon Geometry
 * 
 * @param geometry
 * @param id
 * @param index
 * 
 * @returns { Array } hole features
 * 
 * @since g3w-client-plugin-editing@3.7.0
 */
export function extractHoleFromPolygonGeometry({geometry, id, index}={}) {
  const holesFeatures   = [];
  const linearRingCount = geometry.getLinearRingCount();
  if ( linearRingCount > 1) {
    for (let i = 1; i < linearRingCount; i++) {
      holesFeatures.push(
        new ol.Feature({
          geometry: new ol.geom.Polygon([geometry.getLinearRing(i).getCoordinates()]),
          __id:     id,
          __index:  index
        })
      )
    }
  }
  return holesFeatures;
};