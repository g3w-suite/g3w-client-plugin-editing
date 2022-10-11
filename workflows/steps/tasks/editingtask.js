const { base, inherit } = g3wsdk.core.utils;
const { createSelectedStyle, areCoordinatesEqual, convertFeatureToGEOJSON} = g3wsdk.core.geoutils;
const { Layer } = g3wsdk.core.layer;
const { GUI } = g3wsdk.gui;
const { Task } = g3wsdk.core.workflow;
const { DataRouterService } = g3wsdk.core.data;
/**
 * List of placeholder in default_expression expression to call server for getting value of input
 * @type {string[]}
 */
const GEOMETRY_DEFAULT_EXPRESSION_PLACEHOLDERS = ["$area", "$perimeter", "$length", "$x", "$y", "$geometry"];

function EditingTask(options = {}) {
  base(this, options);
  this._editingServive;
  this._mapService = GUI.getService('map');
  this.addInteraction = function(interaction) {
    this._mapService.addInteraction(interaction);
  };
  this.removeInteraction = function(interaction) {
    //needed to avoid a issue on openlayer
    setTimeout(() => this._mapService.removeInteraction(interaction))
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

proto.setAndUnsetSelectedFeaturesStyle = function({promise}={}){
  /*
  Temporary needed to fix issue on pending promise
   */
  const {layer, features} = this.getInputs();
  setTimeout(()=>{
    if (layer.getType() === Layer.LayerTypes.VECTOR){
      const originalStyle = this.setFeaturesSelectedStyle(features);
      promise.always(() => {
        features.forEach((feature => feature.setStyle(originalStyle)))
      })
    }
  })
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
  mediaFields.forEach(field => feature.set(field, null))
};

proto.run = function(inputs, context) {};

proto.stop = function() {};

/**
 * Function that handle single task 
 */
proto.saveSingle = function(input, context){
  context.session.save()
    .then(() => this.getEditingService().saveChange());
};

/**
 * Function cancel single
 * @param input
 * @param context
 */
proto.cancelSingle = function(input, context){
  context.session.rollback();
};

/**
 * get form fields
 */

proto.getFormFields = function({inputs, context, feature}={}){
  const layer = inputs.layer;
  const {excludeFields:exclude, get_default_value=false} = context;
  return layer.getFieldsWithValues(feature, {
    exclude,
    get_default_value
  });
};

/**
 * Evaluated Expression checking inp
 */

proto.evaluateGeometryExpressionField = function({inputs, feature}={}){
  const expression_eval_promises = []; // promises from expression evaluation
  const form_data = convertFeatureToGEOJSON(feature);
  const { layer } = inputs;
  layer.getEditingFields().forEach(field => {
    const {default_expression} = field.input.options;
    if (default_expression){
      let evaluate = false;
      const {expression, apply_on_update = false} = default_expression;
      /*
      check if always update apply_on_update = true or only is is a new feature
       */
      if (apply_on_update || feature.isNew()) evaluate = GEOMETRY_DEFAULT_EXPRESSION_PLACEHOLDERS.find(placeholder => expression.indexOf(placeholder) !== -1);
      if (evaluate){
        const layer_id = inputs.layer.getId();
        const expression_eval_promise = new Promise((resolve, reject) => {
          DataRouterService.getData('expression:expression_eval', {
            inputs: {
              layer_id, // layer id owner of the data
              qgs_layer_id: layer_id , //
              form_data,
              formatter: 0,
              expression: default_expression.expression
            },
            outputs: false
          }).then(value => {
            feature.set(field.name, value);
            resolve(feature);
          }).catch(reject)
        });
        expression_eval_promises.push(expression_eval_promise);
      }
    }
  });
  return Promise.allSettled(expression_eval_promises);
};

/**
 * set
 * @param get_default_value to context of task
 */
proto.setContextGetDefaultValue = function(get_default_value=false){
  const context = this.getContext();
  context.get_default_value = get_default_value;
};

module.exports = EditingTask;
