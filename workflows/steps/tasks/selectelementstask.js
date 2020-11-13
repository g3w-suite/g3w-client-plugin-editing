const ApplicationState = g3wsdk.core.ApplicationState;
const inherit = g3wsdk.core.utils.inherit;
const base =  g3wsdk.core.utils.base;
const EditingTask = require('./editingtask');
const PickFeatureInteraction = g3wsdk.ol.interactions.PickFeatureInteraction;

function SelectElementsTask(options={}) {
  this._type = options.type || 'bbox'; // 'single' 'bbox' 'muliple'
  this._selectInteractions = [];
  this._originalStyle;
  this._vectorLayer;
  base(this, options);
}

inherit(SelectElementsTask, EditingTask);

const proto = SelectElementsTask.prototype;

proto.addSingleSelectInteraction = function({layer, inputs, promise}= {}){
  const singleInteraction = new PickFeatureInteraction({
    layers: [layer.getEditingLayer()]
  });
  singleInteraction.on('picked', (e) => {
    const feature = e.feature;
    const features = [feature];
    if (feature) {
      inputs.features = features;
      this._originalStyle = this.setFeaturesSelectedStyle(features);
      this.setUserMessageStepDone('select');
      promise.resolve(inputs);
    }
  });
  this._selectInteractions.push(singleInteraction);
  this.addInteraction(singleInteraction);
};

proto.addMultipleSelectInteraction = function({layer, inputs, promise}={}){
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
      if (!features.length) promise.reject();
      else {
        inputs.features = features;
        this._originalStyle = this.setFeaturesSelectedStyle(features);
        this.setUserMessageStepDone('select');
        setTimeout(()=>{
          promise.resolve(inputs);
        }, 500)
      }
    });
  }  else {
    selectInteractionMultiple = new ol.interaction.DragBox({
      condition: ol.events.condition.shiftKeyOnly
    });
    selectInteractionMultiple.on('boxend', () => {
      const bboxExtent = selectInteractionMultiple.getGeometry().getExtent();
      const layerSource = layer.getEditingLayer().getSource();
      const features = layerSource.getFeaturesInExtent(bboxExtent);
      if (!features.length) promise.reject();
      else {
        inputs.features = features;
        this._originalStyle = this.setFeaturesSelectedStyle(features);
        this.setUserMessageStepDone('select');
        promise.resolve(inputs);
      }
    });
  }
  this._selectInteractions.push(selectInteractionMultiple);
  this.addInteraction(selectInteractionMultiple);
  PIPPO = this._selectInteractions;
  MAP = this.getMapService().getMap()
};

proto.run = function(inputs, context, queques) {
  const layer = inputs.layer;
  const promise = $.Deferred();
  switch(this._type) {
    case 'single':
      this.addSingleSelectInteraction({layer, inputs, promise});
      break;
    case 'multiple':
      this.addSingleSelectInteraction({layer, inputs, promise});
      this.addMultipleSelectInteraction({layer, inputs, promise});
      break;
    case 'bbox':
      this.addMultipleSelectInteraction({layer, inputs, promise});
      break;
  }
  queques.micro.addTask(()=>{
   inputs.features.forEach((feature => feature.setStyle(this._originalStyle)));
  });
  return promise.promise();
};

proto.stop = function(inputs, context) {
  this._selectInteractions.forEach(interaction => {
    this.removeInteraction(interaction);
  });
  this._vectorLayer && this.getMap().removeLayer(this._vectorLayer);
  this._vectorLayer = null;
  this._originalStyle = null;
  this._selectInteractions = [];
};

module.exports = SelectElementsTask;
