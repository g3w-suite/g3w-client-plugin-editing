var inherit = g3wsdk.core.utils.inherit;
var base =  g3wsdk.core.utils.base;
var GUI = g3wsdk.gui.GUI;
var TableComponent = require('../../../table/vue/table');
var EditingTask = require('./editingtask');
var WorkflowsStack = g3wsdk.core.workflow.WorkflowsStack;

function OpenTableTask(options) {

  options = options || {};
  // prefisso delle nuove  feature
  this._formIdPrefix = 'form_';
  this._isContentChild = false;
  base(this, options);
}

inherit(OpenTableTask, EditingTask);

var proto = OpenTableTask.prototype;

// metodo eseguito all'avvio del tool
proto.run = function(inputs, context) {
  var self = this;
  console.log('Open Table Task task run.......');
  var d = $.Deferred();
  var originalLayer = context.layer;
  var layerName = originalLayer.getName();
  this._isContentChild = !!(WorkflowsStack.getLength() > 1);
  var foreignKey = this._isContentChild ? context.excludeFields[0] :  null;
  // vado a recuperare i
  var editingLayer = inputs.layer;
  var features = this._isContentChild ? originalLayer.getSource().readFeatures() :  editingLayer.getFeaturesStore().readFeatures();
  GUI.showContent({
    content: new TableComponent({
      title: 'Edita ' + layerName,
      features: features,
      promise: d,
      isrelation: self._isContentChild,
      headers: originalLayer.getFieldsLabel(),
      context: context,
      inputs: inputs,
      fatherValue: context.fatherValue,
      foreignKey: foreignKey
    }),
    push: this._isContentChild,
    closable: false
  });
  return d.promise();
};

proto._generateFormId = function(layerName) {
  return this._formIdPrefix + layerName;
};


// metodo eseguito alla disattivazione del tool
proto.stop = function() {
  console.log('stop open table task ...');
  this._isContentChild ? GUI.popContent() : GUI.closeForm();
  return true;
};

module.exports = OpenTableTask;

