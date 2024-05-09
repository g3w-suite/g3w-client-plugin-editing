const { Feature } = g3wsdk.core.layer.features;

/**
 * ORIGINAL SOURCE: g3w-client-plugin-editing/services/editingservice.js@v3.7.8
 * 
 * Create a new feature
 *
 * @param layerId
 * @param options.geometry.type
 * @param options.geometry.coordinates
 *
 * @returns { Feature }
 * 
 * @since g3w-client-plugin-editing@v3.8.0
 */
export function createFeature(layerId, options = {}) {
  const feature = new Feature();

  if (options.geometry) {
    feature.setGeometry(new ol.geom[options.geometry.type](options.geometry.coordinates));
  }

  feature.setProperties(options.properties);
  feature.setTemporaryId();

  const toolbox      = this.getToolBoxById(layerId);
  const editingLayer = toolbox.getLayer().getEditingLayer();
  const session      = toolbox.getSession();

  editingLayer.getSource().addFeature(feature);
  session.pushAdd(layerId, feature, false);

  return feature;
}