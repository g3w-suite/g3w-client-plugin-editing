import ChooseFeatureToEditVueComponent from '../../../components/ChooseFeatureToEdit.vue';
import { VM }                          from '../../../eventbus';

const {
  base,
  inherit,
  createFilterFormInputs,
}                              = g3wsdk.core.utils;

const { Geometry }             = g3wsdk.core.geometry;
const {
  convertSingleMultiGeometry,
  isSameBaseGeometryType,
  createSelectedStyle,
  areCoordinatesEqual,
}                              = g3wsdk.core.geoutils;
const {
  Layer,
  features: { Feature }
}                              = g3wsdk.core.layer;
const { GUI }                  = g3wsdk.gui;
const { WorkflowsStack, Task } = g3wsdk.core.workflow;
const { inputService }         = g3wsdk.core.input;
const t                        = g3wsdk.core.i18n.tPlugin;
const { DataRouterService }    = g3wsdk.core.data;

/**
 * Base editing task
 * 
 * @param options
 * 
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
    setTimeout(() => this._mapService.removeInteraction(interaction)) // timeout needed to workaround an Openlayers issue 
  };

}

inherit(EditingTask, Task);

const proto = EditingTask.prototype;

/**
 * @TODO code implementation
 * 
 * Get editing type from editing config
 * 
 * @returns { null }
 */
proto.getEditingType = function() {
  return null;
};

/**
 * @FIXME add description
 */
proto.registerPointerMoveCursor = function() {
  this._mapService.getMap().on("pointermove", this._pointerMoveCursor)
};

/**
 * @FIXME add description
 */
proto.unregisterPointerMoveCursor = function() {
  this._mapService.getMap().un("pointermove", this._pointerMoveCursor)
};

/**
 * @param evt
 * 
 * @private
 */
proto._pointerMoveCursor = function(evt) {
  this.getTargetElement().style.cursor = (this.forEachFeatureAtPixel(evt.pixel, () => true) ? 'pointer' : '');
};

/**
 * @param steps
 */
proto.setSteps = function(steps = {}) {
  this._steps = steps;
  this.setUserMessageSteps(steps);
};

/**
 * @returns {{}}
 */
proto.getSteps = function() {
  return this._steps;
};

/**
 * @returns {*}
 */
proto.getMapService = function() {
  return this._mapService;
};

/**
 * @returns {*}
 */
proto.getMap = function() {
  return this._mapService.getMap();
};

/**
 * @param feature
 * @param coordinates
 * 
* @returns { boolean }
 */
proto.areCoordinatesEqual = function({
  feature,
  coordinates,
}) {
  const geometry = feature.getGeometry();
  const type     = geometry.getType();
  const coords   = c => areCoordinatesEqual(coordinates, c); // whether element have same coordinates

  switch (type) {
    case 'Polygon':
    case 'MultiLineString':
      return _.flatMap(geometry.getCoordinates()).some(coords);

    case 'LineString':
    case 'MultiPoint':
        return geometry.getCoordinates().some(coords);

    case 'MultiPolygon':
        return geometry.getPolygons().some(poly => _.flatMap(poly.getCoordinates()).some(coords));

    case 'Point':
      return areCoordinatesEqual(coordinates, geometry.getCoordinates());

    default:
      return false;
  }
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
proto.setAndUnsetSelectedFeaturesStyle = function({ promise } = {}) {
  
  /** @FIXME temporary add in order to fix issue on pending promise (but which issue ?) */
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
 * @returns {*|EditingService|{}}
 */
proto.getEditingService = function() {
  this._editingServive = this._editingServive || require('../../../services/editingservice');
  return this._editingServive;
};

/**
 * @param event
 * @param options
 * 
 * @returns {*}
 */
proto.fireEvent = function(event, options={}) {
  return this.getEditingService().fireEvent(event, options);
};

/**
 * @param layer
 * @param feature
 */
proto.setNullMediaFields = function({
  layer,
  feature,
} = {}) {
  layer
    .getEditingMediaFields({})
    .forEach(field => feature.set(field, null))
};

/**
 * @param inputs
 * @param context
 */
proto.run = function(inputs, context) {};

/**
 * @FIXME add description
 */
proto.stop = function() {};

/**
 * Handle single task 
 */
proto.saveSingle = function(input, context) {
  context.session.save().then(() => this.getEditingService().saveChange());
};

/**
 * Cancel single task
 * 
 * @param input
 * @param context
 */
proto.cancelSingle = function(input, context) {
  context.session.rollback();
};

/**
 * Return in case of relation child workflow the layerId root
 * @returns {*}
 */
proto.getRootWorkflowLayerId = function() {
  return WorkflowsStack.getFirst().getInputs().layer.getId()
};

/**
 * Get form fields
 * 
 * @param form.inputs.layer
 * @param form.inputs.features
 * @param form.context.excludeFields
 * @param form.context.get_default_value
 * @param form.isChild                   - whether is child form (ie. belongs to relation)
 */
proto.getFormFields = async function({
  inputs,
  context,
  feature,
  isChild = false,
} = {}) {

  let has_unique        = false;                            // check for unique validation

  const service         = this.getEditingService();
  const relationLayerId = this.getRootWorkflowLayerId();    // root layerId (in case of edit relation)
  const layerId         = inputs.layer.getId();             // current form layerId
  const unique_values   = [];                               // unique values by feature field

  const fields          = inputs.layer.getFieldsWithValues( // editing fields with values (in case of update)
    feature,
    {
      exclude:           context.excludeFields,
      get_default_value: undefined !== context.get_default_value ? context.get_default_value : false,
    }
  );

  fields.forEach(field => {
    if (field.validate.unique) {
      has_unique = true;                 // field value need to be unique
      unique_values.push({
        field,                           // feature field
        _value: feature.get(field.name), // feature field value (current in editing)
      })
    }
  });

  unique_values.forEach(({ _value, field }) => {
    const current_values = isChild                                                  // current editing feature add to
      ? service.getChildLayerUniqueFieldValues({ layerId, relationLayerId, field }) // child form --> belongs to relation
      : service.getLayerUniqueFieldValues({ layerId, field });                      // root layer --> TODO: CHECK IF FIELD IS RELATED TO 1:1 RELATION 

    // convert "current" values to string (when not null or undefined)
    current_values.forEach(value => { field.validate.exclude_values.add([null, undefined].indexOf(value) === -1 ? `${value}` : value ); });

    // convert "inputs" values to string (when not null or undefined)
    inputs.features.forEach(feature => {
      const value = feature.get(field.name);
      if ([null, undefined].indexOf(value) === -1) {
        field.validate.exclude_values.add(`${value}`);
      }
    });

    // remove current value from exclude_values
    field.validate.exclude_values.delete(_value);
  });

  // skip when ..
  if (!has_unique) {
    return fields;
  }

  // Listen event method after close/save form
  const savedfeatureFnc = () => {
    unique_values.forEach(({ _value, field }) => {
      // skip when ...
      if (_value === field.value) {
        return;
      }
      if (isChild) {
        // relation form
        service.changeRelationLayerUniqueFieldValues({
          layerId,
          relationLayerId,
          field,
          oldValue: _value,
          newValueconvertSingleMultiGeometry: field.value
        });
      } else {
        // root form layer
        service
          .changeLayerUniqueFieldValues({
            layerId,
            field,
            oldValue: _value,
            newValue: field.value
          });
      }

    });

    if (false === isChild) {
      service.saveTemporaryRelationsUniqueFieldsValues(layerId);
    }

    return { once: true };
  };

  service.subscribe(`savedfeature_${layerId}`, savedfeatureFnc);
  service.subscribe(`closeform_${layerId}`, () => {
    service.unsubscribe(`savedfeature_${layerId}`, savedfeatureFnc);
    service.clearTemporaryRelationsUniqueFieldsValues(layerId);
    return { once: true };
  });

  return fields;
};

/**
 * @param expression.inputs.layer
 * @param expression.context.excludeFields
 * @param expression.context.get_default_value
 * @param expression.feature
 * 
 * @returns {Promise<void>}
 * 
 * @since g3w-client-plugin-editing@v3.5.14
 */
proto.evaluateExpressionFields = async function({
  inputs,
  context,
  feature,
} = {}) {
  const promises  = []; // promises from expression evaluation

  inputs.layer
    .getFieldsWithValues(
      feature,
      {
        exclude: context.excludeFields,
        get_default_value: undefined !== context.get_default_value ? context.get_default_value : false,
      }
    )
    .forEach(field => {

      // default expression
      if (field.input.options.default_expression && (field.input.options.default_expression.apply_on_update || feature.isNew())) {
        promises.push(
          new Promise(async (resolve, reject) => {
            try {
              await inputService.handleDefaultExpressionFormInput({
                field,
                feature,
                qgs_layer_id: inputs.layer.getId(),
                parentData:   this.getParentFormData(),
              });
              feature.set(field.name, field.value);
              resolve(feature)
            } catch(e) {
              reject(e);
            }
          })
        );
      }

      // filter expression
      if (field.input.options.filter_expression) {
        promises.push(
          new Promise(async (resolve, reject) => {
            try {
              await inputService.handleFilterExpressionFormInput({
                field,
                feature,
                qgs_layer_id: inputs.layer.getId(),
                parentData:   this.getParentFormData(),
              });
              feature.set(field.name, field.value);
              resolve(feature)
            } catch(e) {
              reject(e);
            }
          })
        );
      }

    });

  await Promise.allSettled(promises);

  return feature;
};


/**
 * @param layer,
 * @param feature
 * 
 * @returns Array of fields
 */
proto.getNotEditableFieldsNoPkValues = function({
  layer,
  feature,
}) {
  return layer
    .getEditingNotEditableFields()
    .reduce((fields, field) => {
      fields[field] = layer.isPkField(field) ? null : feature.get(field); // NB: Primary Key fields need to be `null`
      return fields;
    }, {});
};

/**
 * @param get_default_value to context of task
 */
proto.setContextGetDefaultValue = function(get_default_value = false) {
  this.getContext().get_default_value = get_default_value;
};

/**
 * @returns { undefined | { feature: * , qgs_layer_id: * } }
 */
proto.getParentFormData = function() {
  // skip when ..
  if (!(WorkflowsStack.getLength() > 1)) {
    return;
  }

  const {
    features,
    layer,
    fields = [],
  } = WorkflowsStack.getParent().getInputs();

  // in case of temporary fields (setted by form) set temporary value to feature (cloned) parent
  const feature = features[features.length -1].clone();

  fields.forEach(({ name, value }) => { feature.set(name, value) });

  return {
    feature,
    qgs_layer_id: layer.getId(),
  };
};

/**
 * @param layerId
 * @param geometryType
 * 
 * @returns { Array }
 */
proto.getFeaturesFromSelectionFeatures = function({
  layerId,
  geometryType,
}) {
  return this.convertFeaturesGeometryToGeometryTypeOfLayer({
    features: this._mapService.defaultsLayers.selectionLayer.getSource().getFeatures().filter(feature => feature.__layerId !== layerId),
    geometryType
  })
};

/**
 * @param features
 * @param geometryType
 * 
 * @returns { Array } converted features
 */
proto.convertFeaturesGeometryToGeometryTypeOfLayer = function({
  features = [],
  geometryType,
}) {
  const converted = [];
  features.forEach(f => {
    const type = f.getGeometry() && f.getGeometry().getType();
    if (geometryType === type) {
      converted.push(f);
    } else if (
      isSameBaseGeometryType(type, geometryType) &&
      (Geometry.isMultiGeometry(geometryType) || !Geometry.isMultiGeometry(type))
    ) {
      const cloned = f.clone();
      cloned.__layerId = f.__layerId;
      cloned.setGeometry(convertSingleMultiGeometry(f.getGeometry(), geometryType));
      converted.push(cloned);
    }
  });
  return converted;
};

/**
 * @since g3w-client-plugin-editing@v3.5.13
 */
proto.chooseFeatureFromFeatures = function({
  features = [],
}) {
  return new Promise((resolve, reject) => {
    const inputs = this.getInputs();

    const feature = [];

    /**
     * ORIGINAL SOURCE: g3w-client-plugin-editing/g3w-editing-components/choosefeaturetoedit.js@3.6
     */
    const Component    = Vue.extend(ChooseFeatureToEditVueComponent);
    const vueInstance  = new Component({
      features:   Array.isArray(features)   ? features : [],
      feature,
      attributes: inputs.layer.getEditingFields().map(({ name, label }) => ({ name, label })),
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
          callback() {
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
 * Hhandle layer relation 1:1 features related to feature
 *
 * @param opts.layerId Root layerId
 * @param opts.features Array of update/new features belong to Root layer
 * 
 * @since g3w-client-plugin-editing@v3.7.0
 */
proto.handleRelation1_1LayerFields = function({
  layerId,
  features = [],
} = {}) {

  // skip when no features
  if (features.length === 0) {
    return;
  }

  const isNew   = features[0].isNew();
  const service = this.getEditingService();

  // Get layer relation 1:1
  service
    .getRelation1_1ByLayerId(layerId)
    .forEach(relation => {

      // skip when layer is not a father layer (1:1 relation)
      if (layerId !== relation.getFather()) {
        return;
      }

      // check if child relation layer is editable (in editing)
      const childLayerId = relation.getChild();
      const source       = service.getLayerById(childLayerId).getEditingSource();
      let childFeature;
      let newChild;

      // get or create child feature
      if (isNew) {
        childFeature = new Feature();
        childFeature.setTemporaryId();
        source.addFeature(childFeature);
        newChild = childFeature && childFeature;
        // set name attribute to `null`
        service
          .getProjectLayerById(childLayerId)
          .getEditingFields()
          .forEach(field => childFeature.set(field.name, null)); 
      } else {
        childFeature = source.readFeatures().find(f => features[0].get(relation.getFatherField()) === f.get(relation.getChildField()));
        newChild = childFeature && childFeature.clone();
      }

      // Loop editable only field of father layerId when
      // a child relation (1:1) is binded to current feature
      if (childFeature) {
        service
          .getRelation1_1EditingLayerFieldsReferredToChildRelation(relation)
          .filter(field => field.editable)
          .forEach(field => { newChild.set(this.GetChildFieldNameFromRelation1_1({ relation, field }), features[0].get(field.name)); });
      }

      // check if father field is a Pk (Primary key) if feature is new
      if (childFeature && isNew && service.getLayerById(layerId).isPkField(relation.getFatherField())) {
        childFeature.set(relation.getChildField(), features[0].getId()); // setted temporary
      }

      // add relation
      if (childFeature && isNew) {
        this.getContext().session.pushAdd(childLayerId, newChild, false);
      }

      // update relation
      if (childFeature && !isNew) {
        this.getContext().session.pushUpdate(childLayerId, newChild, childFeature);
      }

    });
}

/**
 * Listen changes on 1:1 relation fields (get child values from child layer)
 * 
 * @param layerId Current editing layer id
 * @param fields Array of form fields of current editing layer
 * 
 * @returns Array of watch function event to remove listen
 * 
 * @since g3w-client-plugin-editing@v3.7.0
 */
proto.listenRelation1_1FieldChange = function({
  layerId,
  fields = [],
} = {}) {
  const unwatches = []; // unwatches field value (event change)
  const cache     = {}; // cache values of child relation layer based on relation field
  const service   = this.getEditingService();

  // get all relation 1:1 of current layer
  this
    .getEditingService()
    .getRelation1_1ByLayerId(layerId)
    .forEach(relation => {
      const relationId   = relation.getId();                                // get relation Id
      const childLayerId = relation.getChild();                             // get relation child layer id
      const fatherField  = relation.getFatherField();

      // NB:
      // need to check if editable when opening form task 
      // Not set this condition because maybe i ca be used this method
      // on move task or other when current relationField, related to 1:1 relation
      // it can be changed by default expression or in other way not only with form
      const relationField = fields.find(f => fatherField.includes(f.name)); // get child layer field (for each relation)

      // skip when ..
      if (!(relationField && service.getLayerById(childLayerId))) {
        return;
      }

      // field found and relation layer is in editing.
      // it required the second condition because the field can be not editable,
      // but it can be changed

      // initialize cache with relation id
      cache[relationId] = {};

      // get project layer
      const layer = service.getProjectLayerById(childLayerId);

      // listen for relation field changes (vue watcher)
      unwatches.push(
        VM.$watch(
          () => relationField.value,
          async value => {
            const is_cached = cache[relationId][value];            // check if value is cached

            // skip empty values
            if (!value) {
              relationField.input.options.loading.state = null; 
              relationField.editable                    = true;
              return;
            }

            relationField.editable                    = false;     // disable edit 
            relationField.input.options.loading.state = 'loading'; // show input bar loader

            // skip server request (retrieve data from cache)
            if (is_cached) {
              cache[relationId][value]
                .forEach((item) => {
                  Object
                    .entries(item)
                    .forEach(([name, value]) => fields.find(f => f.name === name).value = value)
                });
              // reset edit state
              relationField.input.options.loading.state = null; 
              relationField.editable                    = true;
              return;
            }

            // request server data and then update cache
            try {
              const { data } = await DataRouterService.getData('search:features', {  // get feature of relation layer based on value of relation field 
                inputs: {
                  layer,
                  formatter: 0,
                  filter: createFilterFormInputs({
                    layer,
                    search_endpoint: 'api',
                    inputs: [{
                      attribute: relationField.name,
                      value,
                    }]
                  }),
                  search_endpoint: 'api',
                },
                outputs: false,
              });
              if (data && data[0] && 1 === data[0].features.length) {                // NB: length == 1, due to 1:1 relation type
                cache[relation.getId()][value] = [];
                // 
                service
                  .getRelation1_1EditingLayerFieldsReferredToChildRelation(relation) // field of root layers related to current relation
                  .forEach(field => {
                    const childValue = data[0].features[0].get(this.GetChildFieldNameFromRelation1_1({ relation, field }));
                    fields.find(f => f.name === field.name).value = childValue;
                    cache[relationId][value].push({ [field.name]: childValue });
                  })
              }
            } catch(e) {
              console.warn(e);
            }

            // reset edit state
            relationField.input.options.loading.state = null; 
            relationField.editable                    = true;
          }
        )
      );

    });

  return unwatches;
};

/**
 * Check if relation has prefix.
 * 
 * that's how 1:1 relation fields are marked
 * 
 * @param opts.relation Relation Object
 * @param opts.field    father field
 * 
 * @return name of father field
 * 
 * @since g3w-client-plugin-editing@v3.7.0
 */
proto.GetChildFieldNameFromRelation1_1 = function({
  relation,
  field,
} = {}) {
  return relation.getPrefix() ?
    field.name.split(relation.getPrefix())[1] :
    field.name;
};

module.exports = EditingTask;
