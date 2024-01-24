import { cloneFeature } from '../../../utils/cloneFeature'

const { base, inherit }  = g3wsdk.core.utils;
const { splitFeatures } = g3wsdk.core.geoutils;
const { Feature } = g3wsdk.core.layer.features;
const { GUI } = g3wsdk.gui;
const EditingTask = require('./editingtask');

function SplitFeatureTask(options={}){
  base(this, options);
  this._stopPromise; /** @since g3w-client-plugin-editing@v3.8.0 */
}

inherit(SplitFeatureTask, EditingTask);

const proto = SplitFeatureTask.prototype;

proto.run = function(inputs, context) {
  this._stopPromise = $.Deferred();
  /** @since g3w-client-plugin-editing@v3.8.0 */
  this.setAndUnsetSelectedFeaturesStyle({ promise: this._stopPromise });
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
          context,
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

      d.resolve(inputs);

    } else {
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

proto._handleSplitFeature = async function({feature, inputs, context, splittedGeometries=[]}={}){
  const newFeatures = [];
  const {layer} = inputs;
  const session = context.session;
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
        await this.evaluateExpressionFields({
          inputs,
          context,
          feature
        });
      } catch(err){}

      session.pushUpdate(layerId, feature, oriFeature);

    } else {
      const newFeature = cloneFeature(oriFeature, layer);
      newFeature.setGeometry(splittedGeometry);

      this.setNullMediaFields({
        layer,
        feature: newFeature
      });

      feature = new Feature({
        feature: newFeature
      });

      feature.setTemporaryId();

      /**
       * * evaluate geometry expression
      */
      try {
        await this.evaluateExpressionFields({
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
        const newFeature = session.pushAdd(layerId, feature);
        Object.entries(noteditablefieldsvalues).forEach(([field, value]) => newFeature.set(field, value));
        newFeatures.push(newFeature);
        //need to add features with no editable fields on layers source
        source.addFeature(newFeature);
      } else {
        newFeatures.push(session.pushAdd(layerId, feature));
        //add feature to source
        source.addFeature(feature);
      }

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
  this._stopPromise.resolve(true); /** @since g3w-client-plugin-editing@v3.8.0 */
};

module.exports = SplitFeatureTask;
