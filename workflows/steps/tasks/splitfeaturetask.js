const inherit = g3wsdk.core.utils.inherit;
const base =  g3wsdk.core.utils.base;
const { splitFeature, splitFeatures } = g3wsdk.core.geoutils;
const Feature = g3wsdk.core.layer.features.Feature;
const GUI = g3wsdk.gui.GUI;
const EditingTask = require('./editingtask');

function SplitFeatureTask(options={}){
  base(this, options);
}

inherit(SplitFeatureTask, EditingTask);

const proto = SplitFeatureTask.prototype;

proto.run = function(inputs, context) {
  const d = $.Deferred();
  const { layer, features } = inputs;
  const isPkEditable = layer.isPkEditable();
  const source = layer.getEditingLayer().getSource();
  const session = context.session;
  this._snapIteraction = new ol.interaction.Snap({
    source,
    edge: false
  });

  this._drawInteraction = new ol.interaction.Draw({
    type: 'LineString',
    features: new ol.Collection(),
  });

  this._drawInteraction.on('drawend', (evt) => {
    const splitfeature = evt.feature;
    let isSplitted = false;
    if (isPkEditable) {
      const splittedGeometries = splitFeature({
        splitfeature,
        feature: features[0]
      })
      if (splittedGeometries.length && splittedGeometries.length > 1) {
        isSplitted = true;
        if (splittedGeometries.length > 2) {
          GUI.showUserMessage({
            type: 'warning',
            message: 'Feature maggiori di due',
            autoclose: true
          })
          d.reject();
        } else {
          this._handleSplitFeature({
            feature: features[0],
            splittedGeometries,
            inputs,
            session
          });
        }
      }
    } else {
      const splittedGeometries = splitFeatures({
        splitfeature,
        features
      })
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
      })
    }
    if (isSplitted) d.resolve(inputs);
    else {
      GUI.showUserMessage({
        type: 'warning',
        message: 'La feature non è stata splittata',
        autoclose: true
      })
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
  const pk = layer.getPk();
  const layerId = layer.getId();
  const oriFeature = feature.clone();
  splittedGeometries.forEach((splittedGeometry, index) => {
    if (index === 0) {
      feature.setGeometry(splittedGeometry);
      session.pushUpdate(layerId, feature, oriFeature)
    } else {
      const newFeature = oriFeature.cloneNew();
      newFeature.setGeometry(splittedGeometry);
      const feature = new Feature({
        feature: newFeature,
        pk
      });
      feature.setTemporaryId();
      source.addFeature(feature);
      newFeatures.push(session.pushAdd(layerId, feature));
      inputs.features.push(feature)
    }
  })
  return newFeatures;
}

proto.stop = function(){
  this.removeInteraction(this._drawInteraction);
  this.removeInteraction(this._snapIteraction);
  this._drawInteraction = null;
  this._snapIteraction = null;
  return true;
};


module.exports = SplitFeatureTask;
