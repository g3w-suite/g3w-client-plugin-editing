var GUI = g3wsdk.gui.GUI;

var RELATIONTOOLS = {
  'table' : [],
  'Point': ['movefeature'],
  'LineString': ['movevertex'],
  'Polygon': ['movefeature', 'movevertex'],
  default: ['editattributes', 'deletefeature']
};


// servizio che in base alle relazioni (configurazione)
var RelationService = function(options) {
  var self = this;
  this.relation = options.relation;
  this.relations = options.relations;
  this._relationTools = [];
  this._isExternalFieldRequired = false;
  this._layerId = this.relation.child;
  this._layerType = this.getLayer().getType();
  this._relationTools = [];
  this._add_link_workflow = null; // sono i workflow link e adda che verranmno settati in base al tipo di layer
  this._isExternalFieldRequired = this._checkIfExternalFieldRequired();
  // prendo il campo se eseiste come proprietà altrimenti prendo la chiave primaria
  this._curentFeatureFatherFieldValue = this.getCurrentWorkflow().feature.get(this.relation.fatherField) || this.getCurrentWorkflow().feature.getId();
  var relationLayerType = this.getLayer().getType() == 'vector' ? this.getLayer().getGeometryType() : 'table';
  var allrelationtools;
  if (relationLayerType == 'table') {
    self._relationTools.push({
      state: {
        icon: 'deleteTableRow.png',
        id: 'deletefeature',
        name: "Elimina feature"
      }
    });
    self._relationTools.push({
      state: {
        icon: 'editAttributes.png',
        id: 'editattributes',
        name: "Modifica attributi"

      }
    })

  } else {
    allrelationtools = this.getEditingService().getToolBoxById(this.relation.child).getTools();
    _.forEach(allrelationtools, function (tool) {
      if(_.concat(RELATIONTOOLS[relationLayerType], RELATIONTOOLS.default).indexOf(tool.getId()) != -1) {
        self._relationTools.push(_.cloneDeep(tool));
      }
    });
  }
  this._originalLayerStyle = this.getLayer().getType() == 'vector' ? this.getEditingLayer().getStyle() : null;
  // vado ad aggiungere i workflow per link relation che add new relation
  this._setAddLinkWorkflow();
};

var proto = RelationService.prototype;

proto._setAddLinkWorkflow = function() {
  var add_link_workflow = {
    vector: {
      link: require('../../../workflows/linkrelationworkflow'),
      add: require('../../../workflows/addfeatureworkflow')
    },
    table: {
      link: require('../../../workflows/edittableworkflow'),
      add: require('../../../workflows/addtablefeatureworkflow')
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
  var geometryType = this.getLayer().getGeometryType();
  var style;
  if (geometryType == 'LineString' || geometryType == 'MultiLineString') {
    style = new ol.style.Style({
      stroke: new ol.style.Stroke({
        color: 'rgb(255,255,0)',
        width: 4
      })
    });
  }
  else if (geometryType == 'Point' || geometryType == 'MultiPoint') {
    style = new ol.style.Style({
      image: new ol.style.Circle({
        radius: 8,
        fill: new ol.style.Fill({
          color: 'rgb(255,255,0)'
        })
      })
    });
  } else if (geometryType == 'MultiPolygon' || geometryType == 'Polygon') {
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
  if (this._layerType == 'vector') {
    return this.startVectorTool(relationtool, index);
  }
  if (this._layerType == 'table') {
    return this.startTableTool(relationtool, index);
  }
};

proto.startTableTool = function(relationtool, index) {
  var self = this;
  var d = $.Deferred();
  var relation = this.relations[index]; // oggetto relazione
  var featurestore = this.getEditingService().getToolBoxById(this._layerId).getSession().getFeaturesStore();
  var relationfeature = featurestore.getFeatureById(relation.id); // relation feature
  GUI.setModal(false);
  var options = this._createWorkflowOptions({
    features: [relationfeature]
  });
  var workflow;
  if (relationtool.state.id == 'deletefeature') {
    var self = this;
    GUI.dialog.confirm("Vuoi eliminare l'elemento selezionato?", function(result) {
      if (result) {
        self.getCurrentWorkflow().session.pushDelete(self._layerId, relationfeature);
        self.relations.splice(index, 1);
        featurestore.removeFeature(relationfeature);
      }
      d.resolve();
    });
  }
  if (relationtool.state.id == 'editattributes') {
    var EditTableFeatureWorkflow = require('../../../workflows/edittablefeatureworkflow');
    workflow = new EditTableFeatureWorkflow();
    var percContent = this._bindEscKeyUp(workflow,  function() {});
    workflow.start(options)
      .then(function(output) {
        _.forEach(self._getRelationFieldsValue(relationfeature), function(_field) {
          _.forEach(relation.fields, function(field) {
            if (field.name == _field.name)
              field.value = _field.value;
          })
        });
        d.resolve(output);
      })
      .fail(function(err) {
        d.reject(err)
      })
      .always(function() {
        workflow.stop();
        GUI.hideContent(false, percContent);
        self._unbindEscKeyUp();
        GUI.setModal(true);
      })
  }
  return d.promise()
};

proto.startVectorTool = function(relationtool, index) {
  var self = this;
  var d = $.Deferred();
  var relation = this.relations[index]; // oggetto relazione
  var relationfeature = this._getRelationFeature(relation.id); // relation feature
  GUI.setModal(false);
  var workflows = {
    ModifyGeometryVertexWorkflow: require('../../../workflows/modifygeometryvertexworkflow'),
    MoveFeatureWorkflow : require('../../../workflows/movefeatureworkflow'),
    DeleteFeatureWorkflow : require('../../../workflows/deletefeatureworkflow'),
    EditFeatureAttributesWorkflow : require('../../../workflows/editfeatureattributesworkflow')
  };
  var workflow;
  _.forEach(workflows, function(classworkflow, key) {
    if (relationtool.getOperator() instanceof classworkflow) {
      workflow = new classworkflow();
      return false;
    }
  });

  var options = this._createWorkflowOptions({
    features: [relationfeature]
  });

  this._highlightRelationSelect(relationfeature);

  var percContent = this._bindEscKeyUp(workflow,  function() {
    relation.setStyle(this._originalLayerStyle);
  });
  var start;
  if (workflow instanceof workflows.DeleteFeatureWorkflow || workflow instanceof workflows.EditFeatureAttributesWorkflow )
    start  = workflow.startFromLastStep(options);
  else
    start = workflow.start(options);
  start.then(function(outputs) {
      if (relationtool.getId() == 'deletefeature') {
        // vado a cambiarli lo style
        relationfeature.setStyle(self._originalLayerStyle);
        self.getEditingLayer().getSource().removeFeature(relationfeature);
        self.getCurrentWorkflow().session.pushDelete(self._layerId, relationfeature);
        self.relations.splice(index, 1)
      }
      if (relationtool.getId() == 'editattributes') {
        _.forEach(self._getRelationFieldsValue(relationfeature), function(_field) {
          _.forEach(relation.fields, function(field) {
            if (field.name == _field.name)
              field.value = _field.value;
          })
        });
      }
      d.resolve(outputs)
    })
    .fail(function(err) {
      d.reject(err)
    })
    .always(function() {
      // vado a mettere lo style della relazione
      self.showRelationStyle();
      workflow.stop();
      GUI.hideContent(false, percContent);
      self._unbindEscKeyUp();
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
  var EditingService = require('../../../editingservice');
  return EditingService;
};

proto.updateExternalKeyValueRelations = function(input) {
  var self = this;
  var session = this.getEditingService().getToolBoxById(this.relation.father).getSession();
  var layerId = this.relation.child;
  if (input.name == this.relation.fatherField) {
    this._curentFeatureFatherFieldValue = input.value;
    _.forEach(this.relations, function(relation) {
      _.forEach(relation.fields, function(field) {
        if (field.name == self.relation.childField){
          field.value = self._curentFeatureFatherFieldValue
        }
      });
      relation = self._getRelationFeature(relation.id);
      // vado a setare il valore della relazione e aggiornare la sessione
      var originalRelation = relation.clone();
      relation.set(self.relation.childField, input.value);
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
  var percContent = GUI.hideContent(true);
  $(document).one('keyup', {
    workflow: workflow,
    percContent: percContent,
    callback: callback || function() {}
  }, this._escKeyUpHandler);
  return percContent;
};

proto._getRelationFieldsValue = function(relation) {
  var layer = this.getLayer();
  var fields = layer.getFieldsWithValues(relation);
  return fields;
};

proto._createRelationObj = function(relation) {
  return {
    fields: this._getRelationFieldsValue(relation),
    id: relation.getId()
  }
};

proto.addRelation = function() {
  var self =this;
  GUI.setModal(false);
  var workflow = this._getAddFeatureWorkflow();
  var percContent = this._bindEscKeyUp(workflow);
  var options = this._createWorkflowOptions();
  workflow.start(options)
    .then(function(outputs) {
      var relation = outputs.features[outputs.features.length - 1]; // vado a prende l'ultima inserrita
      // vado a settare il valore
      relation.set(self.relation.childField, self._curentFeatureFatherFieldValue);
      self.relations.push(self._createRelationObj(relation));
    })
    .fail(function(err) {
    })
    .always(function() {
      GUI.hideContent(false, percContent);
      self._unbindEscKeyUp();
      workflow.stop();
      GUI.setModal(true);
    });
};

// funzione che screa lo stile delle relazioni diepndenti riconoscibili con il colore del padre
proto._getRelationAsFatherStyleColor = function() {
  var fatherLayerStyle = this.getEditingService().getEditingLayer(this.relation.father).getStyle();
  var fatherLayerStyleColor = fatherLayerStyle.getFill() ? fatherLayerStyle.getFill() : fatherLayerStyle.getStroke();
  return fatherLayerStyleColor.getColor();
};

proto.linkRelation = function() {
  var self = this;
  var workflow = this._getLinkFeatureWorkflow();
  var percContent = this._bindEscKeyUp(workflow);
  var options = this._createWorkflowOptions();
  var layer = this.getLayer();
  workflow.start(options)
    .then(function(outputs) {
      var relation = outputs.features[0];
      var relationAlreadyLinked = false;
      _.forEach(self.relations, function(rel) {
        if (rel.id == relation.getId()) {
          relationAlreadyLinked = true;
          return false;
        }
      });
      if (!relationAlreadyLinked) {
        var originalRelation = relation;
        relation.set(self.relation.childField, self._curentFeatureFatherFieldValue);
        self.getCurrentWorkflow().session.pushUpdate(self._layerId , relation, originalRelation);
        self.relations.push(self._createRelationObj(relation));
      } else {
        GUI.notify.warning('Relazione già presente');
      }
    })
    .fail(function(err) {
    })
    .always(function() {
      workflow.stop();
      GUI.hideContent(false, percContent);
      self._unbindEscKeyUp()
    });
};

proto._checkIfExternalFieldRequired = function() {
  var layerId = this.relation.child;
  var fieldName = this.relation.childField;
  return this.getEditingService().isFieldRequired(layerId, fieldName);
};

proto.isRequired = function() {
  return this._isExternalFieldRequired;
};

proto._getRelationFeature = function(featureId) {
  var editingLayer = this.getEditingLayer();
  var feature = editingLayer.getSource().getFeatureById(featureId);
  return feature;
};

proto.unlinkRelation = function(index) {
  var relation = this.relations[index];
  relation = this.getEditingLayer().getSource().getFeatureById(relation.id);
  var originalRelation = relation.clone();
  relation.set(this.relation.childField, null);
  this.getCurrentWorkflow().session.pushUpdate(this._layerId, relation, originalRelation);
  this.relations.splice(index, 1);
};

proto.getCurrentWorkflow = function() {
  return this.getEditingService().getCurrentWorflow();
};

proto._createWorkflowOptions = function(options) {
  options = options || {};
  var options = {
    context: {
      session: this.getCurrentWorkflow().session,
      layer: this.getLayer(),
      excludeFields: [this.relation.childField],
      fatherValue: this._curentFeatureFatherFieldValue
    },
    inputs: {
      features: options.features || [],
      layer: this.getEditingLayer()
    }
  };
  return options;
};

proto.showRelationStyle = function() {
  var self = this;
  var style;
  var layerType = this.getLayer().getType();
  if (layerType == 'table')
    return;
  var geometryType = this.getLayer().getGeometryType();
  switch (geometryType) {
    case 'Point' || 'MultiPoint':
      var color = this._originalLayerStyle.getImage().getFill().getColor();
      style = new ol.style.Style({
        image: new ol.style.Circle({
          radius: 8,
          fill: new ol.style.Fill({
            color: color
          }),
          stroke: new ol.style.Stroke({
            width: 5,
            color:  self._getRelationAsFatherStyleColor()
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
          color: self._getRelationAsFatherStyleColor()
        })
      });
      break;
    case 'Polygon' || 'MultiPolygon':
      style =  new ol.style.Style({
        stroke: new ol.style.Stroke({
          color:  self._getRelationAsFatherStyleColor(),
          width: 5
        }),
        fill: new ol.style.Fill({
          color: color,
          opacity: 0.5
        })
      })
  }
  var relationfeature;
  _.forEach(this.relations, function(relation) {
    relationfeature = self._getRelationFeature(relation.id);
    relationfeature.setStyle(style);
  })
};


proto.hideRelationStyle = function() {
  var self = this;
  if (this._layerType == 'vector') {
    _.forEach(this.relations, function(relation) {
      relationfeature = self._getRelationFeature(relation.id);
      relationfeature.setStyle(self._originalLayerStyle);
    })
  }
};


module.exports = RelationService;