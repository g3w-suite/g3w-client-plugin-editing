var GUI = g3wsdk.gui.GUI;
var WorkflowsStack = g3wsdk.core.workflow.WorkflowsStack;
var LinkRelationWorkflow = require('../../../workflows/linkrelationworkflow');

var RELATIONTOOLS = {
  'Point': ['movefeature'],
  'LineString': ['movevertex'],
  'Polygon': ['movefeature', 'movevertex'],
  default: ['editattributes', 'deletefeature']
};

// servizio che in base alle relazioni (configurazione)
var RelationService = function(options) {
  this.relation = options.relation;
  this._relationTools = [];
  this.init = function() {
    var EditingService = require('../../../editingservice');
    var self = this;
    this._relationTools = [];
    this._currentWorkflow = WorkflowsStack.getLast();
    this._currentWorkflowInputs = this._currentWorkflow.getInputs();
    this._currentFeature = this._currentWorkflowInputs.features[this._currentWorkflowInputs.features.length -1];
    this._curentFeatureFatherFieldValue = this._currentFeature.get(this.relation.fatherField);
    var relationLayerType = this.getLayer().getGeometryType();
    var allrelationtools = EditingService.getToolBoxById(this.relation.child).getTools();
    _.forEach(allrelationtools, function(tool) {
      if (_.concat(RELATIONTOOLS[relationLayerType], RELATIONTOOLS.default).indexOf(tool.getId()) != -1) {
        self._relationTools.push(_.cloneDeep(tool));
      }
    });
  };

  this.getRelationTools = function() {
    return this._relationTools
  };
  
  this.startTool = function(relationtool, relation) {
    var d = $.Deferred();
    var self = this;
    GUI.setModal(false);
    var workflows = {
      AddFeatureWorkflow: require('../../../workflows/addfeatureworkflow'),
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
    var percContent = GUI.hideContent(true);
    workflow.start(options)
      .then(function(outputs) {
        d.resolve(outputs.features[0])
      })
      .fail(function(err) {
        d.reject(err)
      })
      .always(function() {
        relation.setStyle(originalStyle);
        workflow.stop();
        GUI.hideContent(false, percContent);
        GUI.setModal(true);
      });
    return d.promise()
  };

  this.setState = function(state) {
    this.relation = state;
  };
  this.getLayer = function() {
    var EditingService = require('../../../editingservice');
    return EditingService.getLayersById(this.relation.child);
  };

  this.getEditingLayer = function() {
    var EditingService = require('../../../editingservice');
    return EditingService.getEditingLayer(this.relation.child);
  };

  this.getState = function() {
    return this.relation;
  };
  this.updateExternalKeyValueRelations = function(input) {
    var self = this;
    var EditingService = require('../../../editingservice');
    var session = EditingService.getToolBoxById(this.relation.father).getSession();
    var layerId = this.relation.child;
    if (input.name == this.relation.fatherField) {
      this._curentFeatureFatherFieldValue = input.value;
      _.forEach(this.relation.relations, function(relation) {
        // vado a setare il valore della relazione e aggiornare la sessione
        relation.set(self.relation.childField, input.value);
        if (!relation.isNew()) {
          relation.update();
          session.push({
            layerId: layerId,
            feature: relation
          })
        }
      })
    }
  };

  this.linkRelation = function() {
    var self = this;
    var d = $.Deferred();
    var workflow = new LinkRelationWorkflow();
    var options = this._createWorkflowOptions();
    workflow.start(options)
      .then(function(outputs) {
        var relation = outputs.features[1];
        if (self.relation.relations.indexOf(relation) == -1) {
          var session = self._currentWorkflow.getSession();
          relation.set(self.relation.childField, self._curentFeatureFatherFieldValue);
          relation.update();
          session.push({
            layerId: self.relation.child,
            feature: relation
          }, {
            layerId:  self.relation.child,
            feature: outputs.features[0]
          });
          d.resolve(relation);
        }
        else {
          GUI.notify.warning('Relazione già presente');
          d.reject()
        }
      })
      .fail(function(err) {
      })
      .always(function() {
        workflow.stop();
      });
    return d.promise();
  };

  this.unlinkRelation = function(relation) {
    var d = $.Deferred();
    var session = this._currentWorkflow.getSession();
    var originalRelation = relation.clone();
    originalRelation.update();
    relation.set(this.relation.childField, null);
    relation.update();
    session.push({
      layerId: this.relation.child,
      feature: relation
    }, {
      layerId: this.relation.child,
      feature:originalRelation
    });
    d.resolve(relation);
    return d.promise();
  };

  this._createWorkflowOptions = function(options) {
    options = options || {};
    var options = {
      context: {
        session: this._currentWorkflow.getSession(),
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

  this.addRelation = function() {
    var self =this;
    var d = $.Deferred();
    var AddFeatureWorkflow = require('../../../workflows/addfeatureworkflow');
    GUI.setModal(false);
    var workflow = new AddFeatureWorkflow();
    var options = this._createWorkflowOptions();
    workflow.start(options)
      .then(function(outputs) {
        var relation = outputs.features[outputs.features.length - 1]; // vado a prende l'ultima inserrita
        // vado a settare il valore
        relation.set(self.relation.childField, self._curentFeatureFatherFieldValue);
        d.resolve(relation);
      })
      .fail(function(err) {
      })
      .always(function() {
        workflow.stop();
        GUI.setModal(true);
      });
    return d.promise();

  }
};

module.exports = RelationService;