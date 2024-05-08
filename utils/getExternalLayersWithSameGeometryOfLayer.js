const { isSameBaseGeometryType }      = g3wsdk.core.geoutils;
const { GUI }                         = g3wsdk.gui;

/**
 *  return (geometryType === featureGeometryType)
 *  || Geometry.isMultiGeometry(geometryType)
 *  || !Geometry.isMultiGeometry(featureGeometryType);
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