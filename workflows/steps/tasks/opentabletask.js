const inherit = g3wsdk.core.utils.inherit;
const base =  g3wsdk.core.utils.base;
const GUI = g3wsdk.gui.GUI;
const TableComponent = require('../../../table/vue/table');
const EditingTask = require('./editingtask');
const WorkflowsStack = g3wsdk.core.workflow.WorkflowsStack;

function OpenTableTask(options={}) {
  this._formIdPrefix = 'form_';
  base(this, options);
}

inherit(OpenTableTask, EditingTask);

const proto = OpenTableTask.prototype;

proto.run = function(inputs, context) {
  const d = $.Deferred();
  const originalLayer = context.layer;
  const layerName = originalLayer.getName();
  const headers = originalLayer.getEditingFields();
  this._isContentChild = WorkflowsStack.getLength() > 1;
  const foreignKey = this._isContentChild ? context.excludeFields[0] :  null;
  const editingLayer = inputs.layer;
  const features = editingLayer.readEditingFeatures();
  const content = new TableComponent({
    title: `${layerName}`,
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

proto.stop = function() {
  this._isContentChild ? GUI.popContent() : GUI.closeForm();
};

module.exports = OpenTableTask;

