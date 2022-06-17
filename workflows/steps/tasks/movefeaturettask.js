const {base, inherit} = g3wsdk.core.utils;
const EditingTask = require('./editingtask');

function MoveFeatureTask(options){
  this.drawInteraction = null;
  base(this, options);
}

inherit(MoveFeatureTask, EditingTask);

const proto = MoveFeatureTask.prototype;

proto.run = function(inputs, context) {
  const d = $.Deferred();
  const originalLayer = inputs.layer;
  const session = context.session;
  const layerId = originalLayer.getId();
  const features = new ol.Collection(inputs.features);
  let originalFeature = null;
  this._translateInteraction = new ol.interaction.Translate({
    features,
    hitTolerance: (isMobile && isMobile.any) ? 10 : 0
  });
  this.addInteraction(this._translateInteraction);

  this._translateInteraction.on('translatestart',function(e){
    const feature = e.features.getArray()[0];
    originalFeature = feature.clone();
  });

  this._translateInteraction.on('translateend',function(e) {
    const feature = e.features.getArray()[0];
    const newFeature = feature.clone();
    session.pushUpdate(layerId, newFeature, originalFeature);
    d.resolve(inputs);
  });

  return d.promise()
};

proto.stop = function() {
  this.removeInteraction(this._translateInteraction);
  this._translateInteraction = null;
};



module.exports = MoveFeatureTask;
