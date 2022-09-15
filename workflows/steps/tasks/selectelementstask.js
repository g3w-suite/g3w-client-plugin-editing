const { ApplicationState } = g3wsdk.core;
const { base, inherit } = g3wsdk.core.utils;
const {
  isSameBaseGeometryType,
  convertSingleMultiGeometry
} = g3wsdk.core.geoutils;
const { Feature } = g3wsdk.core.layer.features;
const { PickFeatureInteraction } = g3wsdk.ol.interactions;
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

proto.addSingleSelectInteraction = function({layer, inputs, promise, buttonnext=false}= {}){
  const singleInteraction = new PickFeatureInteraction({
    layers: [layer.getEditingLayer()]
  });
  singleInteraction.on('picked', e => {
    const feature = e.feature;
    if (feature) {
      const features = [feature];
      inputs.features = features;
      if (!buttonnext) {
        this._originalStyle = this.setFeaturesSelectedStyle(features);
        this._steps && this.setUserMessageStepDone('select');
        promise.resolve(inputs);
      } else this.addRemoveToMultipleSelectFeatures([feature], inputs);
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
proto.addExternalSelectInteraction = function({layer, inputs, promise, buttonnext=false}= {}){
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
      if (features.length) {
        const feature = features[0];
        const geometryType = feature.getGeometry().getType();
        sameBaseGeometry = isSameBaseGeometryType(geometryType, layerGeometryType)
      }
    }
    return sameBaseGeometry;
  });
  const singleInteraction = new PickFeatureInteraction({
    layers
  });
  singleInteraction.on('picked', evt => {
    if (evt.feature) {
      const attributes = layer.getEditingFields();
      const geometry = evt.feature.getGeometry();
      (geometry.getType() !== layerGeometryType) && evt.feature.setGeometry(convertSingleMultiGeometry(geometry, layerGeometryType));
      const feature = new Feature({
        feature: evt.feature,
        properties: attributes.filter(attribute => {
          //set media attribute to null
          if (attribute.input.type === 'media') evt.feature.set(attribute.name, null);
          return !attribute.pk
        }).map(property => property.name)
      });

      feature.setTemporaryId();
      source.addFeature(feature);
      session.pushAdd(layerId, feature, false);
      const features = [feature];
      inputs.features = features;
      promise.resolve(inputs);
    } else promise.reject();
  });
  this._selectInteractions.push(singleInteraction);
  this.addInteraction(singleInteraction);
};

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
  this._steps.select.buttonnext.disabled = this._steps.select.buttonnext.condition ? this._steps.select.buttonnext.condition({features:this.multipleselectfeatures}) : this.multipleselectfeatures.length === 0;
  if (this._steps.select.dynamic !== undefined) this._steps.select.dynamic = this.multipleselectfeatures.length;
};

/**
 * Multiple interaction for select features
 * @param layer
 * @param inputs
 * @param promise
 * @param buttonnext
 */
proto.addMultipleSelectInteraction = function({layer, inputs, promise, buttonnext=false}={}){
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
      if (!buttonnext){
        if (!features.length) promise.reject();
        else {
          inputs.features = features;
          this._originalStyle = this.setFeaturesSelectedStyle(features);
          this._steps && this.setUserMessageStepDone('select');
          setTimeout(()=>{
            promise.resolve(inputs);
          }, 500)
        }
      } else this.addRemoveToMultipleSelectFeatures(features, inputs);
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
      if (!buttonnext){
        if (!features.length) promise.reject();
        else {
          inputs.features = features;
          this._originalStyle = this.setFeaturesSelectedStyle(features);
          this._steps && this.setUserMessageStepDone('select');
          promise.resolve(inputs);
        }
      } else this.addRemoveToMultipleSelectFeatures(features, inputs)
    });
  }
  this._selectInteractions.push(selectInteractionMultiple);
  this.addInteraction(selectInteractionMultiple);
};

proto.run = function(inputs, context, queques) {
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
      this.addExternalSelectInteraction({layer, inputs, promise});
      break;
  }
  queques.micro.addTask(()=>{
   inputs.features.forEach((feature => feature.setStyle(this._originalStyle)));
  });
  return promise.promise();
};

proto.stop = function() {
  this._selectInteractions.forEach(interaction => this.removeInteraction(interaction));
  this._vectorLayer && this.getMap().removeLayer(this._vectorLayer);
  this._vectorLayer = null;
  this._originalStyle = null;
  this._selectInteractions = [];
  this.multipleselectfeatures = [];
};

module.exports = SelectElementsTask;
