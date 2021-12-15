const {base, inherit} = g3wsdk.core.utils;
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
    const feature = features.getArray()[0];
    const newFeature = feature.clone();
    session.pushUpdate(layerId, newFeature, originalFeature);
    const vertexLayerToolBox = this.getEditingService().getToolBoxById(this.getEditingService().getLayerVertexId());
    const featureVertex = vertexLayerToolBox.getEditingLayerSource().getFeatures().filter(vertexFeature => vertexFeature.get('feature_id') == feature.getId());
    featureVertex.forEach((feature, index) =>{
      const originalVertexFeature = feature.clone();
      feature.getGeometry().translate(deltaXY.x, deltaXY.y);
      session.pushUpdate(this.getEditingService().getLayerVertexId(), feature, originalVertexFeature)
    });
    startCoordinate = null;
    d.resolve(inputs);
  });

  return d.promise()
};

proto.stop = function() {
  this.removeInteraction(this._translateInteraction);
  this._translateInteraction = null;
};



module.exports = MoveFeatureTask;
