const { base, inherit } = g3wsdk.core.utils;
const { dissolve }      = g3wsdk.core.geoutils;
const EditingTask       = require('./editingtask');
const { GUI }           = g3wsdk.gui;

function MergeFeaturesTask(options={}){
  base(this, options);
}

inherit(MergeFeaturesTask, EditingTask);

const proto = MergeFeaturesTask.prototype;

proto.run = function(inputs, context) {
  const d = $.Deferred();
  const { layer, features } = inputs;
  const editingLayer = layer.getEditingLayer();
  const source = editingLayer.getSource();
  const layerId = layer.getId();
  const session = context.session;
  if (features.length < 2) {
    GUI.showUserMessage({
      type: 'warning',
      message: 'plugins.editing.messages.select_min_2_features',
      autoclose: true
    });
    d.reject();
  } else {
    this.chooseFeatureFromFeatures({
      features
    }).then(async (feature) => {
      const index = features.findIndex(_feature => feature === _feature);
      const originalFeature = feature.clone();
      const newFeature = dissolve({
        features,
        index,
      });
      if (newFeature) {
        try {
          await this.evaluateExpressionFields({
            inputs,
            context,
            feature: newFeature
          });
        } catch (err) {}
        session.pushUpdate(layerId, newFeature, originalFeature);
        features
          .filter(_feature => _feature !== feature)
          .forEach(deleteFeature => {
            session.pushDelete(layerId, deleteFeature);
            source.removeFeature(deleteFeature);
          });
        inputs.features = [feature];
        d.resolve(inputs);
      } else {
        GUI.showUserMessage({
          type: 'warning',
          message: 'plugins.editing.messages.no_feature_selected',
          autoclose: true
        });
        d.reject();
      }
    }).catch(() =>{
      d.reject();
    })
  }
  return d.promise();
};
proto.stop = function(){
  this.removeInteraction(this._pickInteraction);
};

module.exports = MergeFeaturesTask;
