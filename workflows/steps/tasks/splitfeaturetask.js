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
  return new Promise((resolve, reject) => {
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

    this._drawInteraction.on('drawend', async evt => {
      const splitfeature = evt.feature;
      let isSplitted = false;
      const splittedGeometries = splitFeatures({
        splitfeature,
        features
      });
      const splittedGeometriesLength = splittedGeometries.length;
      for (let i=0; i < splittedGeometriesLength; i++) {
        const {uid, geometries} = splittedGeometries[i];
        if (geometries.length > 1) {
          isSplitted = true;
          const feature = features.find(feature => feature.getUid() === uid);
          await this._handleSplitFeature({
            feature,
            splittedGeometries: geometries,
            inputs,
            session
          });
        }
      }

      if (isSplitted) {
        GUI.showUserMessage({
          type: 'success',
          message: 'plugins.editing.messages.splitted',
          autoclose: true
        });

        resolve(inputs);

      } else {
        GUI.showUserMessage({
          type: 'warning',
          message: 'plugins.editing.messages.nosplittedfeature',
          autoclose: true
        });
        reject();
      }
    });
    this.addInteraction(this._drawInteraction);
    this.addInteraction(this._snapIteraction);
  })
};

proto._handleSplitFeature = async function({feature, inputs, session, splittedGeometries=[]}={}){
  const newFeatures = [];
  const {layer} = inputs;
  const source = layer.getEditingLayer().getSource();
  const layerId = layer.getId();
  const oriFeature = feature.clone();
  inputs.features = splittedGeometries.length ? [] : inputs.features;
  const splittedGeometriesLength = splittedGeometries.length;
  for (let index=0; index < splittedGeometriesLength; index++) {
    const splittedGeometry = splittedGeometries[index];
    if (index === 0) {
      /**
       * check geometry evaluated expression
       */
      feature.setGeometry(splittedGeometry);
      try {
        await this.evaluateGeometryExpressionField({
          inputs,
          context,
          feature
        });
      } catch(err){}

      session.pushUpdate(layerId, feature, oriFeature);

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
      /**
       * * evaluate geometry expression
      */
      try {
        await this.evaluateGeometryExpressionField({
          inputs,
          context,
          feature
        });
      } catch(err){}

      /**
       * @todo improve client core to handle this situation on sesssion.pushAdd not copy pk field not editable only
       */
      const noteditablefieldsvalues = this.getNotEditableFieldsNoPkValues({
        layer,
        feature
      });

      if (Object.entries(noteditablefieldsvalues).length) {
        session.pushAdd(layerId, feature);
        const _feature = feature.clone();
        Object.entries(noteditablefieldsvalues).forEach(([field, value]) => _feature.set(field, value));
        session.pushUpdate(layerId, _feature, feature);
        newFeatures.push(_feature);
      } else newFeatures.push(session.pushAdd(layerId, feature));

    }
    inputs.features.push(feature);
  }

  return newFeatures;
};

proto.stop = function(){
  this.removeInteraction(this._drawInteraction);
  this.removeInteraction(this._snapIteraction);
  this._drawInteraction = null;
  this._snapIteraction = null;
};

module.exports = SplitFeatureTask;
