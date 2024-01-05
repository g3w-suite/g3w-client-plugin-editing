import { convertFeaturesGeometryToGeometryTypeOfLayer } from './convertFeaturesGeometryToGeometryTypeOfLayer';

/**
 * ORIGINAL SOURCE: g3w-client-plugin-editing/workflows/tasks/editingtask.js@3.7.1
 * 
 * @param layerId
 * @param geometryType
 *
 * @returns { Array }
 */
export function getFeaturesFromSelectionFeatures({
  layerId,
  geometryType,
}) {
  return convertFeaturesGeometryToGeometryTypeOfLayer({
    geometryType,
    features: g3wsdk.gui.GUI.getService('map').defaultsLayers.selectionLayer.getSource().getFeatures().filter(feature => feature.__layerId !== layerId),
  })
};