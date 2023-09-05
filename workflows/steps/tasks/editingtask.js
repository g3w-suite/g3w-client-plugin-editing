const { base, inherit } = g3wsdk.core.utils;
const { Geometry } = g3wsdk.core.geometry;
const {
  convertSingleMultiGeometry,
  isSameBaseGeometryType,
  createSelectedStyle,
  areCoordinatesEqual
} = g3wsdk.core.geoutils;
const { Layer } = g3wsdk.core.layer;
const { GUI } = g3wsdk.gui;
const { Task } = g3wsdk.core.workflow;
const { WorkflowsStack } = g3wsdk.core.workflow;
const { inputService } = g3wsdk.core.input;
const t = g3wsdk.core.i18n.tPlugin;
const ChooseFeatureToEditComponent = require('../../../g3w-editing-components/choosefeaturetoedit');

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

/**
 * Set selected style to features and return original feature style
 * 
 * @param { Array } features
 * 
 * @returns { ol.style.Style }
 */
proto.setFeaturesSelectedStyle = function(features=[]) {
  if (features.length > 0) {                                       // copy feature from other layers when selecting multiple features
    const arr = features.flat();                                   // flat nested features
    const style = this.getSelectedStyle(arr[0]);
    arr.forEach(feature => feature.setStyle(style.selectedStyle));
    return style.originalStyle;
  }
};

/**
 * Method that set selected style to current editing features and
 * reset original style when workflow (tool) is done.
 * 
 * @param promise jQuery promise
 */
proto.setAndUnsetSelectedFeaturesStyle = function({ promise }={}) {
  
  /** @FIXME temporary add in order to fix issue on pending promise (but wich issue ?) */
  const {
      layer,
      features = [],
  } = this.getInputs();

  /**
   * @TODO if coming from relation ( WorkflowsStack.getLength() > 1 )
   *       no need setTimeout because we already it has selected style
   *       so original is the same selected. In case of current layer
   *       need to wait.
   */
  const selectOriginalStyleHandle = () => {
    const originalStyle = this.setFeaturesSelectedStyle(features);
    promise.always(() => { features.flat().forEach((feature => feature.setStyle(originalStyle))) });
  };

  const is_vector = Layer.LayerTypes.VECTOR === layer.getType();
  const is_single = WorkflowsStack.getLength();

  if (is_vector && is_single) {
    setTimeout(() => { selectOriginalStyleHandle(); });
  } else if(is_vector) {
    selectOriginalStyleHandle();
  }
};

/**
 * Get selected style from "extracted" original feature style  
 * 
 * @param feature
 * 
 * @returns {{ originalStyle: *, selectedStyle: * }} selected style based on geometry type
 */
proto.getSelectedStyle = function(feature) {
  return {
    originalStyle: feature.getStyle(),
    selectedStyle: createSelectedStyle({ geometryType: feature.getGeometry().getType() })
  }
};

/**
 * Disable sidebar
 * 
 * @param {Boolean} bool
 */
proto.disableSidebar = function(bool = true) {
  if (!this._isContentChild) {
    GUI.disableSideBar(bool);
  }
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
              newValueconvertSingleMultiGeometry: field.value
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
 * @since 3.5.14
 * @param inputs
 * @param context
 * @param feature
 * @returns {Promise<void>}
 */
proto.evaluateExpressionFields = async function({inputs, context,  feature}={}){
  const expression_eval_promises = []; // promises from expression evaluation
  const { layer } = inputs;
  const {excludeFields:exclude, get_default_value=false} = context;
  const fields = layer.getFieldsWithValues(feature, {
    exclude,
    get_default_value
  });
  fields.forEach(field => {
    const {default_expression, filter_expression} = field.input.options;
    const qgs_layer_id = inputs.layer.getId();
    const parentData = this.getParentFormData();
    if (default_expression){
      const {apply_on_update = false} = default_expression;
      /*
      check if always update apply_on_update = true or only is is a new feature
       */
      if (apply_on_update || feature.isNew()) {

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
            reject(err)
          }
        });
        expression_eval_promises.push(expression_eval_promise);
      }
    }
    if (filter_expression){
      const expression_eval_promise = new Promise(async (resolve, reject) => {
        try {
          await inputService.handleFilterExpressionFormInput({
            field,
            feature,
            qgs_layer_id,
            parentData
          });
          feature.set(field.name, field.value);
          resolve(feature)
        } catch(err) {
          reject(err)
        }
      });
      expression_eval_promises.push(expression_eval_promise);
    }
  });
  await Promise.allSettled(expression_eval_promises);
  return feature;
};


/**
 * 
 * @param layer,
 * @param feature
 * @returns {
 *   <field_name1>: value,
 *   <field_name1>: value
 * }
 */
proto.getNotEditableFieldsNoPkValues = function({layer, feature}){
  return layer.getEditingNotEditableFields()
    .reduce((accumulator, field) => {
      // in case of pk need to ne set null
      accumulator[field] = layer.isPkField(field) ? null : feature.get(field);
      return accumulator;
    }, {});
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
    const {features, layer, fields=[] } = WorkflowsStack.getParent().getInputs();
    // in case of fields (temporary set by form) set temporary value to feature (cloned) parent
    const feature = features[features.length -1].clone();
    fields.forEach(({name, value}) => {
      feature.set(name, value)
    });
    return {
      feature,
      qgs_layer_id: layer.getId()
    }
  }
};

proto.getFeaturesFromSelectionFeatures = function({layerId, geometryType}){
  const selectionLayerSource = this._mapService.defaultsLayers.selectionLayer.getSource();
  return this.convertFeaturesGeometryToGeometryTypeOfLayer({
    features: selectionLayerSource.getFeatures().filter(feature => feature.__layerId !== layerId),
    geometryType
  })
};

proto.convertFeaturesGeometryToGeometryTypeOfLayer = function({features=[], geometryType}){
  const convertFeatures = [];
  features.forEach(feature => {
    const featureGeometryType = feature.getGeometry() && feature.getGeometry().getType();
    if (geometryType === featureGeometryType) convertFeatures.push(feature);
    else if (isSameBaseGeometryType(featureGeometryType, geometryType) &&
      (Geometry.isMultiGeometry(geometryType) || !Geometry.isMultiGeometry(featureGeometryType))) {
      const cloneFeature = feature.clone();
      cloneFeature.__layerId = feature.__layerId;
      cloneFeature.setGeometry(convertSingleMultiGeometry(feature.getGeometry(), geometryType));
      convertFeatures.push(cloneFeature);
    }
  });
  return convertFeatures;
};

/**
 * @since 3.5.13
 */
proto.chooseFeatureFromFeatures = function({features}){
  return new Promise((resolve, reject) =>{
    const inputs = this.getInputs();

    const feature = [];
    const vueInstance = ChooseFeatureToEditComponent({
      features,
      feature,
      attributes: inputs.layer.getEditingFields().map(({name, label}) => ({name, label}))
    });
    const message = vueInstance.$mount().$el;
    const dialog = GUI.showModalDialog({
      title: t('editing.modal.tools.copyfeaturefromprojectlayer.title'),
      className: 'modal-left',
      closeButton: false,
      message,
      buttons: {
        cancel: {
          label: 'Cancel',
          className: 'btn-danger',
          callback(){
            reject();
          }
        },
        ok: {
          label: 'Ok',
          className: 'btn-success',
          callback: () => {
            resolve(feature[0])
          }
        }
      }
    });
    dialog.find('button.btn-success').prop('disabled', true);
    vueInstance.$watch('feature', feature => dialog.find('button.btn-success').prop('disabled', feature === null));
  })
};


/**
 * @since v3.7.0
 */
proto.handleLayerRelation1_1 = function({layerId, features=[]}={}){
  if (features.length === 0) return; // in case of no features
  //Get layer relation 1:1
  this.getEditingService()
    .getRelation1_1ByLayerId(layerId)
    .forEach(relation => {
      //check if layerId is a father layer of relation 1:1
      if (layerId === relation.getFather()) {
        //check if child relation layer is editable (on editing)
        const childLayerId = relation.getChild();
        //get child feature relation 1:1
        const childFeature = this.getEditingService()
          .getLayerById(childLayerId)
          .readFeatures()
          .find(feature => features[0].get(relation.getFatherField()) === feature.get(relation.getChildField()));
        //If a child feature relation 1:1 is binds to current feature
        if (childFeature) {
          const newChildFeature = childFeature.clone();
          //Loop to editable only field of father layerId
          this.getEditingService()
            .getRelation1_1EditingLayerFieldsReferredToChildRelation(layerId, childLayerId)
            .filter(field => field.editable)
            .forEach(field => {
              //@TODO need a way to get custom name prefix
              newChildFeature.set(field.name.split(`${this.getEditingService().getProjectLayerById(childLayerId).getName()}_`)[1], features[0].get(field.name))
            })
          this.getContext().session.pushUpdate(childLayerId, newChildFeature, childFeature)
        }
      }
    })
}

module.exports = EditingTask;
