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
  const headers = originalLayer.getEditingFields();
  this._isContentChild = !!(WorkflowsStack.getLength() > 1);
  const foreignKey = this._isContentChild ? context.excludeFields[0] :  null;
  // vado a recuperare i
  const editingLayer = inputs.layer;
  const features = editingLayer.getSource().readFeatures();
  const action = this._isContentChild ? 'Link ' :  'Edita ';
  const content = new TableComponent({
    title:  action + layerName,
    features,
    promise: d,
    isrelation: this._isContentChild,
    headers,
    context,
    inputs,
    fatherValue: context.fatherValue,
    foreignKey
  });
  GUI.showContent({
    content,
    push: this._isContentChild,
    showgoback: !features.length, // if no features show back button
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

