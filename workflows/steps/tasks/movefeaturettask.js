const {base, inherit} = g3wsdk.core.utils;
const EditingTask = require('./editingtask');

function MoveFeatureTask(options){
  this.drawInteraction = null;
  this.promise; // need to be set here in case of picked features
  base(this, options);
}

inherit(MoveFeatureTask, EditingTask);

const proto = MoveFeatureTask.prototype;

proto.run = function(inputs, context) {
  this.promise = new Promise((resolve, reject) => {
    const originalLayer = inputs.layer;
    const session = context.session;
    const layerId = originalLayer.getId();
    const features = new ol.Collection(inputs.features);
    let originalFeature = null;
    this.changeKey = null; //
    let isGeometryChange = false; // changed if geometry is changed

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
        /**
         * evaluated geometry expression
         */
        this.evaluateGeometryExpressionField({
          inputs,
          context,
          feature
        }).finally(() => {
          const newFeature = feature.clone();
          session.pushUpdate(layerId, newFeature, originalFeature);
          resolve(inputs);
        });
      } else resolve(inputs);
    });
  });

  this.setAndUnsetSelectedFeaturesStyle({
    promise: this.promise,
  });
  
  return this.promise;
};

proto.stop = function() {
  this.removeInteraction(this._translateInteraction);
  this._translateInteraction = null;
  this.changeKey = null;
};

module.exports = MoveFeatureTask;
