const GUI = g3wsdk.gui.GUI;
const t = g3wsdk.core.i18n.tPlugin;
const Layer = g3wsdk.core.layer.Layer;

// what we can do with each type of relation element
const RELATIONTOOLS = {
  default: ['editattributes', 'deletefeature'],
  'table' : [],
  'Point': ['movefeature'],
  'LineString': ['movevertex'],
  'Polygon': ['movefeature', 'movevertex']
};

const RelationService = function(layerId, options = {}) {
  this._mainLayerId = layerId;
  this.relation = options.relation;
  this.relations = options.relations;
  this._editingService;
  this._isExternalFieldRequired = false;
  this._layerId = this.relation.child === this._mainLayerId ? this.relation.father : this.relation.child;
  const { relationField} = this.getEditingService()._getRelationFieldsFromRelation({
    layerId: this._layerId,
    relation: this.relation
  });
  this._isFatherFieldEditable = this.getLayer().isEditingFieldEditable(relationField);
  this._layerType = this.getLayer().getType();
  this._relationTools = [];
  this._parentWorkFlow = this.getCurrentWorkflow();
  this._add_link_workflow = null; 
  this._isExternalFieldRequired = this._checkIfExternalFieldRequired();
  this._currentFeatureRelationFieldValue = this._isFatherFieldEditable ?
      this.getCurrentWorkflowData().feature.get(relationField) :
      this.getCurrentWorkflowData().feature.getId();
  //get type of relation
  const relationLayerType = this._layerType === Layer.LayerTypes.VECTOR ? this.getLayer().getGeometryType() : Layer.LayerTypes.TABLE;
  let allrelationtools;
  if (relationLayerType === Layer.LayerTypes.TABLE) {
    this._relationTools.push({
      state: {
        icon: 'deleteTableRow.png',
        id: 'deletefeature',
        name: "editing.tools.delete_feature"
      }
    });
    this._relationTools.push({
      state: {
        icon: 'editAttributes.png',
        id: 'editattributes',
        name: "editing.tools.update_feature"

      }
    })
  } else {
    allrelationtools = this.getEditingService().getToolBoxById(this._layerId).getTools();
    allrelationtools.forEach((tool) => {
      if(_.concat(RELATIONTOOLS[relationLayerType], RELATIONTOOLS.default).indexOf(tool.getId()) !== -1) {
        this._relationTools.push(_.cloneDeep(tool));
      }
    });
  }

  this._setAddLinkWorkflow();
};

const proto = RelationService.prototype;

proto._setAddLinkWorkflow = function() {
  const add_link_workflow = {
    [Layer.LayerTypes.VECTOR]: {
      link: require('../workflows/linkrelationworkflow'),
      add: require('../workflows/addfeatureworkflow')
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

proto.getRelationTools = function() {
  return this._relationTools
};

proto._highlightRelationSelect = function(relation) {
  const geometryType = this.getLayer().getGeometryType();
  let style;
  if (geometryType === 'LineString' || geometryType === 'MultiLineString') {
    style = new ol.style.Style({
      stroke: new ol.style.Stroke({
        color: 'rgb(255,255,0)',
        width: 4
      })
    });
  }
  else if (geometryType === 'Point' || geometryType === 'MultiPoint') {
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
};

proto.startTool = function(relationtool, index) {
  return new Promise((resolve, reject) => {
    const toolPromise = (this._layerType === Layer.LayerTypes.VECTOR) && this.startVectorTool(relationtool, index) ||
      (this._layerType === 'table') && this.startTableTool(relationtool, index);
    toolPromise.then(() => {
      this.emitEventToParentWorkFlow();
      resolve();
    }).fail((err) => {
      reject(err)
    })
  })
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
    GUI.dialog.confirm(t("editing.messages.delete_feature"), (result) => {
      if (result) {
        this.getCurrentWorkflowData().session.pushDelete(this._layerId, relationfeature);
        this.relations.splice(index, 1);
        featurestore.removeFeature(relationfeature);
        d.resolve(result);
      } else {
        d.reject(result);
      }
    });
  }
  if (relationtool.state.id === 'editattributes') {
    const EditTableFeatureWorkflow = require('../workflows/edittablefeatureworkflow');
    const workflow = new EditTableFeatureWorkflow();
    workflow.start(options)
      .then(() => {
        const fields = this._getRelationFieldsValue(relationfeature);
        fields.forEach((_field) => {
          relation.fields.forEach((field) => {
            if (field.name === _field.name)
              field.value = _field.value;
          })
        });
        d.resolve(true);
      })
      .fail((err) => {
        d.reject(false)
      })
      .always(() => {
        workflow.stop();
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
  this._highlightRelationSelect(relationfeature);
  const promise =(workflow instanceof workflows.DeleteFeatureWorkflow || workflow instanceof workflows.EditFeatureAttributesWorkflow ) && workflow.startFromLastStep(options)
    || workflow.start(options);
  const percContent = this._bindEscKeyUp(workflow,  () => {
    relationfeature.setStyle(this._originalLayerStyle);
  });
  promise.then((outputs) => {
      if (relationtool.getId() === 'deletefeature') {
        relationfeature.setStyle(this._originalLayerStyle);
        this.getEditingLayer().getSource().removeFeature(relationfeature);
        this.getCurrentWorkflowData().session.pushDelete(this._layerId, relationfeature);
        this.relations.splice(index, 1)
      }
      if (relationtool.getId() === 'editattributes') {
        const fields = this._getRelationFieldsValue(relationfeature);
        fields.forEach((_field) => {
          relation.fields.forEach((field) => {
            if (field.name === _field.name)
              field.value = _field.value;
          })
        });
      }
      d.resolve(outputs)
    })
    .fail((err) => {
      d.reject(err)
    })
    .always(() => {
      workflow.stop();
      GUI.hideContent(false, percContent);
      this._unbindEscKeyUp();
      GUI.setModal(true);
    });
  return d.promise()
};

proto.getLayer = function() {
  return this.getEditingService().getLayerById(this._layerId);
};

proto.getEditingLayer = function() {
  return this.getEditingService().getEditingLayer(this._layerId);
};

proto.getEditingService = function() {
  this._editingService = this._editingService || require('./editingservice');
  return this._editingService;
};

proto.updateExternalKeyValueRelations = function(input) {
  const session = this.getEditingService().getToolBoxById(this._layerId).getSession();
  const {ownField, relationField} = this.getEditingService()._getRelationFieldsFromRelation({
    layerId: this._layerId,
    relation: this.relation
  });
  if (input.name === relationField) {
    this._currentFeatureRelationFieldValue = input.value;
    this.relations.forEach((relation) => {
      const fields = relation.fields;
      fields.forEach((field) => {
        if (field.name === ownField){
          field.value = this._currentFeatureRelationFieldValue
        }
      });
      relation = this._getRelationFeature(relation.id);
      const originalRelation = relation.clone();
      relation.set(ownField, input.value);
      if (!relation.isNew()) {
        session.pushUpdate(this._layerId, relation, originalRelation);
      }
    })
  }
};

proto._escKeyUpHandler = function(evt) {
  if (evt.keyCode === 27) {
    evt.data.workflow.reject();
    evt.data.callback()
  }
};

proto._unbindEscKeyUp = function() {
  $(document).unbind('keyup', this._escKeyUpHandler);
};

proto._bindEscKeyUp = function(workflow, callback=()=>{}) {
  const percContent = GUI.hideContent(true);
  $(document).one('keyup', {
    workflow,
    percContent,
    callback
  }, this._escKeyUpHandler);
  return percContent;
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

proto.emitEventToParentWorkFlow = function(type='set-main-component', options={}) {
  this._parentWorkFlow.getContextService().getEventBus().$emit(type, options)
};

proto._getRelationAsFatherStyleColor = function(type) {
  const fatherLayer = this.getEditingLayer(this._mainLayerId);
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

proto.addRelation = function() {
  const isVector = this._layerType === Layer.LayerTypes.VECTOR;
  isVector && GUI.setModal(false);
  const workflow = this._getAddFeatureWorkflow();
  const options = this._createWorkflowOptions();
  const session = options.context.session;

  const {ownField, relationField} = this.getEditingService()._getRelationFieldsFromRelation({
    layerId: this._layerId,
    relation: this.relation
  });

  const { parentFeature } = options;
  const promise =   workflow.start(options);
  const percContent = isVector &&  this._bindEscKeyUp(workflow);
  promise.then((outputs) => {
    const {newFeature, originalFeature} = outputs.relationFeature;
    const setRelationFieldValue = (value) =>{
      console.log(value)
      newFeature.set(ownField, value);
      parentFeature.isNew() && originalFeature.set(ownField, value);
      this.getLayer().getEditingSource().updateFeature(newFeature);
      session.pushUpdate(this._layerId, newFeature, originalFeature);
    };
    setRelationFieldValue(this._currentFeatureRelationFieldValue);
    if (parentFeature.isNew() && this._isFatherFieldEditable) {
      const keyRelationFeatureChange = parentFeature.on('propertychange', evt => {
        if (parentFeature.isNew()) {
          if(evt.key === relationField) {
            const value = evt.target.get(relationField);
            setRelationFieldValue(value, true);
          }
        } else ol.Observable.unByKey(keyRelationFeatureChange);
      })
    }
    const newRelation = this._createRelationObj(newFeature);
    this.relations.push(newRelation);
    this.emitEventToParentWorkFlow()
  }).fail((err) => {
    session.rollbackDependecies([this._layerId]);
  }).always(() =>{
    if (isVector) {
      GUI.hideContent(false, percContent);
      this._unbindEscKeyUp();
      GUI.setModal(true);
    }
    workflow.stop();
  });
};

proto.linkRelation = function() {
  const isVector = this._layerType === Layer.LayerTypes.VECTOR;
  const workflow = this._getLinkFeatureWorkflow();
  const options = this._createWorkflowOptions();
  const session = options.context.session;
  const {ownField} = this.getEditingService()._getRelationFieldsFromRelation({
    layerId: this._layerId,
    relation: this.relation
  });
  //add options to exclude features
  options.context.exclude = {
    value: this._currentFeatureRelationFieldValue,
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
  const getRelationFeatures = () => this.getEditingService().getLayersDependencyFeatures(this._mainLayerId, dependencyOptions);
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
      const percContent = this._bindEscKeyUp(workflow);
      const promise = workflow.start(options);
      resolve({
        promise,
        percContent
      })
    });
  } else preWorkflowStart = new Promise((resolve) => {
    GUI.setLoadingContent(true);
    getRelationFeatures()
      .then(()=>{
        resolve({})
      }).finally(()=>{
        GUI.setLoadingContent(false);
      })
  });

  preWorkflowStart.then(({promise, percContent}={})=> {
    promise = promise || workflow.start(options);
    promise.then((outputs) => {
      if (outputs.features.length) {
        outputs.features.forEach(relation => {
          const relationAlreadyLinked = this.relations.find(rel => rel.id === relation.getId());
          if (!relationAlreadyLinked) {
            const originalRelation = relation.clone();
            relation.set(ownField, this._currentFeatureRelationFieldValue);
            this.getCurrentWorkflowData().session.pushUpdate(this._layerId , relation, originalRelation);
            this.relations.push(this._createRelationObj(relation));
            this.emitEventToParentWorkFlow();
          } else GUI.notify.warning(t("editing.relation_already_added"));
        });
      }
    }).fail(() => {
      session.rollbackDependecies([this._layerId]);
    }).always(() =>{
      if (percContent) {
        GUI.closeUserMessage();
        GUI.hideContent(false, percContent);
        this._unbindEscKeyUp();
      }
      workflow.stop();
    });
  })
};

proto._checkIfExternalFieldRequired = function() {
  const {ownField} = this.getEditingService()._getRelationFieldsFromRelation({
    layerId: this._layerId,
    relation: this.relation
  });
  return this.getEditingService().isFieldRequired(this._layerId, ownField);
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
    layerId: this._layerId,
    relation: this.relation
  });
  const unlink = ()=>{
    const relation = this.relations[index];
    const feature = this.getLayer().getEditingSource().getFeatureById(relation.id);
    const originalRelation = feature.clone();
    feature.set(ownField, null);
    this.getCurrentWorkflowData().session.pushUpdate(this._layerId, feature, originalRelation);
    this.relations.splice(index, 1);
    d.resolve(true);
  };
  if (dialog) {
    GUI.dialog.confirm(t("editing.messages.unlink_relation"), (result) => {
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
    layerId: this._layerId,
    relation: this.relation
  });
  const workflow_options = {
    parentFeature: this.getCurrentWorkflowData().feature,
    context: {
      session: this.getCurrentWorkflowData().session,
      excludeFields: [ownField],
      fatherValue: this._currentFeatureRelationFieldValue,
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
  relation.fields.forEach((field) => {
    const value = field.value;
    attributes.push({label: field.label, value})
  });
  return attributes
};



module.exports = RelationService;
