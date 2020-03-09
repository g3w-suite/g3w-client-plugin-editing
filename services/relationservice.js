const GUI = g3wsdk.gui.GUI;
const t = g3wsdk.core.i18n.tPlugin;

// what we can do with each type of relation element
const RELATIONTOOLS = {
  default: ['editattributes', 'deletefeature'],
  'table' : [],
  'Point': ['movefeature'],
  'LineString': ['movevertex'],
  'Polygon': ['movefeature', 'movevertex']
};

// servizio che in base alle relazioni (configurazione)
const RelationService = function(layerId, options = {}) {
  this._mainLayerId = layerId;
  this.relation = options.relation;
  this.relations = options.relations;
  this._isExternalFieldRequired = false;
  this._layerId = this.relation.child === this._mainLayerId ? this.relation.father : this.relation.child;
  const {relationField} = this.getEditingService()._getRelationFieldsFromRelation({
    layerId: this._layerId,
    relation: this.relation
  });
  this._layerType = this.getLayer().getType();
  this._relationTools = [];
  this._parentWorkFlow = this.getCurrentWorkflow();
  this._add_link_workflow = null; // sono i workflow link e add che verranmno settati in base al tipo di layer
  this._isExternalFieldRequired = this._checkIfExternalFieldRequired();
  // prendo il valore del campo se esiste come proprietà altrimenti prendo il valore della chiave primaria
  this._currentFeatureRelationFieldValue =
    relationField in this.getCurrentWorkflowData().feature.getProperties() ?
      this.getCurrentWorkflowData().feature.get(relationField) :
      this.getCurrentWorkflowData().feature.getId();
  //get type of relation
  const relationLayerType = this.getLayer().getType() === 'vector' ? this.getLayer().getGeometryType() : 'table';
  let allrelationtools;
  if (relationLayerType === 'table') {
    this._relationTools.push({
      state: {
        icon: 'deleteTableRow.png',
        id: 'deletefeature',
        name: t("editing.tools.delete_feature")
      }
    });
    this._relationTools.push({
      state: {
        icon: 'editAttributes.png',
        id: 'editattributes',
        name: t("editing.tools.update_feature")

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

  this._originalLayerStyle = this.getLayer().getType() === 'vector' ? this.getEditingLayer().getStyle() : null;
  // vado ad aggiungere i workflow per link relation che add new relation
  this._setAddLinkWorkflow();
};

const proto = RelationService.prototype;

proto._setAddLinkWorkflow = function() {
  const add_link_workflow = {
    vector: {
      link: require('../workflows/linkrelationworkflow'),
      add: require('../workflows/addfeatureworkflow')
    },
    table: {
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
    const toolPromise = (this._layerType === 'vector') && this.startVectorTool(relationtool, index) ||
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
  const featurestore = this.getEditingService().getToolBoxById(this._layerId).getSession().getFeaturesStore();
  const relationfeature = featurestore.getFeatureById(relation.id);
  GUI.setModal(false);
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
    const percContent = this._bindEscKeyUp(workflow,  function() {});
    workflow.start(options)
      .then((output) => {
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
        GUI.hideContent(false, percContent);
        this._unbindEscKeyUp();
        GUI.setModal(true);
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

  const percContent = this._bindEscKeyUp(workflow,  function() {
    relationfeature.setStyle(this._originalLayerStyle);
  });
  const start =(workflow instanceof workflows.DeleteFeatureWorkflow || workflow instanceof workflows.EditFeatureAttributesWorkflow ) && workflow.startFromLastStep(options)
    || workflow.start(options);
  start.then((outputs) => {
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
      this.showRelationStyle();
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
  const EditingService = require('./editingservice');
  return EditingService;
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
    evt.data.workflow.stop();
    GUI.hideContent(false, evt.data.percContent);
    evt.data.callback()
  }
};

// funzione che fa unbind dell'evento esc key
proto._unbindEscKeyUp = function() {
  $(document).unbind('keyup', this._escKeyUpHandler);
};

proto._bindEscKeyUp = function(workflow, callback) {
  const percContent = GUI.hideContent(true);
  $(document).one('keyup', {
    workflow: workflow,
    percContent: percContent,
    callback: callback || function() {}
  }, this._escKeyUpHandler);
  return percContent;
};

proto._getRelationFieldsValue = function(relation) {
  const layer = this.getLayer();
  const fields = layer.getFieldsWithValues(relation, {
    relation: true
  });
  return fields;
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

proto.addRelation = function() {
  GUI.setModal(false);
  const workflow = this._getAddFeatureWorkflow();
  const percContent = this._bindEscKeyUp(workflow);
  const options = this._createWorkflowOptions();
  const session = options.context.session;
  const {ownField, relationField} = this.getEditingService()._getRelationFieldsFromRelation({
    layerId: this._layerId,
    relation: this.relation
  });
  const { parentFeature } = options;
  workflow.start(options)
    .then((outputs) => {
      // sono le features e il layer editato
      const {newFeature, originalFeature} = outputs.relationFeature;
      const setRelationFieldValue = (value) =>{
        newFeature.set(ownField, value);
        this.getLayer().getSource().updateFeature(newFeature);
        session.pushUpdate(this._layerId, newFeature, originalFeature);
      };
      setRelationFieldValue(this._currentFeatureRelationFieldValue);
      // vado a settare il valore della relazione che è legato al padre
      const parentlayer = this._parentWorkFlow.getContext().layer;
      if (parentFeature.isNew() && parentlayer.isPkEditable() && relationField === parentlayer.getPk()) {
        const keyRelationFeatureChange = parentFeature.on('propertychange', evt => {
          if (parentFeature.isNew()) {
            if(evt.key === relationField) {
              const value = evt.target.get(relationField);
              setRelationFieldValue(value);
            }
          } else ol.Observable.unByKey(keyRelationFeatureChange);
        })
      }
      //vado a aggiungere una nuova relazione
      const newRelation = this._createRelationObj(newFeature);
      this.relations.push(newRelation);
      this.emitEventToParentWorkFlow()
    })
    .fail((err) => {
      session.rollback();
    })
    .always(() =>{
      GUI.hideContent(false, percContent);
      this._unbindEscKeyUp();
      workflow.stop();
      GUI.setModal(true);
    });
};

// funzione che screa lo stile delle relazioni dipendenti riconoscibili con il colore del padre
proto._getRelationAsFatherStyleColor = function(type) {
  const fatherLayer = this.getEditingService().getEditingLayer(this._mainLayerId);
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

proto.linkRelation = function() {
  const workflow = this._getLinkFeatureWorkflow();
  const percContent = this._bindEscKeyUp(workflow);
  const options = this._createWorkflowOptions();
  const session = options.context.session;
  const {ownField} = this.getEditingService()._getRelationFieldsFromRelation({
    layerId: this._layerId,
    relation: this.relation
  });
  workflow.start(options)
    .then((outputs) => {
      const relation = outputs.features[0];
      const relationAlreadyLinked = this.relations.find(rel => rel.id === relation.getId());
      if (!relationAlreadyLinked) {
        const originalRelation = relation.clone();
        relation.set(ownField, this._currentFeatureRelationFieldValue);
        this.getCurrentWorkflowData().session.pushUpdate(this._layerId , relation, originalRelation);
        this.relations.push(this._createRelationObj(relation));
        this.emitEventToParentWorkFlow();
      } else GUI.notify.warning(t("editing.relation_already_added"));
    })
    .fail((err) => {
      session.rollback();
    })
    .always(() =>{
      workflow.stop();
      GUI.hideContent(false, percContent);
      this._unbindEscKeyUp()
    });
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
  const editingLayer = this.getEditingLayer();
  return editingLayer.getSource().getFeatureById(featureId);
};

proto.unlinkRelation = function(index) {
  const d = $.Deferred();
  const {ownField} = this.getEditingService()._getRelationFieldsFromRelation({
    layerId: this._layerId,
    relation: this.relation
  });
  GUI.dialog.confirm(t("editing.messages.unlink_relation"), (result) => {
    if (result) {
      const relation = this.relations[index];
      const feature = this.getEditingLayer().getSource().getFeatureById(relation.id);
      const originalRelation = feature.clone();
      feature.set(ownField, null);
      this.getCurrentWorkflowData().session.pushUpdate(this._layerId, feature, originalRelation);
      this.relations.splice(index, 1);
      d.resolve(result);
    } else {
      d.reject(result);
    }
  });
  return d.promise();
};

proto.getCurrentWorkflow = function() {
  return this.getEditingService().getCurrentWorkflow();
};

proto.getCurrentWorkflowData = function() {
  return this.getEditingService().getCurrentWorkflowData();
};

// mi server per avere un riferimento al worflow attuale
// così da poter inserire le modifiche della relazione al current workflow
proto._createWorkflowOptions = function(options={}) {
  const {ownField} = this.getEditingService()._getRelationFieldsFromRelation({
    layerId: this._layerId,
    relation: this.relation
  });
  const workflow_options = {
    parentFeature: this.getCurrentWorkflowData().feature,
    context: {
      session: this.getCurrentWorkflowData().session,
      layer: this.getLayer(),
      excludeFields: [ownField],
      fatherValue: this._currentFeatureRelationFieldValue,
    },
    inputs: {
      features: options.features || [],
      layer: this.getEditingLayer()
    }
  };
  return workflow_options;
};

proto.showRelationStyle = function() {
  let style;
  const layerType = this.getLayer().getType();
  if (layerType === 'table')
    return;
  const geometryType = this.getLayer().getGeometryType();
  switch (geometryType) {
    case 'Point' || 'MultiPoint':
      const color = this._originalLayerStyle.getImage().getFill().getColor();
      style = new ol.style.Style({
        image: new ol.style.Circle({
          radius: 8,
          fill: new ol.style.Fill({
            color: color
          }),
          stroke: new ol.style.Stroke({
            width: 5,
            color:  this._getRelationAsFatherStyleColor('Point')
          })
        })
      });
      break;
    case 'Line' || 'MultiLine':
      style = new ol.style.Style({
        fill: new ol.style.Fill({
          color: color
        }),
        stroke: new ol.style.Stroke({
          width: 5,
          color: this._getRelationAsFatherStyleColor('Line')
        })
      });
      break;
    case 'Polygon' || 'MultiPolygon':
      style =  new ol.style.Style({
        stroke: new ol.style.Stroke({
          color:  this._getRelationAsFatherStyleColor('Polygon'),
          width: 5
        }),
        fill: new ol.style.Fill({
          color: color,
          opacity: 0.5
        })
      })
  }
  this.relations.forEach((relation) => {
    const relationfeature = this._getRelationFeature(relation.id);
    relationfeature && relationfeature.setStyle(style);
  })
};


proto.hideRelationStyle = function() {
  if (this._layerType === 'vector') {
    this.relations.forEach((relation) => {
      relationfeature = this._getRelationFeature(relation.id);
      relationfeature.setStyle(this._originalLayerStyle);
    })
  }
};

proto.relationFields = function(relation) {
  const attributes = [];
  const originalRelation = this._getRelationFeature(relation.id);
  relation.fields.forEach((field) => {
    let value = field.value;
    if (field.name === originalRelation.getPk() && originalRelation.isNew() && !field.editable)
      value = null;
    attributes.push({label: field.label, value: value})
  });
  return attributes
};



module.exports = RelationService;
