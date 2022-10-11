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
  this.changeKey = null; //
  let isGeometryChange = false; // changed if geometry is changed

  this.setAndUnsetSelectedFeaturesStyle({
    promise: d,
  });

  this._translateInteraction = new ol.interaction.Translate({
    features,
    hitTolerance: (isMobile && isMobile.any) ? 10 : 0
  });
  this.addInteraction(this._translateInteraction);

  this._translateInteraction.on('translatestart', evt => {
    const feature = evt.features.getArray()[0];
    this.changeKey = feature.once('change', () => isGeometryChange = true);
    originalFeature = feature.clone();
  });

  this._translateInteraction.on('translateend', evt => {
    ol.Observable.unByKey(this.changeKey);
    const feature = evt.features.getArray()[0];
    if (isGeometryChange) {
      const newFeature = feature.clone();
      /**
       * evaluated geometry expression
       */
      this.evaluateGeometryExpressionField({
        inputs,
        feature: newFeature
      }).finally(() => {
        session.pushUpdate(layerId, newFeature, originalFeature);
        d.resolve(inputs);
      });
      /**
       * end of evaluated
       */
      session.pushUpdate(layerId, newFeature, originalFeature);
      d.resolve(inputs);
    } else d.resolve(inputs);
  });

  return d.promise()
};

proto.stop = function() {
  this.removeInteraction(this._translateInteraction);
  this._translateInteraction = null;
  this.changeKey = null;
};

module.exports = MoveFeatureTask;
