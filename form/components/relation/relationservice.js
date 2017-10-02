var GUI = g3wsdk.gui.GUI;
var LinkRelationWorkflow = require('../../../workflows/linkrelationworkflow');

var RELATIONTOOLS = {
  'Point': ['movefeature'],
  'LineString': ['movevertex'],
  'Polygon': ['movefeature', 'movevertex'],
  default: ['editattributes', 'deletefeature']
};

// servizio che in base alle relazioni (configurazione)
var RelationService = function(options) {
  var self = this;
  this.relation = options.relation;
  this._relationTools = [];
  this._isExternalFieldRequired = false;
  this._layerId = this.relation.child;
  this._relationTools = [];
  this._isExternalFieldRequired = this._checkIfExternalFieldRequired();
  this._curentFeatureFatherFieldValue = this.getCurrentWorkflow().feature.get(this.relation.fatherField);
  var relationLayerType = this.getLayer().getGeometryType();
  var allrelationtools = this.getEditingService().getToolBoxById(this.relation.child).getTools();
  _.forEach(allrelationtools, function (tool) {
    if(_.concat(RELATIONTOOLS[relationLayerType], RELATIONTOOLS.default).indexOf(tool.getId()) != -1) {
      self._relationTools.push(_.cloneDeep(tool));
    }
  });
};

var proto = RelationService.prototype;

proto.getRelationTools = function() {
  return this._relationTools
};
  
proto.startTool = function(relationtool, index) {
  var self = this;
  var d = $.Deferred();
  var relation = this.relation.relations[index];
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
    features: [relation]
  });

  var originalStyle = this.getEditingLayer().getStyle();
  relation.setStyle(new ol.style.Style({
    image: new ol.style.Circle({
      radius: 8,
      stroke: new ol.style.Stroke({
        color: 'orange',
        width: 3
      }),
      fill: new ol.style.Fill({
        color: 'red'
      })
    })
  }));

  var percContent = this._bindEscKeyUp(workflow,  function() {
    relation.setStyle(originalStyle);
  });
  var start;
  if (workflow instanceof workflows.DeleteFeatureWorkflow || workflow instanceof workflows.EditFeatureAttributesWorkflow )
    start  = workflow.startFromLastStep(options);
  else
    start = workflow.start(options);
  start.then(function(outputs) {
      if (relationtool.getId() == 'deletefeature') {
        self.getEditingService().getEditingLayer(self._layerId).getSource().removeFeature(relation);
        self.getCurrentWorkflow().session.pushDelete(self._layerId, relation);
        self.relation.relations.splice(index, 1)
      }
      d.resolve(outputs)
    })
    .fail(function(err) {
      d.reject(err)
    })
    .always(function() {
      relation.setStyle(originalStyle);
      workflow.stop();
      GUI.hideContent(false, percContent);
      self._unbindEscKeyUp();
      GUI.setModal(true);
    });
  return d.promise()
};

proto.getLayer = function() {
  return this.getEditingService().getLayersById(this.relation.child);
};

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
    _.forEach(this.relation.relations, function(relation) {
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

proto.addRelation = function() {
  var self =this;
  var AddFeatureWorkflow = require('../../../workflows/addfeatureworkflow');
  GUI.setModal(false);
  var workflow = new AddFeatureWorkflow();
  var percContent = this._bindEscKeyUp(workflow);
  var options = this._createWorkflowOptions();
  workflow.start(options)
    .then(function(outputs) {
      var relation = outputs.features[outputs.features.length - 1]; // vado a prende l'ultima inserrita
      // vado a settare il valore
      relation.set(self.relation.childField, self._curentFeatureFatherFieldValue);
      self.relation.relations.push(relation);
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

proto.linkRelation = function() {
  var self = this;
  var workflow = new LinkRelationWorkflow();
  var percContent = this._bindEscKeyUp(workflow);
  var options = this._createWorkflowOptions();
  workflow.start(options)
    .then(function(outputs) {
      var relation = outputs.features[0];
      var originalRelation = outputs.features[1];
      var relationAlreadyLinked = false;
      _.forEach(self.relation.relations, function(rel) {
        if (rel.getId() == relation.getId()) {
          relationAlreadyLinked = true;
          return false;
        }
      });
      if (!relationAlreadyLinked) {
        relation.set(self.relation.childField, self._curentFeatureFatherFieldValue);
        self.getCurrentWorkflow().session.pushUpdate(self._layerId , relation, originalRelation);
        self.relation.relations.push(relation);
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

proto.unlinkRelation = function(index) {
  var relation = this.relation.relations[index];
  var originalRelation = relation.clone();
  relation.set(this.relation.childField, null);
  this.getCurrentWorkflow().session.pushUpdate(this._layerId, relation, originalRelation);
  this.relation.relations.splice(index, 1);
};

proto.getCurrentWorkflow = function() {
  return this.getEditingService().getCurrentWorflow();
};

proto._createWorkflowOptions = function(options) {
  options = options || {};
  var options = {
    context: {
      session: this.getCurrentWorkflow().session,
      isChild: options.isChild || true,
      layer: this.getLayer(),
      excludeFields: [this.relation.childField]
    },
    inputs: {
      features: options.features || [],
      layer: this.getEditingLayer()
    }
  };
  return options;
};


module.exports = RelationService;