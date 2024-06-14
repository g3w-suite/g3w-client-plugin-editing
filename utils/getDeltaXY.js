/**
 * ORIGINAL SOURCE: g3w-client-plugin-editing/workflows/steps/tasks/moveelementstask.js@v3.7.1
 * ORIGINAL SOURCE: g3w-client-plugin-editing/workflows/steps/movelementsstep.js@v3.7.1
 *
 * @param { Object } delta
 * @param delta.x
 * @param delta.y
 * @param delta.coordinates
 * 
 * @returns {{ x: number, y: number }}
 * 
 * @since g3w-client-plugin-editing@v3.8.0
 */
export function getDeltaXY({ x, y, coordinates } = {}) {
  const coords = _getCoordinates(coordinates);
  return {
    x: x - coords.x,
    y: y - coords.y
  }
}

function _getCoordinates(coords) {
  return Array.isArray(coords[0]) ? _getCoordinates(coords[0]) : {
    x: coords[0],
    y: coords[1]
  };
}