const { base, inherit }  = g3wsdk.core.utils;
const { splitFeatures } = g3wsdk.core.geoutils;
const { Feature } = g3wsdk.core.layer.features;
const { GUI } = g3wsdk.gui;
const EditingTask = require('./editingtask');

function SplitFeatureTask(options={}){
  base(this, options);
}

inherit(SplitFeatureTask, EditingTask);

const proto = SplitFeatureTask.prototype;

proto.run = function(inputs, context) {
  const d = $.Deferred();
  const { layer, features } = inputs;
  const source = layer.getEditingLayer().getSource();
  const session = context.session;
  this._snapIteraction = new ol.interaction.Snap({
    source,
    edge: true
  });

  this._drawInteraction = new ol.interaction.Draw({
    type: 'LineString',
    features: new ol.Collection(),
    freehandCondition: ol.events.condition.never
  });

  this._drawInteraction.on('drawend', evt => {
    const splitfeature = evt.feature;
    let isSplitted = false;
    const splittedGeometries = splitFeatures({
      splitfeature,
      features
    });
    splittedGeometries.forEach(({uid, geometries}) => {
      if (geometries.length > 1) {
        isSplitted = true;
        const feature = features.find(feature => feature.getUid() === uid);
        this._handleSplitFeature({
          feature,
          splittedGeometries: geometries,
          inputs,
          session
        });
      }
    });
    if (isSplitted) d.resolve(inputs);
    else {
      GUI.showUserMessage({
        type: 'warning',
        message: 'plugins.editing.messages.nosplittedfeature',
        autoclose: true
      });
      d.reject();
    }
  });
  this.addInteraction(this._drawInteraction);
  this.addInteraction(this._snapIteraction);
  return d.promise();
};

proto._handleSplitFeature = function({feature, inputs, session, splittedGeometries=[]}={}){
  const newFeatures = [];
  const {layer} = inputs;
  const source = layer.getEditingLayer().getSource();
  const layerId = layer.getId();
  const oriFeature = feature.clone();
  inputs.features = splittedGeometries.length ? [] : inputs.features;
  splittedGeometries.forEach((splittedGeometry, index) => {
    if (index === 0) {
      feature.setGeometry(splittedGeometry);
      session.pushUpdate(layerId, feature, oriFeature)
    } else {
      const newFeature = oriFeature.cloneNew();
      newFeature.setGeometry(splittedGeometry);
      this.setNullMediaFields({
        layer,
        feature: newFeature
      });

      feature = new Feature({
        feature: newFeature
      });
      feature.setTemporaryId();
      source.addFeature(feature);
      newFeatures.push(session.pushAdd(layerId, feature));
    }
    inputs.features.push(feature);
  });
  GUI.showUserMessage({
    type: 'success',
    message: 'plugins.editing.messages.splitted',
    autoclose: true
  });
  return newFeatures;
};

proto.stop = function(){
  this.removeInteraction(this._drawInteraction);
  this.removeInteraction(this._snapIteraction);
  this._drawInteraction = null;
  this._snapIteraction = null;
};

module.exports = SplitFeatureTask;
