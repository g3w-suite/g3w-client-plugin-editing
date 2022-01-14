import SIGNALER_IIM_CONFIG from '../../../global_plugin_data';
const {base, inherit} = g3wsdk.core.utils;
const {isPointGeometryType} = g3wsdk.core.geometry.Geometry;
const EditingTask = require('./editingtask');

function MoveFeatureTask(options){
  this.drawInteraction = null;
  base(this, options);
}

inherit(MoveFeatureTask, EditingTask);

const proto = MoveFeatureTask.prototype;

/**
 * Run funcion of task
 * @param inputs
 * @param context
 * @returns {*}
 */
proto.run = function(inputs, context) {
  const d = $.Deferred();
  const {vertex_layer_id, geo_layer_id} = SIGNALER_IIM_CONFIG;
  const originalLayer = inputs.layer;
  const session = context.session;
  const layerId = originalLayer.getId();
  let startTranslationCoordinates;
  const features = new ol.Collection(inputs.features);
  let originalFeature = null;
  this._translateInteraction = new ol.interaction.Translate({
    features,
    hitTolerance: (isMobile && isMobile.any) ? 10 : 0
  });
  this.addInteraction(this._translateInteraction);

  this._translateInteraction.on('translatestart', ({coordinate, features}) => {
    startTranslationCoordinates = coordinate;
    const feature = features.getArray()[0];
    originalFeature = feature.clone();
  });

  this._translateInteraction.on('translateend', ({coordinate, startCoordinate, features}) => {
    const deltaXY = this.getDeltaXY({
      x: coordinate[0],
      y: coordinate[1],
      coordinates: startTranslationCoordinates
    });

    features.getArray().forEach(feature => {
      const newFeature = feature.clone();
      /**
       * Check if no Point geometry
       */
      if (vertex_layer_id) {
        session.pushUpdate(layerId, newFeature, originalFeature);
        const vertexLayerToolBox = this.getEditingService().getToolBoxById(vertex_layer_id);
        const featureVertex = vertexLayerToolBox.getEditingLayerSource().getFeatures().filter(vertexFeature => vertexFeature.get('feature_id') == feature.getId());
        featureVertex.forEach((feature, index) =>{
          const originalVertexFeature = feature.clone();
          feature.getGeometry().translate(deltaXY.x, deltaXY.y);
          session.pushUpdate(vertex_layer_id, feature, originalVertexFeature)
        });
      }
      startCoordinate = null;
    })
    d.resolve(inputs);
  });

  return d.promise()
};

proto.stop = function() {
  this.removeInteraction(this._translateInteraction);
  this._translateInteraction = null;
};



module.exports = MoveFeatureTask;
