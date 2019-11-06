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
const RelationService = function(options = {}) {
  this.relation = options.relation;
  this.relations = options.relations;
  this._isExternalFieldRequired = false;
  this._layerId = this.relation.child;
  this._layerType = this.getLayer().getType();
  this._relationTools = [];
  this._parentWorkFlow = this.getCurrentWorkflow();
  this._add_link_workflow = null; // sono i workflow link e add che verranmno settati in base al tipo di layer
  this._isExternalFieldRequired = this._checkIfExternalFieldRequired();
  // prendo il valore del campo se esiste come proprietà altrimenti prendo il valore della chiave primaria
  this._currentFeatureFatherFieldValue = this.relation.fatherField in this.getCurrentWorkflowData().feature.getProperties() ? this.getCurrentWorkflowData().feature.get(this.relation.fatherField) : this.getCurrentWorkflowData().feature.getId();
  //get type of relation
  const relationLayerType = this.getLayer().getType() == 'vector' ? this.getLayer().getGeometryType() : 'table';
  let allrelationtools;
  if (relationLayerType == 'table') {
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
    allrelationtools = this.getEditingService().getToolBoxById(this.relation.child).getTools();
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

// funzione che lachia la funzione in base al tipo di layer
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
  const relation = this.relations[index]; // oggetto relazione
  const featurestore = this.getEditingService().getToolBoxById(this._layerId).getSession().getFeaturesStore();
  const relationfeature = featurestore.getFeatureById(relation.id); // relation feature
  GUI.setModal(false);
  const options = this._createWorkflowOptions({
    features: [relationfeature]
  });
  let workflow;
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
    workflow = new EditTableFeatureWorkflow();
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
  const relation = this.relations[index]; // oggetto relazione
  const relationfeature = this._getRelationFeature(relation.id); // relation feature
  const workflows = {
    ModifyGeometryVertexWorkflow: require('../workflows/modifygeometryvertexworkflow'),
    MoveFeatureWorkflow : require('../workflows/movefeatureworkflow'),
    DeleteFeatureWorkflow : require('../workflows/deletefeatureworkflow'),
    EditFeatureAttributesWorkflow : require('../workflows/editfeatureattributesworkflow')
  };

  GUI.setModal(false);

  const workflow = Object.entries(workflows).find(([key, classworkflow]) => {
    return relationtool.getOperator() instanceof classworkflow
  });

  const options = this._createWorkflowOptions({
    features: [relationfeature]
  });

  this._highlightRelationSelect(relationfeature);

  const percContent = this._bindEscKeyUp(workflow,  function() {
    relation.setStyle(this._originalLayerStyle);
  });

  const start =(workflow instanceof workflows.DeleteFeatureWorkflow || workflow instanceof workflows.EditFeatureAttributesWorkflow ) && workflow.startFromLastStep(options)
    || workflow.start(options);
  start.then((outputs) => {
      if (relationtool.getId() === 'deletefeature') {
        // vado a cambiarli lo style
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
      // vado a mettere lo style della relazione
      this.showRelationStyle();
      workflow.stop();
      GUI.hideContent(false, percContent);
      this._unbindEscKeyUp();
      GUI.setModal(true);
    });
  return d.promise()
};

// ritorna il layer editable estartto dal layer del catalogo
proto.getLayer = function() {
  return this.getEditingService().getLayerById(this.relation.child);
};

// ritorna il layer che è effettivamente in editing utilizzato dai task
proto.getEditingLayer = function() {
  return this.getEditingService().getEditingLayer(this.relation.child);
};

proto.getEditingService = function() {
  const EditingService = require('./editingservice');
  return EditingService;
};

proto.updateExternalKeyValueRelations = function(input) {
  const session = this.getEditingService().getToolBoxById(this.relation.father).getSession();
  const layerId = this.relation.child;
  if (input.name == this.relation.fatherField) {
    this._currentFeatureFatherFieldValue = input.value;
    this.relations.forEach((relation) => {
      const fields = relation.fields;
      fields.forEach((field) => {
        if (field.name == this.relation.childField){
          field.value = this._currentFeatureFatherFieldValue
        }
      });
      relation = this._getRelationFeature(relation.id);
      // vado a setare il valore della relazione e aggiornare la sessione
      const originalRelation = relation.clone();
      relation.set(this.relation.childField, input.value);
      if (!relation.isNew()) {
        session.pushUpdate(layerId, relation, originalRelation);
      }
    })
  }
};

// funzione che gestisce l'evento keyup esc
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
  workflow.start(options)
    .then((outputs) => {
      // sono le features e il layer editato
      const {newFeature, originalFeature} = outputs.relationFeature;
      // vado a settare il valore della relazione che è legato al padre
      newFeature.set(this.relation.childField, this._currentFeatureFatherFieldValue);
      session.pushUpdate(this._layerId, newFeature, originalFeature);
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

// funzione che screa lo stile delle relazioni diepndenti riconoscibili con il colore del padre
proto._getRelationAsFatherStyleColor = function() {
  const fatherLayerStyle = this.getEditingService().getEditingLayer(this.relation.father).getStyle();
  const fatherLayerStyleColor = fatherLayerStyle.getFill() ? fatherLayerStyle.getFill() : fatherLayerStyle.getStroke();
  return fatherLayerStyleColor.getColor();
};

proto.linkRelation = function() {
  const workflow = this._getLinkFeatureWorkflow();
  const percContent = this._bindEscKeyUp(workflow);
  const options = this._createWorkflowOptions();
  const session = options.context.session;
  workflow.start(options)
    .then((outputs) => {
      const relation = outputs.features[0];
      let relationAlreadyLinked = false;
      this.relations.forEach((rel) => {
        if (rel.id == relation.getId()) {
          relationAlreadyLinked = true;
          return false;
        }
      });
      if (!relationAlreadyLinked) {
        const originalRelation = relation.clone();
        relation.set(this.relation.childField, this._currentFeatureFatherFieldValue);
        this.getCurrentWorkflowData().session.pushUpdate(this._layerId , relation, originalRelation);
        this.relations.push(this._createRelationObj(relation));
        this.emitEventToParentWorkFlow();
      } else {
        GUI.notify.warning(t("editing.relation_already_added"));
      }
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
  const layerId = this.relation.child;
  const fieldName = this.relation.childField;
  return this.getEditingService().isFieldRequired(layerId, fieldName);
};

proto.isRequired = function() {
  return this._isExternalFieldRequired;
};

proto._getRelationFeature = function(featureId) {
  const editingLayer = this.getEditingLayer();
  const feature = editingLayer.getSource().getFeatureById(featureId);
  return feature;
};

proto.unlinkRelation = function(index) {
  let relation = this.relations[index];
  relation = this.getEditingLayer().getSource().getFeatureById(relation.id);
  const originalRelation = relation.clone();
  relation.set(this.relation.childField, null);
  this.getCurrentWorkflowData().session.pushUpdate(this._layerId, relation, originalRelation);
  this.relations.splice(index, 1);
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
  const workflow_options = {
    context: {
      session: this.getCurrentWorkflowData().session,
      layer: this.getLayer(),
      excludeFields: [this.relation.childField],
      fatherValue: this._currentFeatureFatherFieldValue
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
  if (layerType == 'table')
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
            color:  this._getRelationAsFatherStyleColor()
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
          color: this._getRelationAsFatherStyleColor()
        })
      });
      break;
    case 'Polygon' || 'MultiPolygon':
      style =  new ol.style.Style({
        stroke: new ol.style.Stroke({
          color:  this._getRelationAsFatherStyleColor(),
          width: 5
        }),
        fill: new ol.style.Fill({
          color: color,
          opacity: 0.5
        })
      })
  }

  this.relations.forEach((relation) => {
    let relationfeature = this._getRelationFeature(relation.id);
    relationfeature.setStyle(style);
  })
};


proto.hideRelationStyle = function() {
  if (this._layerType == 'vector') {
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
    if (field.name == originalRelation.getPk() && originalRelation.isNew() && !field.editable)
      value = null;
    attributes.push({label: field.label, value: value})
  });
  return attributes
};



module.exports = RelationService;
