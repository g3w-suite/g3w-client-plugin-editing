const inherit = g3wsdk.core.utils.inherit;
const base =  g3wsdk.core.utils.base;
const createSelectedStyle = g3wsdk.core.geoutils.createSelectedStyle;
const GUI = g3wsdk.gui.GUI;
const Task = g3wsdk.core.workflow.Task;

function EditingTask(options = {}) {
  base(this, options);
  this._editingServive;
  this._mapService = GUI.getComponent('map').getService();
  this.addInteraction = function(interaction) {
    this._mapService.addInteraction(interaction);
  };
  this.removeInteraction = function(interaction) {
    //needed to avoid a issue on openlayer
    setTimeout(()=> this._mapService.removeInteraction(interaction))
  };
}

inherit(EditingTask, Task);

const proto = EditingTask.prototype;

//get editing type from editing config
proto.getEditingType = function(){
  return this.getEditingService().getConfig().editingtype;
};

proto.registerPointerMoveCursor = function(){
  this._mapService.getMap().on("pointermove", this._pointerMoveCursor)
};

proto.unregisterPointerMoveCursor = function(){
  this._mapService.getMap().un("pointermove", this._pointerMoveCursor)
};

proto._pointerMoveCursor = function(evt) {
  const hit = this.forEachFeatureAtPixel(evt.pixel, () => true);
  if (hit) this.getTargetElement().style.cursor = 'pointer';
  else this.getTargetElement().style.cursor = '';
};

proto.setSteps = function(steps={}){
  this._steps = steps;
  this.setUserMessageSteps(steps);
};

proto.getSteps = function(){
  return this._steps;
};

proto.getMapService = function(){
  return this._mapService;
};

proto.getMap = function() {
  return this._mapService.getMap();
};

proto.setFeaturesSelectedStyle = function(features=[]) {
  if (features.length) {
    const {originalStyle, selectedStyle} = this.getSelectedStyle(features[0]);
    features.forEach(feature => feature.setStyle(selectedStyle));
    return originalStyle;
  }
};

proto.getSelectedStyle = function(feature){
  const geometryType = feature.getGeometry().getType();
  const originalStyle = feature.getStyle();
  const selectedStyle = createSelectedStyle({
    geometryType
  });
  return {
    originalStyle,
    selectedStyle
  }
};

proto.disableSidebar = function(bool=true) {
  !this._isContentChild && GUI.disableSideBar(bool);
};

proto.getEditingService = function() {
  this._editingServive = this._editingServive || require('../../../services/editingservice');
  return this._editingServive;
};

proto.fireEvent = function(event, options={}) {
  return this.getEditingService().fireEvent(event, options);
};

proto.setNullMediaFields = function({layer, feature}={}) {
  const mediaFields = layer.getEditingMediaFields({});
  mediaFields.forEach(field => {
    feature.set(field, null);
  })

};

proto.run = function(inputs, context) {};

proto.stop = function() {};

module.exports = EditingTask;
