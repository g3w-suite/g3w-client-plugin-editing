const { Feature } = g3wsdk.core.layer.features;

/**
 * Create a new feature
 *
 * @param layerId
 * @param options.geometry.type
 * @param options.geometry.coordinates
 *
 * @returns { Feature }
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