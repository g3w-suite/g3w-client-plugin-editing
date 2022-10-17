const { base, inherit } = g3wsdk.core.utils;
const { createSelectedStyle, areCoordinatesEqual} = g3wsdk.core.geoutils;
const { Layer } = g3wsdk.core.layer;
const { GUI } = g3wsdk.gui;
const { Task } = g3wsdk.core.workflow;
const { WorkflowsStack } = g3wsdk.core.workflow;
const { inputService } = g3wsdk.core.input;

/**
 * List of placeholder in default_expression expression to call server for getting value of input
 * @type {string[]}
 */
const GEOMETRY_DEFAULT_EXPRESSION_PLACEHOLDERS = [
  "$area",
  "$perimeter",
  "$length",
  "$x",
  "$y",
  "$geometry"
];

function EditingTask(options = {}) {
  base(this, options);
  this._editingServive;
  this._mapService = GUI.getService('map');
  this.addInteraction = function(interaction) {
    this._mapService.addInteraction(interaction);
  };
  this.removeInteraction = function(interaction) {
    //needed to avoid a issue on Openlayers
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
      promise.always(() => features.forEach((feature => feature.setStyle(originalStyle))));
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
 * method that return in case of relation child  workflow the layerId root
 * @returns {*}
 */
proto.getRootWorkflowLayerId = function(){
  return WorkflowsStack.getFirst().getInputs().layer.getId()
};

/**
 * get form fields
 */

proto.getFormFields = async function({inputs, context, feature, isChild=false}={}){
  let hasUniqueValue = false;
  const relationLayerId = this.getRootWorkflowLayerId();
  const {layer, features} = inputs;
  const layerId = layer.getId();
  const unique_values_feature_field_Obj = [];
  const {excludeFields:exclude, get_default_value=false} = context;
  const fields = layer.getFieldsWithValues(feature, {
    exclude,
    get_default_value
  });
  /**
   * check for unique validate
   */
  fields.forEach(field => {
    if (field.validate.unique) {
      hasUniqueValue = true;
      const current_feature_value = feature.get(field.name); // current editing feature field value
      unique_values_feature_field_Obj.push({
        current_feature_value,
        field
      })
    }
  });
  unique_values_feature_field_Obj.forEach(({current_feature_value, field}) => {
    /**
     * current editing feature add to
     */
    let layerUniqueFieldValues;
    if (isChild) {
      layerUniqueFieldValues = this.getEditingService().getChildLayerUniqueFieldValues({
        layerId,
        relationLayerId,
        field
      })
    } else {
      layerUniqueFieldValues = this.getEditingService().getLayerUniqueFieldValues({
        layerId,
        field
      })
    }
    layerUniqueFieldValues.forEach(value => field.validate.exclude_values.add(value));

    /**
     * add eventually current feature field unique value that are changed during editing
     */
    features.forEach(feature => {
      const value = feature.get(field.name);
      if (value !== null || typeof value !== "undefined") field.validate.exclude_values.add(value);
    });
    //remove current value from exclude_values
    field.validate.exclude_values.delete(current_feature_value);
  });

  if (hasUniqueValue) {
    const savedfeatureFnc = () => {
       unique_values_feature_field_Obj.forEach(({current_feature_value, field}) => {
        if (current_feature_value !== field.value) {
          if (isChild)
            this.getEditingService().changeRelationLayerUniqueFieldValues({
              layerId,
              relationLayerId,
              field,
              oldValue: current_feature_value,
              newValue: field.value
            });
          else
            this.getEditingService().changeLayerUniqueFieldValues({
              layerId,
              field,
              oldValue: current_feature_value,
              newValue: field.value
            });
        }
      });
       if (!isChild) this.getEditingService().saveTemporaryRelationsUniqueFieldsValues(layerId);
       return {
        once: true
      }
    };

    this.getEditingService().subscribe(`savedfeature_${layerId}`, savedfeatureFnc);
    this.getEditingService().subscribe(`closeform_${layerId}`, () => {
      this.getEditingService().unsubscribe(`savedfeature_${layerId}`, savedfeatureFnc);
      this.getEditingService().clearTemporaryRelationsUniqueFieldsValues(layerId);
      return {
        once: true
      }
    })
  }
  return fields;
};

/**
 * Evaluated Expression checking inp
 */
proto.evaluateGeometryExpressionField = async function({inputs, context,  feature}={}){
  const expression_eval_promises = []; // promises from expression evaluation
  const { layer } = inputs;
  const {excludeFields:exclude, get_default_value=false} = context;
  const fields = layer.getFieldsWithValues(feature, {
    exclude,
    get_default_value
  });
  fields.forEach(field => {
    const {default_expression} = field.input.options;
    if (default_expression){
      let evaluate = false;
      const {expression, apply_on_update = false} = default_expression;
      /*
      check if always update apply_on_update = true or only is is a new feature
       */
      if (apply_on_update || feature.isNew()) evaluate = GEOMETRY_DEFAULT_EXPRESSION_PLACEHOLDERS.find(placeholder => expression.indexOf(placeholder) !== -1);
      if (evaluate){
        const qgs_layer_id = inputs.layer.getId();
        const parentData = this.getParentFormData();
        const expression_eval_promise = new Promise(async (resolve, reject) => {
          try {
            await inputService.handleDefaultExpressionFormInput({
              field,
              feature,
              qgs_layer_id,
              parentData
            });
            feature.set(field.name, field.value);
            resolve(feature)
          } catch(err) {
            console.log(err)
            reject(err)
          }
        });
        expression_eval_promises.push(expression_eval_promise);
      }
    }
  });
  await Promise.allSettled(expression_eval_promises);
  return feature;
};

/**
 * set
 * @param get_default_value to context of task
 */
proto.setContextGetDefaultValue = function(get_default_value=false){
  const context = this.getContext();
  context.get_default_value = get_default_value;
};

proto.getParentFormData = function(){
  if (WorkflowsStack.getLength() > 1) {
    const {features, layer } = WorkflowsStack.getParent().getInputs();
    return {
      feature: features[0],
      qgs_layer_id: layer.getId()
    }
  }
};

module.exports = EditingTask;
