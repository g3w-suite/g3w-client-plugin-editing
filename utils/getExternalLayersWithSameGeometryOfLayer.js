const { isSameBaseGeometryType }      = g3wsdk.core.geoutils;
const { GUI }                         = g3wsdk.gui;

/**
 * ORIGINAL SOURCE: g3w-client-plugin-editing/services/editingservice.js@v3.7.8
 * 
 * @since g3w-client-plugin-editing@v3.8.0
 */
export function getExternalLayersWithSameGeometryOfLayer(layer) {
  const geometryType = layer.getGeometryType();
  return GUI.getService('map')
    .getExternalLayers()
    .filter(externalLayer => {
      const features = externalLayer.getSource().getFeatures();
      // skip when ..
      if (!(features && features.length > 0) || (features && features[0] && !features[0].getGeometry())) {
        return false;
      }
      const type = features[0].getGeometry().getType();
      return geometryType === type || isSameBaseGeometryType(geometryType, type);
    });
}