const {
  base,
  inherit,
  createFilterFormInputs,
} = g3wsdk.core.utils;

const { Geometry } = g3wsdk.core.geometry;
const {
  convertSingleMultiGeometry,
  isSameBaseGeometryType,
  createSelectedStyle,
  areCoordinatesEqual,
} = g3wsdk.core.geoutils;
const {
  Layer,
  features: { Feature }
} = g3wsdk.core.layer;
const { GUI } = g3wsdk.gui;
const { Task } = g3wsdk.core.workflow;
const { WorkflowsStack } = g3wsdk.core.workflow;
const { inputService } = g3wsdk.core.input;
const t = g3wsdk.core.i18n.tPlugin;
const {DataRouterService} = g3wsdk.core.data;
const {VM} = g3wsdk.constant.APP_EVENTBUS;

const ChooseFeatureToEditComponent = require('../../../g3w-editing-components/choosefeaturetoedit');

/**
 * Base editing task
 * @param options
 * @constructor
 */
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

/**
 * get editing type from editing config
 * @TODO
 * @returns {null}
 */
proto.getEditingType = function() {
  return null;
};

/**
 *
 */
proto.registerPointerMoveCursor = function(){
  this._mapService.getMap().on("pointermove", this._pointerMoveCursor)
};

/**
 *
 */
proto.unregisterPointerMoveCursor = function(){
  this._mapService.getMap().un("pointermove", this._pointerMoveCursor)
};

/**
 *
 * @param evt
 * @private
 */
proto._pointerMoveCursor = function(evt) {
  const hit = this.forEachFeatureAtPixel(evt.pixel, () => true);
  if (hit) this.getTargetElement().style.cursor = 'pointer';
  else this.getTargetElement().style.cursor = '';
};

/**
 *
 * @param steps
 */
proto.setSteps = function(steps={}){
  this._steps = steps;
  this.setUserMessageSteps(steps);
};

/**
 *
 * @returns {{}}
 */
proto.getSteps = function(){
  return this._steps;
};

/**
 *
 * @returns {*}
 */
proto.getMapService = function(){
  return this._mapService;
};

/**
 *
 * @returns {*}
 */
proto.getMap = function() {
  return this._mapService.getMap();
};

/**
 *
 * @param feature
 * @param coordinates
 * @returns {*|boolean}
 */
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

/**
 *
 * @returns {*|EditingService|{}}
 */
proto.getEditingService = function() {
  this._editingServive = this._editingServive || require('../../../services/editingservice');
  return this._editingServive;
};

/**
 *
 * @param event
 * @param options
 * @returns {*}
 */
proto.fireEvent = function(event, options={}) {
  return this.getEditingService().fireEvent(event, options);
};

/**
 *
 * @param layer
 * @param feature
 */
proto.setNullMediaFields = function({layer, feature}={}) {
  const mediaFields = layer.getEditingMediaFields({});
  mediaFields.forEach(field => feature.set(field, null))
};

/**
 *
 * @param inputs
 * @param context
 */
proto.run = function(inputs, context) {};

/**
 *
 */
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
  // root layerId in case of edit relation
  const relationLayerId = this.getRootWorkflowLayerId();
  const {layer, features} = inputs;
  //current form layerId
  const layerId = layer.getId();
  //Initially Empty array where store unique values by feature field
  const unique_values_feature_field_Obj = [];

  const {excludeFields:exclude, get_default_value=false} = context;

  //get editing fields with values (in case of update)
  const fields = layer.getFieldsWithValues(feature, {
    exclude,
    get_default_value
  });

  /**
   * check for unique validate
   */
  fields.forEach(field => {
    //chech if field value need to be unique
    if (field.validate.unique) {
      //set true
      hasUniqueValue = true;
      //get current feature field value
      const current_feature_value = feature.get(field.name); // current editing feature field value
      //add object with field and current value
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
    //check if i child form (belong to relation)
    if (isChild) {
      layerUniqueFieldValues = this.getEditingService().getChildLayerUniqueFieldValues({
        layerId,
        relationLayerId,
        field
      })
    } else {
      //root layer
      //@TODO CHECK IF FIELD IS RELATED TO RELATION 1:1
      layerUniqueFieldValues = this.getEditingService().getLayerUniqueFieldValues({
        layerId,
        field
      })
    }

    layerUniqueFieldValues.forEach(value => {
      //convert to string if value is not null or undefined
      field.validate.exclude_values.add([null, undefined].indexOf(value) === -1 ? `${value}` : value )
    });

    /**
     * add eventually current feature field unique value that are changed during editing
     */
    features.forEach(feature => {
      const value = feature.get(field.name);
      //in case of not null or undefined concert to string
      if ([null, undefined].indexOf(value) === -1) {
        field.validate.exclude_values.add(`${value}`);
      }
    });
    //remove current value from exclude_values
    field.validate.exclude_values.delete(current_feature_value);
  });

  if (hasUniqueValue) {
    //Listen event method after close/save form
    const savedfeatureFnc = () => {

       unique_values_feature_field_Obj.forEach(({current_feature_value, field}) => {

        if (current_feature_value !== field.value) {
          //case is a relation form
          if (isChild) {

            this.getEditingService()
              .changeRelationLayerUniqueFieldValues({
                layerId,
                relationLayerId,
                field,
                oldValue: current_feature_value,
                newValueconvertSingleMultiGeometry: field.value
              });

          } else {
            //case root form layer
            this.getEditingService()
              .changeLayerUniqueFieldValues({
                layerId,
                field,
                oldValue: current_feature_value,
                newValue: field.value
              });
          }
        }

      });

      if (false === isChild) {

        this.getEditingService().saveTemporaryRelationsUniqueFieldsValues(layerId);
      }

      return {once: true}
    };

    this.getEditingService().subscribe(`savedfeature_${layerId}`, savedfeatureFnc);

    this.getEditingService().subscribe(`closeform_${layerId}`, () => {

      this.getEditingService().unsubscribe(`savedfeature_${layerId}`, savedfeatureFnc);

      this.getEditingService().clearTemporaryRelationsUniqueFieldsValues(layerId);

      return {once: true}

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
  const {
    excludeFields:exclude,
    get_default_value=false
  } = context;

  layer.getFieldsWithValues(feature, {exclude, get_default_value})
    .forEach(field => {
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
 * @returns Array of field
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

/**
 *
 * @returns {{qgs_layer_id: *, feature: *}}
 */
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

/**
 *
 * @param layerId
 * @param geometryType
 * @returns {*[]}
 */
proto.getFeaturesFromSelectionFeatures = function({layerId, geometryType}){
  const selectionLayerSource = this._mapService.defaultsLayers.selectionLayer.getSource();
  return this.convertFeaturesGeometryToGeometryTypeOfLayer({
    features: selectionLayerSource.getFeatures().filter(feature => feature.__layerId !== layerId),
    geometryType
  })
};

/**
 *
 * @param features
 * @param geometryType
 * @returns {*[]}
 */
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
proto.chooseFeatureFromFeatures = function({features=[]}){
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
 * Method to handle layer relation 1:1 features related to feature
 * @since v3.7.0
 * @param opts.layerId Root layerId
 * @param opts.features Array of update/new features belong to Root layer
 */
proto.handleLayerRelation1_1 = function({layerId, features=[]}={}){
  if (features.length === 0) return; // in case of no features
  const isNew = features[0].isNew();
  //Get layer relation 1:1
  this.getEditingService()
    .getRelation1_1ByLayerId(layerId)
    .forEach(relation => {
      //check if layerId is a father layer of relation 1:1
      if (layerId === relation.getFather()) {
        //check if child relation layer is editable (on editing)
        const childLayerId = relation.getChild();
        let childFeature;
        if (isNew) {
          //create new feature
          childFeature = new Feature();
          childFeature.setTemporaryId();
          //add feature to layer editing source
          this.getEditingService()
            .getLayerById(childLayerId)
            .getEditingSource()
            .addFeature(childFeature);
          //set attribute to null
          this.getEditingService()
            .getProjectLayerById(childLayerId)
            .getEditingFields()
            .forEach(field => childFeature.set(field.name, null));
        } else {
          //get child feature relation 1:1
          childFeature = this.getEditingService()
            .getLayerById(childLayerId)
            .getEditingSource()
            .readFeatures()
            .find(feature => features[0].get(relation.getFatherField()) === feature.get(relation.getChildField()));
        }
        //If a child feature relation 1:1 is binds to current feature
        if (childFeature) {
          //if childFeature
          const newChildFeature = isNew ? childFeature : childFeature.clone();
          //Loop to editable only field of father layerId
          this.getEditingService()
            .getRelation1_1EditingLayerFieldsReferredToChildRelation(relation)
            .filter(field => field.editable) //@TODO MAYBE NOT USEFUL BECAUSE IF NOT EDITABLE CAN CHANGE IT VALUE
            .forEach(field => {
              //@TODO need a way to get custom name prefix
              if (field.name.split(`${this.getEditingService().getProjectLayerById(childLayerId).getName()}_`).length > 1) {
                newChildFeature.set(field.name.split(`${this.getEditingService().getProjectLayerById(childLayerId).getName()}_`)[1], features[0].get(field.name))
              } else {
                newChildFeature.set(field.name, features[0].get(field.name));
              }
            })
          if (isNew) {
            //check if father field is a Pk (Primary key)
            if (this.getEditingService().getLayerById(layerId).isPkField(relation.getFatherField())) {
              //need to set temporary
              childFeature.set(relation.getChildField(), features[0].getId());
            }
            //add relation feature
            this.getContext().session.pushAdd(childLayerId, newChildFeature);
          } else {
            //update relation feature
            this.getContext().session.pushUpdate(childLayerId, newChildFeature, childFeature);
          }
        }
      }
    })
}

/**
 * @since v3.7.0
 * @param layerId Current editing layer
 * @param fields Array of fields
 * @returns  Array of watch function event to remove listen
 */
proto.listenRelation1_1FieldChange = function({layerId, fields=[]}={}) {
  //RELATION 1:1 IN CASE CHANGE RELATION FIELD NEED TO
  //GET CHILD VALUES FROM CHILD LAYER
  //initiliaze unwatch field value event change
  const unwatchs = [];
  //get all relation 1:1 of current layer
  this.getEditingService()
    .getRelation1_1ByLayerId(layerId)
    .forEach(relation => {
      //for each relation get child layer field
      const relationField = fields.find(field => field.name === relation.getFatherField());
      //if found field and relation layer is in editing
      if (relationField && this.getEditingService().getLayerById(relation.getChild())) {
        //get project layer
        const layer = this.getEditingService().getProjectLayerById(relation.getChild());
        //add watch function to unwatch
        unwatchs.push(
          VM.$watch(
            //listen field value change
            () => relationField.value,
            async (value) => {
              //in case of value /exclude empty string
              if (value) {
                //set editable false to avoid to edit
                relationField.editable = false;
                try {
                  //get feature of relation layer based on value of relation field
                  const {data} = await DataRouterService.getData('search:features', {
                    inputs: {
                      layer,
                      formatter:0,
                      filter: createFilterFormInputs({
                        layer,
                        search_endpoint: 'api',
                        inputs: [{
                          attribute: relationField.name,
                          value,
                        }]
                      }),
                      search_endpoint: 'api'
                    },
                    outputs: false
                  });
                  // if return result
                  if (data && data[0] && data[0].features.length === 1) {
                    //Get feature. It is one feature due relation1:1 type
                    const feature = data[0].features[0];
                    //get field of root layers related to current relation
                    this.getEditingService()
                      .getRelation1_1EditingLayerFieldsReferredToChildRelation(relation)
                      .forEach(field => {
                        //@TODO temporary check of field base on prexif child layer name
                        if (field.name.split(`${this.getEditingService().getProjectLayerById(relation.getChild()).getName()}_`).length > 1) {
                          //SET VALUE
                          fields.find(f => f.name === field.name).value = feature.get(field.name.split(`${this.getEditingService().getProjectLayerById(relation.getChild()).getName()}_`)[1]);
                        }
                      })
                  }
                } catch(err){
                  console.log(err)
                }
              }

              relationField.editable = true;
            }
          )
        )
      }
    });

  return unwatchs;

}

module.exports = EditingTask;
