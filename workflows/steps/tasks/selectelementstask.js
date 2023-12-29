import { PickFeaturesInteraction } from '../../../interactions/pickfeaturesinteraction';

const { ApplicationState } = g3wsdk.core;
const { base, inherit } = g3wsdk.core.utils;
const {
  isSameBaseGeometryType,
  convertSingleMultiGeometry,
  Geometry: {
    removeZValueToOLFeatureGeometry
  }
} = g3wsdk.core.geoutils;

const { Feature } = g3wsdk.core.layer.features;

const EditingTask = require('./editingtask');

function SelectElementsTask(options={}) {
  this._type = options.type || 'bbox'; // 'single' 'bbox' 'multiple'
  this._selectInteractions = [];
  this.multipleselectfeatures = [];
  this._originalStyle;
  this._vectorLayer;
  base(this, options);
}

inherit(SelectElementsTask, EditingTask);

const proto = SelectElementsTask.prototype;

/**
 *
 * @param layer
 * @param inputs
 * @param promise
 * @param buttonnext
 */
proto.addSingleSelectInteraction = function({
  layer,
  inputs,
  promise,
  buttonnext=false
}= {}){

  const singleInteraction = new PickFeaturesInteraction({
    layer: layer.getEditingLayer()
  });

  singleInteraction.on('picked', async ({features}) => {
    let feature;
    if (features.length > 1) {
      try {
        feature = await this.chooseFeatureFromFeatures({
          promise,
          features
        });
      } catch(err) {}
    } else {
       feature = features[0];
    }
    if (feature) {
      const features = [feature];
      inputs.features = features;
      if (!buttonnext) {
        this._originalStyle = this.setFeaturesSelectedStyle(features);
        this._steps && this.setUserMessageStepDone('select');
        promise.resolve(inputs);
      } else {
        this.addRemoveToMultipleSelectFeatures([feature], inputs);
      }
    }
  });
  this._selectInteractions.push(singleInteraction);
  this.addInteraction(singleInteraction);
};

/**
 * Pick to add feature from external layer added to map
 * @param layer
 * @param inputs
 * @param promise
 * @param buttonnext
 */
proto.addExternalSelectInteraction = function({layer, inputs, context, promise, buttonnext=false}= {}){
  const layerGeometryType = layer.getGeometryType();
  const layerId = layer.getId();
  const source = layer.getEditingLayer().getSource();
  const {session} = this.getContext();
  // filter external layer only vector - Exclude WMS
  const layers = this.getMapService().getExternalLayers().filter(externaLayer => {
    let sameBaseGeometry = true;
    const type = externaLayer.getType();
    if (type === 'VECTOR') {
      const features = externaLayer.getSource().getFeatures();
      if (features.length > 0) {
        const feature = features[0];
        const geometryType = feature.getGeometry().getType();
        sameBaseGeometry = isSameBaseGeometryType(geometryType, layerGeometryType)
      }
    }
    return sameBaseGeometry;
  });
  const singleInteraction = new PickFeaturesInteraction({
    layers
  });
  singleInteraction.on('picked', evt => {
    if (evt.features.length > 0) {
      const attributes = layer.getEditingFields();
      const geometry = evt.features[0].getGeometry();
      if (geometry.getType() !== layerGeometryType) {
        evt.feature.setGeometry(convertSingleMultiGeometry(geometry, layerGeometryType));
      }
      const feature = new Feature({
        feature: evt.feature,
        properties: attributes.map(attribute => {
          //set media attribute to null or attribute belong to layer but not present o feature copied
          if (
            attribute.input.type === 'media' ||
            "undefined" === typeof evt.feature.get(attribute.name) ||
            attribute.pk
          ) {
            evt.feature.set(attribute.name, null);
          }
          return attribute.name
        })
      });

      // evaluate Geometry Expression
      this.evaluateExpressionFields({
        inputs,
        context,
        feature
      })
        .finally(() => {
          //remove eventually Z Values
          removeZValueToOLFeatureGeometry({
            feature
          });

          feature.setTemporaryId();
          source.addFeature(feature);
          session.pushAdd(layerId, feature, false);
          inputs.features.push(feature);
          promise.resolve(inputs);
        })

    } else {
      promise.reject();
    }
  });
  this._selectInteractions.push(singleInteraction);
  this.addInteraction(singleInteraction);
};

/**
 *
 * @param features
 * @param inputs
 */
proto.addRemoveToMultipleSelectFeatures = function(features=[], inputs){
  features.forEach(feature =>{
    const selIndex = this.multipleselectfeatures.indexOf(feature);
    if (selIndex < 0) {
      this._originalStyle = this.setFeaturesSelectedStyle([feature]);
      this.multipleselectfeatures.push(feature);
    } else {
      this.multipleselectfeatures.splice(selIndex, 1);
      feature.setStyle(this._originalStyle);
    }
    inputs.features = this.multipleselectfeatures;
  });

  this._steps.select.buttonnext.disabled = this._steps.select.buttonnext.condition ?
    this._steps.select.buttonnext.condition({features:this.multipleselectfeatures}) :
    this.multipleselectfeatures.length === 0;

  if (this._steps.select.dynamic !== undefined) {
    this._steps.select.dynamic = this.multipleselectfeatures.length;
  }
};

/**
 * Multiple interaction for select features
 * @param layer
 * @param inputs
 * @param promise
 * @param buttonnext
 */
proto.addMultipleSelectInteraction = function({
  layer,
  inputs,
  promise,
  buttonnext=false
}={}) {

  let selectInteractionMultiple;
  if (ApplicationState.ismobile) {
    const geometryFunction = ol.interaction.Draw.createBox();
    const source = new ol.source.Vector({});
    this._vectorLayer = new ol.layer.Vector({
      source
    });
    
    this.getMap().addLayer(this._vectorLayer);

    selectInteractionMultiple = new ol.interaction.Draw({
      type: 'Circle',
      source,
      geometryFunction
    });

    selectInteractionMultiple.on('drawend', evt => {
      const feature = evt.feature;
      const bboxExtent = feature.getGeometry().getExtent();
      const layerSource = layer.getEditingLayer().getSource();
      const features = layerSource.getFeaturesInExtent(bboxExtent);
      if (buttonnext) {
        this.addRemoveToMultipleSelectFeatures(features, inputs);
      } else {
        if (features.length > 0) {
          inputs.features = features;
          this._originalStyle = this.setFeaturesSelectedStyle(features);
          this._steps && this.setUserMessageStepDone('select');
          setTimeout(()=>{
            promise.resolve(inputs);
          }, 500)
        } else {
          promise.reject();
        }
      }
    });
  }  else {
    selectInteractionMultiple = new ol.interaction.DragBox({
      condition: ol.events.condition.shiftKeyOnly
    });

    selectInteractionMultiple.on('boxend', evt => {
      const features = [];
      const extent = selectInteractionMultiple.getGeometry().getExtent();
      const layerSource = layer.getEditingLayer().getSource();

      layerSource.forEachFeatureIntersectingExtent(extent, feature => {
        features.push(feature)
      });

      if (buttonnext) {
        this.addRemoveToMultipleSelectFeatures(features, inputs);
      } else {
        if (features.length > 0) {
          inputs.features = features;
          this._originalStyle = this.setFeaturesSelectedStyle(features);
          if (this._steps) {
            this.setUserMessageStepDone('select');
          }
          promise.resolve(inputs);
        } else {
          promise.reject();
        }
      }
    });
  }
  this._selectInteractions.push(selectInteractionMultiple);

  this.addInteraction(selectInteractionMultiple);
};

/**
 *
 * @param inputs
 * @param context
 * @returns {*}
 */
proto.run = function(inputs, context, ) {
  const layer = inputs.layer;
  const promise = $.Deferred();
  switch(this._type) {
    case 'single':
      this.addSingleSelectInteraction({layer, inputs, promise});
      break;
    case 'multiple':
      const buttonnext = !!this._steps.select.buttonnext;
      if (buttonnext) this._steps.select.buttonnext.done = () =>{promise.resolve(inputs)};
      this.addSingleSelectInteraction({layer, inputs, promise, buttonnext});
      this.addMultipleSelectInteraction({layer, inputs, promise, buttonnext});
      break;
    case 'bbox':
      this.addMultipleSelectInteraction({layer, inputs, promise});
      break;
    case 'external':
      this.addExternalSelectInteraction({layer, inputs, context, promise});
      break;
  }

  return promise.promise();
};

proto.stop = function() {
  this._selectInteractions.forEach(interaction => this.removeInteraction(interaction));
  if (this._vectorLayer) {
    this.getMap().removeLayer(this._vectorLayer);
  }
  //need to reset selected
  this.getInputs()
    .features
    .forEach((feature => feature.setStyle(this._originalStyle)));

  this._originalStyle = null;

  this._vectorLayer = null;
  this._selectInteractions = [];
  this.multipleselectfeatures = [];
};

module.exports = SelectElementsTask;
