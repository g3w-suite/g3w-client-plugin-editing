import SIGNALER_IIM_CONFIG from '../../../global_plugin_data';
const {base, inherit} = g3wsdk.core.utils;
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
  const {signaler_layer_id} = SIGNALER_IIM_CONFIG;
  const originalLayer = inputs.layer;
  const layerName = originalLayer.getName();
  const layerId = originalLayer.getId();
  const headers = originalLayer.getEditingFields();
  this._isContentChild = WorkflowsStack.getLength() > 1;
  const foreignKey = this._isContentChild ? context.excludeFields[0] :  null;
  const exclude = this._isContentChild && context.exclude;
  const capabilities = originalLayer.getEditingCapabilities();
  const editingLayer = originalLayer.getEditingLayer();
  let features = editingLayer.readEditingFeatures();
  if (exclude && features.length) {
    const {value} = exclude;
    features = features.filter(feature => {
      const featureValue = feature.get(foreignKey);
      return featureValue != value;
    })
  }
  const content = new TableComponent({
    title: `${layerName}`,
    features,
    promise: d,
    push: this._isContentChild,
    headers,
    context,
    inputs,
    capabilities,
    fatherValue: context.fatherValue,
    foreignKey
  });
  GUI.showContent({
    content,
    split: 'v',
    showgoback: false,
    closable: false
  });
  this.disableSidebar(true);
  layerId === signaler_layer_id && this.getEditingService().subscribe('savedfeature', d.resolve);
  return d.promise();
};

proto._generateFormId = function(layerName) {
  return `${this._formIdPrefix}${layerName}`;
};

proto.stop = function() {
  this.disableSidebar(false);
  this._isContentChild ? GUI.popContent() : GUI.closeContent();
};

module.exports = OpenTableTask;

