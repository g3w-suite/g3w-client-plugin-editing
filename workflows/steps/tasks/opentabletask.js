const inherit = g3wsdk.core.utils.inherit;
const base =  g3wsdk.core.utils.base;
const GUI = g3wsdk.gui.GUI;
const TableComponent = require('../../../table/vue/table');
const EditingTask = require('./editingtask');
const WorkflowsStack = g3wsdk.core.workflow.WorkflowsStack;

function OpenTableTask(options) {

  options = options || {};
  // prefisso delle nuove  feature
  this._formIdPrefix = 'form_';
  this._isContentChild = false;
  base(this, options);
}

inherit(OpenTableTask, EditingTask);

const proto = OpenTableTask.prototype;

// metodo eseguito all'avvio del tool
proto.run = function(inputs, context) {
  console.log('Open Table Task task run.......');
  const d = $.Deferred();
  const originalLayer = context.layer;
  const layerName = originalLayer.getName();
  this._isContentChild = !!(WorkflowsStack.getLength() > 1);
  const foreignKey = this._isContentChild ? context.excludeFields[0] :  null;
  // vado a recuperare i
  const editingLayer = inputs.layer;
  const features = editingLayer.getSource().readFeatures();
  GUI.showContent({
    content: new TableComponent({
      title: 'Edita ' + layerName,
      features: features,
      promise: d,
      isrelation: this._isContentChild,
      headers: originalLayer.getFieldsLabel(),
      context: context,
      inputs: inputs,
      fatherValue: context.fatherValue,
      foreignKey: foreignKey
    }),
    push: this._isContentChild,
    showgoback: false,
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

