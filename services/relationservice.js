import { EditingWorkflow } from '../g3wsdk/workflow/workflow';
import {
  OpenFormStep,
  LinkRelationStep,
  PickProjectLayerFeaturesStep,
  CopyFeaturesFromOtherProjectLayerStep,
  AddTableFeatureStep,
  OpenTableStep,
  AddFeatureStep,
}                          from '../workflows';

Object
  .entries({
    EditingWorkflow,
    OpenFormStep,
    LinkRelationStep,
    PickProjectLayerFeaturesStep,
    CopyFeaturesFromOtherProjectLayerStep,
    AddTableFeatureStep,
    OpenTableStep,
    AddFeatureStep,
  })
  .forEach(([k, v]) => console.assert(undefined !== v, `${k} is undefined`));

const { GUI }            = g3wsdk.gui;
const { tPlugin:t }      = g3wsdk.core.i18n;
const { Layer }          = g3wsdk.core.layer;
const { WorkflowsStack } = g3wsdk.core.workflow;

// what we can do with each type of relation element
const RELATIONTOOLS = {
  default: ['editattributes', 'deletefeature'],
  'table' : [],
  'Point': ['movefeature'],
  'LineString': ['movevertex'],
  'Polygon': ['movefeature', 'movevertex']
};

const RelationService = function(layerId, options = {}) {
  // layerId is id of the parent of relation
  this._parentLayerId = layerId;
  this._parentWorkFlow = this.getCurrentWorkflow();
  this._parentLayer = this._parentWorkFlow.getLayer();
  /**
   * relation: contain information about relation from parent layer and current relation layer (ex. child, fields, relationid, etc....)
   * relations: Array of relations object id and fields linked to current parent feature that is in editing
   *
   */
  const {relation, relations} = options;
  this.relation = relation;
  // relation feature link to current parent feature
  this.relations = relations;
  //editing service (main service of plugin)
  this._editingService;
  this._isExternalFieldRequired = false;
  // this._relationLayerId is layer id of relation layer
  this._relationLayerId = this.relation.child === this._parentLayerId ?
    this.relation.father :
    this.relation.child;
  // layer in relation
  const relationLayer = this.getLayer();
  this._layerType = relationLayer.getType();
  //get type of relation
  const relationLayerType = this._layerType === Layer.LayerTypes.VECTOR ?
    relationLayer.getGeometryType() :
    Layer.LayerTypes.TABLE;
  //
  const { ownField: fatherRelationField} = this.getEditingService()._getRelationFieldsFromRelation({
    layerId: this._parentLayerId,
    relation: this.relation
  });

  // Store father relation fields editable and pk
  this._fatherRelationFields = {
    //get editable fields
    editable: fatherRelationField.filter(fRField => this._parentLayer.isEditingFieldEditable(fRField)),
    //check if father field is a pk and is not editable
    pk: fatherRelationField.find(fRField => {
      return this._parentLayer.isPkField(fRField) && !this._parentLayer.isEditingFieldEditable(fRField)
    }),
  }
  //check if  external fields
  this._isExternalFieldRequired = this._checkIfExternalFieldRequired();
  // check if parent field is editable. If not get the id of parent feature so the server can generate the right value
  // to fill the field with relation layer feature when commit

  this._currentParentFeatureRelationFieldsValue = fatherRelationField.reduce((accumulator, fField) => {
    accumulator[fField] = fField === this._fatherRelationFields.pk ? //check if isPk
      this.getCurrentWorkflowData().feature.getId() :
      this.getCurrentWorkflowData().feature.get(fField);
    return accumulator;
  }, {})


  ///////////////////////////////////////
  this._relationTools = [];
  this._add_link_workflow = null;
  //get editing constraint type
  this.capabilities = {
    parent: this._parentLayer.getEditingCapabilities(),
    relation: this._parentLayer.getEditingCapabilities()
  };
  //check if relationLayer is a TABLE Layer and with capabilities value check add tools
  if (relationLayerType === Layer.LayerTypes.TABLE) {
    (this.capabilities.relation.find(capability => capability === 'delete_feature') !== undefined) && this._relationTools.push({
      state: {
        icon: 'deleteTableRow.png',
        id: 'deletefeature',
        name: "editing.tools.delete_feature"
      }
    });
    (this.capabilities.relation.find(capability => capability === 'change_attr_feature') !== undefined) && this._relationTools.push({
      state: {
        icon: 'editAttributes.png',
        id: 'editattributes',
        name: "editing.tools.update_feature"
      }
    })
  } else {
    const allrelationtools = this.getEditingService().getToolBoxById(this._relationLayerId).getTools();
    allrelationtools.forEach(tool => {
      if (_.concat(RELATIONTOOLS[relationLayerType], RELATIONTOOLS.default).indexOf(tool.getId()) !== -1)
        this._relationTools.push(_.cloneDeep(tool));
    });
  }

  this._add_link_workflow = ({
    [Layer.LayerTypes.TABLE]: {

      /** ORIGINAL SOURCE: g3w-client-plugin-editing/workflows/edittableworkflow.js@v3.7.1 */
      link(options = {}) {
        const w = new EditingWorkflow({
          ...options,
          backbuttonlabel: 'plugins.editing.form.buttons.save_and_back_table',
          steps: [ new OpenTableStep() ],
        });
        w.YOU_SHOULD_REALLY_GIVE_ME_A_NAME_2 = true;
        return w;
      },

      /** ORIGINAL SOURCE: g3w-client-plugin-editing/workflows/addtablefeatureworkflow.js@v3.7.1 */
      add(options = {}) {
        return new EditingWorkflow({
          ...options,
          steps: [
            new AddTableFeatureStep(),
            new OpenFormStep(),
          ],
        });
      },

    },
    [Layer.LayerTypes.VECTOR]: {

      /** ORIGINAL SOURCE: g3w-client-plugin-editing/workflows/linkrelationworkflow.js@v3.7.1 */
      link() {
        return new EditingWorkflow({
          steps: [
            new LinkRelationStep()
          ]
        });
      },

      /** ORIGINAL SOURCE: g3w-client-plugin-editing/workflows/addfeatureworkflow.js@v3.7.1 */
      add(options = {}) {
        const w = new EditingWorkflow({
          ...options,
          steps: [
            new AddFeatureStep(options),
            new OpenFormStep(options),
          ],
        });
        w.addToolsOfTools({ step: options.steps[0], tools: ['snap', 'measure'] });
        return w;
      },

      /** ORIGINAL SOURCE: g3w-client-plugin-editing/workflows/selectandcopyfeaturesfromotherlayerworkflow.js@v3.7.1 */
      selectandcopy(options) {
        return new EditingWorkflow({
          steps: [
            new PickProjectLayerFeaturesStep(options),
            new CopyFeaturesFromOtherProjectLayerStep(options),
            new OpenFormStep(options),
          ],
          registerEscKeyEvent: true,
        });
      },

    },
  })[this._layerType];

};

const proto = RelationService.prototype;

/**
 * Return editing capabilities
 * @returns {*|{parent: *, relation: *}}
 */
proto.getEditingCapabilities = function() {
  return this.capabilities;
};

/**
 *
 * @returns {[]}
 */
proto.getRelationTools = function() {
  return this._relationTools
};

/**
 *
 * @param relation
 * @returns {*}
 * @private
 */
proto._highlightRelationSelect = function(relation) {
  const originalStyle = this.getLayer().getEditingLayer().getStyle();
  const geometryType = this.getLayer().getGeometryType();
  let style;
  if (geometryType === 'LineString' || geometryType === 'MultiLineString') {
    style = new ol.style.Style({
      stroke: new ol.style.Stroke({
        color: 'rgb(255,255,0)',
        width: 4
      })
    });
  } else if (geometryType === 'Point' || geometryType === 'MultiPoint') {
    style = new ol.style.Style({
      image: new ol.style.Circle({
        radius: 8,
        fill: new ol.style.Fill({
          color: 'rgb(255,255,0)'
        })
      })
    });
  } else if (geometryType === 'MultiPolygon' || geometryType === 'Polygon') {
    style = new ol.style.Style({
      stroke: new ol.style.Stroke({
        color: 'rgb(255,255,0)',
        width: 4
      }),
      fill: new ol.style.Fill({
        color: 'rgba(255, 255, 0, 0.5)'
      })
    });
  }

  relation.setStyle(style);

  return originalStyle;
};

/**
 *
 * @param relationtool
 * @param index
 * @returns {Promise<unknown>}
 */
proto.startTool = function(relationtool, index) {
  if (relationtool.state.id === 'movefeature') {
    GUI.hideContent(true);
  }
  return new Promise((resolve, reject) => {
    const toolPromise = (this._layerType === Layer.LayerTypes.VECTOR) && this.startVectorTool(relationtool, index) ||
      (this._layerType === Layer.LayerTypes.TABLE) && this.startTableTool(relationtool, index);
    toolPromise
      .then(() => {
        this.emitEventToParentWorkFlow();
        resolve();
      })
      .fail(err => reject(err))
      .always(() => GUI.hideContent(false));
  })
};

/**
 * force parent workflow form service to update
 */
proto.forceParentsFromServiceWorkflowToUpdated = function() {
  const workflowParents = WorkflowsStack.getParents() || [this.getCurrentWorkflow()];
  workflowParents.forEach(workflow => {
    //check if workflow has service (form service)
    if (workflow.getContextService()) {
      workflow
        .getContextService()
        .setUpdate(true, {force: true})
    }
  });
};

/**
 * Method to start table tool
 * @param relationtool
 * @param index
 * @returns {*}
 */
proto.startTableTool = function(relationtool, index) {
  const d = $.Deferred();
  const relation = this.relations[index];
  const featurestore = this.getLayer().getEditingSource();
  const relationfeature = featurestore.getFeatureById(relation.id);
  const options = this._createWorkflowOptions({
    features: [relationfeature]
  });
  // delete feature
  if (relationtool.state.id === 'deletefeature') {
    GUI.dialog.confirm(t("editing.messages.delete_feature"), result => {
      if (result) {
        this.getCurrentWorkflowData().session.pushDelete(this._relationLayerId, relationfeature);
        this.relations.splice(index, 1);
        this.getEditingService().removeRelationLayerUniqueFieldValuesFromFeature({
          layerId: this._relationLayerId,
          relationLayerId: this._parentLayerId,
          feature: relationfeature
        });
        featurestore.removeFeature(relationfeature);
        this.forceParentsFromServiceWorkflowToUpdated();
        d.resolve(result);
      } else d.reject(result);
    });
  }
  //edit attributes feature
  if (relationtool.state.id === 'editattributes') {
    /** ORIGINAL SOURCE: g3w-client-plugin-editing/workflows/edittablefeatureworkflow.js@v3.7.1 */
    const workflow = new EditingWorkflow({ steps: [ new OpenFormStep() ] });
    workflow.start(options)
      .then(() => {
        //get relation layer fields
        this._getRelationFieldsValue(relationfeature)
          .forEach(_field => {
            relation.fields.forEach(field => {
              if (field.name === _field.name) {
                //in case of sync feature get data value of sync feature
                field.value = _field.value;
              }
            })
          });
        d.resolve(true);
      })
      .fail(err => d.reject(false))
      .always(() => {
        workflow.stop()
      })
  }
  return d.promise()
};

/**
 *
 * @param relationtool
 * @param index
 * @returns {*}
 */
proto.startVectorTool = function(relationtool, index) {
  const d = $.Deferred();
  const relation = this.relations[index];
  const relationfeature = this._getRelationFeature(relation.id);
  GUI.setModal(false);
  const options = this._createWorkflowOptions({
    features: [relationfeature]
  });
  
  const workflow = Object.create(Object.getPrototypeOf(relationtool.getOperator()))
  const originalStyle = this._highlightRelationSelect(relationfeature);

  workflow.bindEscKeyUp(() => relationfeature.setStyle(this._originalLayerStyle));

  (
    workflow.YOU_SHOULD_REALLY_GIVE_ME_A_NAME_1 &&
    workflow.startFromLastStep(options)
    ||
    workflow.start(options)
  )
    .then(outputs => {
      if (relationtool.getId() === 'deletefeature') {
        relationfeature.setStyle(this._originalLayerStyle);
        this.getCurrentWorkflowData().session.pushDelete(this._relationLayerId, relationfeature);
        this.relations.splice(index, 1);
        this.forceParentsFromServiceWorkflowToUpdated();
      }
      if (relationtool.getId() === 'editattributes') {
        const fields = this._getRelationFieldsValue(relationfeature);
        fields.forEach(_field => relation.fields.forEach(field => {
          if (field.name === _field.name) field.value = _field.value})
        );
      }
      d.resolve(outputs)
    })
    .fail(err => d.reject(err))
    .always(() => {
      workflow.stop();
      GUI.hideContent(false);
      workflow.unbindEscKeyUp();
      GUI.setModal(true);
      relationfeature.setStyle(originalStyle);
    });

  return d.promise()
};

/**
 *
 * @returns {*}
 */
proto.getLayer = function() {
  return this.getEditingService().getLayerById(this._relationLayerId);
};

/**
 *
 * @returns {*}
 */
proto.getEditingLayer = function() {
  return this.getEditingService().getEditingLayer(this._relationLayerId);
};

/**
 *
 * @returns {*|EditingService|{}}
 */
proto.getEditingService = function() {
  this._editingService = this._editingService || require('./editingservice');
  return this._editingService;
};

/**
 * function that change the relation field value when and if parent change the value of relation field 
 * @param input
 */
proto.updateExternalKeyValueRelations = function(input) {
  const session = this.getEditingService().getToolBoxById(this._relationLayerId).getSession();
  //ownFiled is the field of relation feature link to parent feature layer
  const {ownField, relationField} = this.getEditingService()._getRelationFieldsFromRelation({
    layerId: this._relationLayerId,
    relation: this.relation
  });
  // get if parent form input that is changing
  // is the field in relation of the current feature relation Layer
  if (this._fatherRelationFields.editable.length > 0 && relationField.find(rField => rField === input.name)) {
    // change currentParentFieature relation value
    this._currentParentFeatureRelationFieldsValue[input.name] = input.value;
    // loop all features relations
    this.relations.forEach(relation => {
      //get relation fields
      const fields = relation.fields;
      // field relation field of current relation feature
      const field = fields.find(field => ownField.indexOf(field.name) !== -1);
      //if field is find
      if (field) {
        field.value = this._currentParentFeatureRelationFieldsValue[field.name];
        relation = this._getRelationFeature(relation.id);
        const originalRelation = relation.clone();
        relation.set(field.name, input.value);
        if (!relation.isNew()) {
          session.pushUpdate(this._relationLayerId, relation, originalRelation);
        }
      }
    })
  }
};

/**
 *
 * @param relation
 * @returns {*}
 * @private
 */
proto._getRelationFieldsValue = function(relation) {
  return this.getLayer()
    .getFieldsWithValues(relation, {relation: true});
};

/**
 *
 * @param relation
 * @returns {{id: *, fields: *}}
 * @private
 */
proto._createRelationObj = function(relation) {
  return {
    fields: this._getRelationFieldsValue(relation),
    id: relation.getId()
  }
};

/**
 *
 * @param type
 * @param options
 */
proto.emitEventToParentWorkFlow = function(type, options={}) {
  //type=set-main-component event name to set table parent visible
  if (type) {
    this._parentWorkFlow.getContextService().getEventBus().$emit(type, options);
  }
};

/**
 *
 * @param type
 * @returns {*|string}
 * @private
 */
proto._getRelationAsFatherStyleColor = function(type) {
  const fatherLayer = this.getEditingLayer(this._parentLayerId);
  const fatherLayerStyle = fatherLayer.getStyle();
  let fatherLayerStyleColor;
  switch (type) {
    case 'Point':
      fatherLayerStyleColor = fatherLayerStyle.getImage() && fatherLayerStyle.getImage().getFill();
      break;
    case 'Line':
      fatherLayerStyleColor = fatherLayerStyle.getStroke() || fatherLayerStyle.getFill();
      break;
    case 'Polygon':
      fatherLayerStyleColor = fatherLayerStyle.getFill() || fatherLayerStyle.getStroke();
      break;
  }
  return (
    (
      fatherLayerStyleColor &&
      fatherLayerStyleColor.getColor()
    ) ||
    '#000000'
  );
};

/**
 * Add Relation from project layer
 * @param layer
 */
proto.addRelationFromOtherLayer = function({layer, external}){
  let workflow;
  let isVector = false;
  if (external || layer.isGeoLayer() ) {
    isVector = true;
    workflow = new this._add_link_workflow.selectandcopy({
      copyLayer: layer,
      isVector,
      external,
      help: 'editing.steps.help.copy',
    });
  }

  this.runAddRelationWorkflow({
    workflow,
    isVector
  })
};

/**
 * add relation method
 */
proto.addRelation = function() {
  this.runAddRelationWorkflow({
    workflow: new this._add_link_workflow.add(),
    isVector: this._layerType === Layer.LayerTypes.VECTOR
  })
};

/**
 * Common method to add a relation
 */
proto.runAddRelationWorkflow = function({workflow, isVector=false}={}){
  if (isVector) {
    GUI.setModal(false);
    GUI.hideContent(true);
  }
  const options = this._createWorkflowOptions();
  const session = options.context.session;
  const {ownField, relationField} = this.getEditingService()._getRelationFieldsFromRelation({
    layerId: this._relationLayerId,
    relation: this.relation
  });

  const { parentFeature } = options;
  const promise =  workflow.start(options);
  isVector && workflow.bindEscKeyUp();
  promise
    .then(outputs => {
      const {newFeatures, originalFeatures} = outputs.relationFeatures;

      /**
       * Set Relation child feature value
       * @param oIndex
       * @param value
       */
      const setRelationFieldValue = ({oIndex, value}) => {
        newFeatures.forEach((newFeature, index) => {
          const originalFeature = originalFeatures[index];
          newFeature.set(ownField[oIndex], value);
          if (parentFeature.isNew()) {
            originalFeature.set(ownField[oIndex], value);
          }
          this.getLayer().getEditingSource().updateFeature(newFeature);
          session.pushUpdate(this._relationLayerId, newFeature, originalFeature);
        })
      };
      Object
        .entries(this._currentParentFeatureRelationFieldsValue)
        .forEach(([field, value]) => {
          setRelationFieldValue({
            oIndex: relationField.findIndex(rField => field === rField),
            value
          });
        })
      //check if parent features is new and if parent layer has editable fields
      if (parentFeature.isNew() && this._fatherRelationFields.editable.length > 0) {
        const keyRelationFeatureChange = parentFeature.on('propertychange', evt => {
          if (parentFeature.isNew()) {
            //check if input is relation field
            if (relationField.indexOf(evt.key) !== -1) {
              //get input value
              const value = evt.target.get(evt.key);
              //set value to relation field
              setRelationFieldValue({
                oIndex: relationField.findIndex(rField => evt.key === rField),
                value
              });
            }
          } else {
            ol.Observable.unByKey(keyRelationFeatureChange);
          }
        })
      }
      newFeatures.forEach(newFeature => {
        this.relations.push(this._createRelationObj(newFeature));
      });

      this.emitEventToParentWorkFlow();
    })
    .fail(inputs => {

      if (inputs && inputs.relationFeatures) {
        /**
         * needed in case of save all pressed on openformtask
         */
        const {relationFeatures: { newFeatures=[] } } = inputs;
        newFeatures.forEach(newFeature => {
          this.relations.push(this._createRelationObj(newFeature));
        });
      }

      session.rollbackDependecies([this._relationLayerId])
    })
    .always(() => {

      workflow.stop();
      if (isVector) {

        workflow.unbindEscKeyUp();
        GUI.hideContent(false);
        GUI.setModal(true);

      }
    })
};

/**
 * Link relation (bind) to parent feature layer
 */
proto.linkRelation = function() {
  const isVector = this._layerType === Layer.LayerTypes.VECTOR;
  const workflow = new this._add_link_workflow.link();
  const options = this._createWorkflowOptions();
  const session = options.context.session;
  const {ownField, relationField} = this.getEditingService()._getRelationFieldsFromRelation({
    layerId: this._relationLayerId,
    relation: this.relation
  });

  //add options to exclude features from link
  options.context.excludeFeatures = relationField.reduce((accumulator, rField, index) => {
    accumulator[ownField[index]] = this._currentParentFeatureRelationFieldsValue[rField];
    return accumulator;
  }, {});


  //check if a vector layer
  if (isVector) {
    GUI.setModal(false);
    GUI.hideContent(true);
    options.context.style = this.getUnlinkedStyle();
  }

  const {feature} = this.getCurrentWorkflowData();

  const dependencyOptions = {
    relations: [this.relation],
    feature,
    operator: 'not',
    filterType: isVector ? 'bbox' : 'fid'
  };
  const getRelationFeatures = () => this.getEditingService().getLayersDependencyFeatures(this._parentLayerId, dependencyOptions);

  let preWorkflowStart;

  if (isVector) {
    const mapService = this.getEditingService().getMapService();
    options.context.beforeRun = async () => {
      //show map spinner
      mapService.showMapSpinner();

      await new Promise((resolve) => setTimeout(resolve));

      await getRelationFeatures();
      //hide mapSpinner
      mapService.hideMapSpinner();

      GUI.showUserMessage({
        type: 'info',
        size: 'small',
        message: t('editing.messages.press_esc'),
        closable: false
      })
    };

    preWorkflowStart = new Promise((resolve) => {

      workflow.bindEscKeyUp();

      resolve({
        promise: workflow.start(options),
        showContent: true
      })
    });
  } else {

    preWorkflowStart = new Promise((resolve) => {
      getRelationFeatures()
        .then(() => resolve({}))
    });
  }

  preWorkflowStart.then(({promise, showContent=false}={})=> {
    let linked = false;

    promise = promise || workflow.start(options);

    promise
      .then(outputs => {

        if (outputs.features.length > 0) {

          //loop on features selected
          outputs.features.forEach(relation => {

            if (undefined === this.relations.find(rel => rel.id === relation.getId())) {

              linked = linked || true;

              const originalRelation = relation.clone();

              Object
                .entries(this._currentParentFeatureRelationFieldsValue)
                .forEach(([field, value]) => {
                  relation.set(ownField[relationField.findIndex(rField => field === rField)], value);
                })

              this.getCurrentWorkflowData()
                .session
                .pushUpdate(this._relationLayerId , relation, originalRelation);

              this.relations.push(this._createRelationObj(relation));

              this.emitEventToParentWorkFlow();

            } else {
              // in case already present
              GUI.notify.warning(t("editing.relation_already_added"));
            }
          });
        }
      })
      .fail(() => session.rollbackDependecies([this._relationLayerId]))
      .always(() => {
        if (showContent) {
          GUI.closeUserMessage();
          GUI.hideContent(false);
          workflow.unbindEscKeyUp();
        }
        if (linked) {
          this.forceParentsFromServiceWorkflowToUpdated();
        }
        workflow.stop();
    });
  })
};

/**
 * Check if relation layer fields has at least one field required
 * @returns {Boolean}
 * @private
 */
proto._checkIfExternalFieldRequired = function() {
  // own Fields is relation Fields array of Relation Layer
  const { ownField } = this.getEditingService()._getRelationFieldsFromRelation({
    layerId:  this._relationLayerId,
    relation: this.relation,
  });

  //check if at least one filed is required
  return ownField.some(field => this.getEditingService().isFieldRequired(this._relationLayerId, field));
};

/**
 *
 * @returns {boolean|*}
 */
proto.isRequired = function() {
  return this._isExternalFieldRequired;
};

/**
 *
 * @param featureId
 * @returns {*}
 * @private
 */
proto._getRelationFeature = function(featureId) {
  return this.getLayer().getEditingSource().getFeatureById(featureId);
};

/**
 * Get value from feature if layer has key value
 * 
 * @since g3w-client-plugin-editing@v3.7.0
 */
proto.getRelationFeatureValue = function(featureId, property) {
  return this
    .getEditingService()
    .getFeatureTableFieldValue({
      layerId: this._relationLayerId,
      feature: this._getRelationFeature(featureId),
      property,
    });
};

/**
 * Method to unlink relation
 * @param index
 * @param dialog
 * @returns JQuery Promise
 */
proto.unlinkRelation = function(index, dialog=true) {
  const d = $.Deferred();
  const {ownField} = this.getEditingService()._getRelationFieldsFromRelation({
    layerId: this._relationLayerId,
    relation: this.relation
  });
  const unlink = () => {
    const relation = this.relations[index];
    const feature = this.getLayer().getEditingSource().getFeatureById(relation.id);
    const originalRelation = feature.clone();
    //loop on ownField (Array field child relation)
    ownField.forEach(oField => feature.set(oField, null))

    this.getCurrentWorkflowData().session.pushUpdate(this._relationLayerId, feature, originalRelation);
    this.relations.splice(index, 1);
    this.forceParentsFromServiceWorkflowToUpdated();
    d.resolve(true);
  };
  if (dialog) {

    GUI.dialog.confirm(
      t("editing.messages.unlink_relation"),
      result => {
        if (result) {
          unlink() ;
        } else {
          d.reject(false);
        }
      }
    )
  } else {
    unlink();
  }

  return d.promise();
};

/**
 *
 * @returns {*}
 */
proto.getCurrentWorkflow = function() {
  return this.getEditingService().getCurrentWorkflow();
};

/**
 *
 * @returns {*}
 */
proto.getCurrentWorkflowData = function() {
  return this.getEditingService().getCurrentWorkflowData();
};

/**
 *
 * @param options
 * @returns {{parentFeature, inputs: {features: *[], layer: *}, context: {fatherValue: *, session: *, fatherField: *, excludeFields: *[]}}}
 * @private
 */
proto._createWorkflowOptions = function(options={}) {

  const {ownField, relationField} = this.getEditingService()._getRelationFieldsFromRelation({
    layerId: this._relationLayerId,
    relation: this.relation
  });
  const {
    feature: parentFeature,
    session
  } = this.getCurrentWorkflowData();

  const fatherValue = [];
  const fatherField = [];

  Object
    .entries(this._currentParentFeatureRelationFieldsValue)
    .forEach(([field, value]) => {
      const index = relationField.findIndex(rField => field === rField);
      fatherField.push(ownField[index]);
      fatherValue.push(value);
  })

  const workflow_options = {
    parentFeature, //get parent feature
    context: {
      session, //get parent workfow
      excludeFields: ownField, //ownField is an Array to exclude
      fatherValue,
      fatherField
    },
    inputs: {
      features: options.features || [],
      layer: this.getLayer()
    }
  };

  return workflow_options;
};

/**
 *
 * @returns {ol.style.Style}
 */
proto.getUnlinkedStyle = function() {
  let style;
  const geometryType = this.getLayer().getGeometryType();
  switch (geometryType) {
    case 'Point' || 'MultiPoint':
      style = new ol.style.Style({
        image: new ol.style.Circle({
          radius: 8,
          fill: new ol.style.Fill({
            color: this._getRelationAsFatherStyleColor('Point')
          }),
          stroke: new ol.style.Stroke({
            width: 5,
            color:  'yellow'
          })
        })
      });
      break;
    case 'Line' || 'MultiLine':
      style = new ol.style.Style({
        fill: new ol.style.Fill({
          color: this._getRelationAsFatherStyleColor('Line')
        }),
        stroke: new ol.style.Stroke({
          width: 5,
          color: 'yellow'
        })
      });
      break;
    case 'Polygon' || 'MultiPolygon':
      style =  new ol.style.Style({
        stroke: new ol.style.Stroke({
          color: 'yellow' ,
          width: 5
        }),
        fill: new ol.style.Fill({
          color: this._getRelationAsFatherStyleColor('Polygon'),
          opacity: 0.5
        })
      })
  }

  return style;
};

/**
 *
 * @param relation
 * @returns {*[]}
 */
proto.relationFields = function(relation) {
  return relation.fields.map(({label, name, value}) => ({
    name,
    label,
    value
  }))
};

module.exports = RelationService;
