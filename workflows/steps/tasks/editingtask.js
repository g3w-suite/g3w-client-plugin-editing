const {base, inherit} = g3wsdk.core.utils;
const {areCoordinatesEqual, createSelectedStyle} = g3wsdk.core.geoutils;
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
  return null;
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

proto.areCoordinatesEqual = function({feature, coordinates}){
  const featureGeometry = feature.getGeometry();
  const geometryType = featureGeometry.getType();
  switch (geometryType){
    case 'MultiLineString':
      return !!_.flatMap(featureGeometry.getCoordinates()).find( f_coordinates=> areCoordinatesEqual(coordinates, f_coordinates));
      break;
    case 'LineString':
      return !!featureGeometry.getCoordinates().find(f_coordinates => areCoordinatesEqual(coordinates, f_coordinates));
      break;
    case 'Polygon':
      return !!_.flatMap(featureGeometry.getCoordinates()).find(f_coordinates => areCoordinatesEqual(coordinates, f_coordinates));
      break;
    case 'MultiPolygon':
      return !!featureGeometry.getPolygons().find(polygon =>{
        return !!_.flatMap(polygon.getCoordinates()).find(f_coordinates => areCoordinatesEqual(coordinates, f_coordinates));
      });
      break;
    case 'Point':
      return areCoordinatesEqual(coordinates, featureGeometry.getCoordinates());
      break;
    case 'MultiPoint':
      return !!featureGeometry.getCoordinates().find(f_coordinates => areCoordinatesEqual(coordinates, f_coordinates));
      break;
    }
  return false;
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

proto.getPointFeaturesfromGeometryVertex = function(geometry){
  return this.getEditingService().getPointFeaturesfromGeometryVertex(geometry);
};

proto.getDeltaXY = function({x, y, coordinates} = {}){
  const getCoordinates = (coordinates)=> {
    if (Array.isArray(coordinates[0])){
      return getCoordinates(coordinates[0])
    } else return {
      x: coordinates[0],
      y: coordinates[1]
    };
  };
  const xy = getCoordinates(coordinates);
  return {
    x: x - xy.x,
    y: y - xy.y
  }
};

module.exports = EditingTask;
