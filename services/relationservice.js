const {GUI} = g3wsdk.gui;
const t = g3wsdk.core.i18n.tPlugin;
const {Layer} = g3wsdk.core.layer;
const {WorkflowsStack} = g3wsdk.core.workflow;

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
  this._relationLayerId = this.relation.child === this._parentLayerId ? this.relation.father : this.relation.child;
  // layer in relation
  const relationLayer = this.getLayer();
  this._layerType = relationLayer.getType();
  //get type of relation
  const relationLayerType = this._layerType === Layer.LayerTypes.VECTOR ? relationLayer.getGeometryType() : Layer.LayerTypes.TABLE;
  //
  const { ownField: fatherRelationField} = this.getEditingService()._getRelationFieldsFromRelation({
    layerId: this._parentLayerId,
    relation: this.relation
  });
  // check if father is editable field. It is useful to fill relation filed of relation feature
  this._isFatherFieldEditable = this._parentLayer.isEditingFieldEditable(fatherRelationField);
  this._isExternalFieldRequired = this._checkIfExternalFieldRequired();
  // check if parent field is editable. If not get the id of parent feature so the server can genratate the right value
  // to fill the field of relation layer feature when commit
  this._currentParentFeatureRelationFieldValue = this._isFatherFieldEditable ?
      this.getCurrentWorkflowData().feature.get(fatherRelationField) :
      this.getCurrentWorkflowData().feature.getId();
  ///////////////////////////////////////
  this._relationTools = [];
  this._add_link_workflow = null;
  //get editing contstraint type
  this.capabilities= {
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
  this._setAddLinkWorkflow();
};

const proto = RelationService.prototype;

proto.getEditingCapabilities = function(){
  return this.capabilities;
};

proto._setAddLinkWorkflow = function() {
  const add_link_workflow = {
    [Layer.LayerTypes.VECTOR]: {
      link: require('../workflows/linkrelationworkflow'),
      add: require('../workflows/addfeatureworkflow'),
      selectandcopy: require('../workflows/selectandcopyfeaturesfromotherlayerworkflow')
    },
    [Layer.LayerTypes.TABLE]: {
      link: require('../workflows/edittableworkflow'),
      add: require('../workflows/addtablefeatureworkflow')
    }
  };
  this._add_link_workflow = add_link_workflow[this._layerType];
};

proto._getLinkFeatureWorkflow = function() {
  return new this._add_link_workflow.link();
};

proto._getAddFeatureWorkflow = function() {
  return new this._add_link_workflow.add();
};

proto._getSelectCopyWorkflow = function(options={}){
  return new this._add_link_workflow.selectandcopy(options)
};

proto.getRelationTools = function() {
  return this._relationTools
};

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

proto.startTool = function(relationtool, index) {
  if (relationtool.state.id === 'movefeature') GUI.hideContent(true);
  return new Promise((resolve, reject) => {
    const toolPromise = (this._layerType === Layer.LayerTypes.VECTOR) && this.startVectorTool(relationtool, index) ||
      (this._layerType === Layer.LayerTypes.TABLE) && this.startTableTool(relationtool, index);
    toolPromise
      .then(() => {
        this.emitEventToParentWorkFlow();
        resolve();
      })
      .fail(err => reject(err))
      .always(()=>GUI.hideContent(false));
  })
};

/**
 * force parent workflow form service to be update
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
  if (relationtool.state.id === 'editattributes') {
    const EditTableFeatureWorkflow = require('../workflows/edittablefeatureworkflow');
    const workflow = new EditTableFeatureWorkflow();
    workflow.start(options)
      .then(() => {
        const fields = this._getRelationFieldsValue(relationfeature);
        fields.forEach(_field => {
          relation.fields.forEach(field => {
            if (field.name === _field.name) field.value = _field.value;
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

proto.startVectorTool = function(relationtool, index) {
  const d = $.Deferred();
  const relation = this.relations[index];
  const relationfeature = this._getRelationFeature(relation.id);
  const workflows = {
    ModifyGeometryVertexWorkflow: require('../workflows/modifygeometryvertexworkflow'),
    MoveFeatureWorkflow : require('../workflows/movefeatureworkflow'),
    DeleteFeatureWorkflow : require('../workflows/deletefeatureworkflow'),
    EditFeatureAttributesWorkflow : require('../workflows/editfeatureattributesworkflow')
  };
  GUI.setModal(false);
  const options = this._createWorkflowOptions({
    features: [relationfeature]
  });
  const ClassWorkflow = Object.values(workflows).find(classworkflow => {
    return relationtool.getOperator() instanceof classworkflow
  });
  const workflow = new ClassWorkflow();
  const originalStyle = this._highlightRelationSelect(relationfeature);
  const promise =(workflow instanceof workflows.DeleteFeatureWorkflow || workflow instanceof workflows.EditFeatureAttributesWorkflow ) && workflow.startFromLastStep(options)
    || workflow.start(options);
  workflow.bindEscKeyUp(() => relationfeature.setStyle(this._originalLayerStyle));
  promise.then(outputs => {
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

proto.getLayer = function() {
  return this.getEditingService().getLayerById(this._relationLayerId);
};

proto.getEditingLayer = function() {
  return this.getEditingService().getEditingLayer(this._relationLayerId);
};

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
  // check if parent form input that is changing is the field in relation of the current feature relation Layer
  if (this._isFatherFieldEditable && input.name === relationField) {
    // chnage currentParentFieature relation value
    this._currentParentFeatureRelationFieldValue = input.value;
    // loop all features relations
    this.relations.forEach(relation => {
      const fields = relation.fields;
      // field relation field of current relation feature
      const field = fields.find(field => field.name === ownField);
      if (field) field.value = this._currentParentFeatureRelationFieldValue;
      relation = this._getRelationFeature(relation.id);
      const originalRelation = relation.clone();
      relation.set(ownField, input.value);
      if (!relation.isNew()) session.pushUpdate(this._relationLayerId, relation, originalRelation);
    })
  }
};

proto._getRelationFieldsValue = function(relation) {
  const layer = this.getLayer();
  return layer.getFieldsWithValues(relation, {
    relation: true
  });
};

proto._createRelationObj = function(relation) {
  return {
    fields: this._getRelationFieldsValue(relation),
    id: relation.getId()
  }
};

proto.emitEventToParentWorkFlow = function(type, options={}) {
  //type=set-main-component event name to set table parent visible
  type && this._parentWorkFlow.getContextService().getEventBus().$emit(type, options)
};

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
  return fatherLayerStyleColor && fatherLayerStyleColor.getColor() || '#000000';
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
    workflow = this._getSelectCopyWorkflow({
      copyLayer: layer,
      isVector,
      external
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
  const isVector = this._layerType === Layer.LayerTypes.VECTOR;
  const workflow = this._getAddFeatureWorkflow();
  this.runAddRelationWorkflow({
    workflow,
    isVector
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
      const setRelationFieldValue = value =>{
        newFeatures.forEach((newFeature, index) =>{
          const originalFeature = originalFeatures[index];
          newFeature.set(ownField, value);
          if (parentFeature.isNew()) originalFeature.set(ownField, value);
          this.getLayer().getEditingSource().updateFeature(newFeature);
          session.pushUpdate(this._relationLayerId, newFeature, originalFeature);
        })
      };
      setRelationFieldValue(this._currentParentFeatureRelationFieldValue);
      if (parentFeature.isNew() && this._isFatherFieldEditable) {
        const keyRelationFeatureChange = parentFeature.on('propertychange', evt => {
          if (parentFeature.isNew()) {
            if (evt.key === relationField) {
              const value = evt.target.get(relationField);
              setRelationFieldValue(value, true);
            }
          } else ol.Observable.unByKey(keyRelationFeatureChange);
        })
      }
      newFeatures.forEach(newFeature =>{
        const newRelation = this._createRelationObj(newFeature);
        this.relations.push(newRelation);
      });
      this.emitEventToParentWorkFlow();
    })
    .fail((inputs) => {
      if (inputs && inputs.relationFeatures) {
        /**
         * needed in case of save all pressed on openformtask
         */
        const {relationFeatures:{newFeatures=[]}} = inputs;
        newFeatures.forEach(newFeature =>{
          const newRelation = this._createRelationObj(newFeature);
          this.relations.push(newRelation);
        });
      }
      session.rollbackDependecies([this._relationLayerId])
    })
    .always(()=>{
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
  if (isVector) {
    GUI.setModal(false);
    GUI.hideContent(true);
  }
  const workflow = this._getLinkFeatureWorkflow();
  const options = this._createWorkflowOptions();
  const session = options.context.session;
  const {ownField} = this.getEditingService()._getRelationFieldsFromRelation({
    layerId: this._relationLayerId,
    relation: this.relation
  });
  //add options to exclude features
  options.context.exclude = {
    value: this._currentParentFeatureRelationFieldValue,
    field: ownField
  };
  if (isVector) options.context.style = this.getUnlinkedStyle();
  const feature = this.getCurrentWorkflowData().feature;
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
      mapService.showMapSpinner();
      await new Promise((resolve) =>{
        setTimeout(()=>{
          resolve();
        })
      });
      await getRelationFeatures();
      mapService.hideMapSpinner();
      GUI.showUserMessage({
        type: 'info',
        size: 'small',
        message: t('editing.messages.press_esc'),
        closable: false
      })
    };
    preWorkflowStart = new Promise((resolve)=> {
      workflow.bindEscKeyUp();
      const promise = workflow.start(options);
      resolve({
        promise,
        showContent: true
      })
    });
  } else preWorkflowStart = new Promise((resolve) => {
    getRelationFeatures()
      .then(()=>{
        resolve({})
      })
  });

  preWorkflowStart.then(({promise, showContent=false}={})=> {
    let linked = false;
    promise = promise || workflow.start(options);
    promise.then(outputs => {
      if (outputs.features.length) {
        outputs.features.forEach(relation => {
          const relationAlreadyLinked = this.relations.find(rel => rel.id === relation.getId());
          if (!relationAlreadyLinked) {
            linked = linked || true;
            const originalRelation = relation.clone();
            relation.set(ownField, this._currentParentFeatureRelationFieldValue);
            this.getCurrentWorkflowData().session.pushUpdate(this._relationLayerId , relation, originalRelation);
            this.relations.push(this._createRelationObj(relation));
            this.emitEventToParentWorkFlow();
          } else GUI.notify.warning(t("editing.relation_already_added"));
        });
      }
    }).fail(err => {
      session.rollbackDependecies([this._relationLayerId]);
    }).always(() =>{
      if (showContent) {
        GUI.closeUserMessage();
        GUI.hideContent(false);
        workflow.unbindEscKeyUp();
      }
      linked && this.forceParentsFromServiceWorkflowToUpdated();
      workflow.stop();
    });
  })
};

/**
 *
 * @returns {*}
 * @private
 */
proto._checkIfExternalFieldRequired = function() {
  // own Field is relation Field of Relation Layer
  const {ownField} = this.getEditingService()._getRelationFieldsFromRelation({
    layerId: this._relationLayerId,
    relation: this.relation
  });
  return this.getEditingService().isFieldRequired(this._relationLayerId, ownField);
};

proto.isRequired = function() {
  return this._isExternalFieldRequired;
};

proto._getRelationFeature = function(featureId) {
  const layer = this.getLayer();
  return layer.getEditingSource().getFeatureById(featureId);
};

proto.unlinkRelation = function(index, dialog=true) {
  const d = $.Deferred();
  const {ownField} = this.getEditingService()._getRelationFieldsFromRelation({
    layerId: this._relationLayerId,
    relation: this.relation
  });
  const unlink = () =>{
    const relation = this.relations[index];
    const feature = this.getLayer().getEditingSource().getFeatureById(relation.id);
    const originalRelation = feature.clone();
    feature.set(ownField, null);
    this.getCurrentWorkflowData().session.pushUpdate(this._relationLayerId, feature, originalRelation);
    this.relations.splice(index, 1);
    this.forceParentsFromServiceWorkflowToUpdated();
    d.resolve(true);
  };
  if (dialog) {
    GUI.dialog.confirm(t("editing.messages.unlink_relation"), result => {
      if (result) unlink() ;
      else d.reject(false);
    })
  } else unlink();

  return d.promise();
};

proto.getCurrentWorkflow = function() {
  return this.getEditingService().getCurrentWorkflow();
};

proto.getCurrentWorkflowData = function() {
  return this.getEditingService().getCurrentWorkflowData();
};

proto._createWorkflowOptions = function(options={}) {
  const {ownField} = this.getEditingService()._getRelationFieldsFromRelation({
    layerId: this._relationLayerId,
    relation: this.relation
  });
  const workflow_options = {
    parentFeature: this.getCurrentWorkflowData().feature,
    context: {
      session: this.getCurrentWorkflowData().session,
      excludeFields: [ownField],
      fatherValue: this._currentParentFeatureRelationFieldValue, // field of father relation layer
      fatherField: ownField // value of father relationField
    },
    inputs: {
      features: options.features || [],
      layer: this.getLayer()
    }
  };
  return workflow_options;
};

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

proto.relationFields = function(relation) {
  const attributes = [];
  relation.fields.forEach(field => {
    const value = field.value;
    attributes.push({label: field.label, value})
  });
  return attributes
};

module.exports = RelationService;
