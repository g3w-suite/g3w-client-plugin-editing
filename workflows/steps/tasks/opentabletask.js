const {
  inherit,
  base
} = g3wsdk.core.utils;
const {GUI} = g3wsdk.gui;
const {WorkflowsStack} = g3wsdk.core.workflow;
const TableComponent = require('../../../g3w-editing-components/table');
const EditingTask = require('./editingtask');

function OpenTableTask(options={}) {
  this._formIdPrefix = 'form_';
  base(this, options);
}

inherit(OpenTableTask, EditingTask);

const proto = OpenTableTask.prototype;

/**
 *
 * @param inputs
 * @param context
 * @returns {*}
 */
proto.run = function(inputs, context) {
  const d = $.Deferred();
  //set current plugin layout (right content)
  this.getEditingService().setCurrentLayout();
  const originalLayer = inputs.layer;
  const layerName = originalLayer.getName();
  const headers = originalLayer.getEditingFields();
  this._isContentChild = WorkflowsStack.getLength() > 1;
  const foreignKey = this._isContentChild && context.excludeFields ? context.excludeFields[0] :  null;
  const excludeFeatures = this._isContentChild && context.excludeFeatures;
  const capabilities = originalLayer.getEditingCapabilities();
  const editingLayer = originalLayer.getEditingLayer();
  let features = editingLayer.readEditingFeatures();
  if (excludeFeatures && features.length > 0) {

    features = features
      .filter(feature => {
        return Object
          .entries(excludeFeatures)
          .reduce((bool, [field, value]) => bool && feature.get(field) != value, true)
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

  GUI.disableSideBar(true);

  GUI.showUserMessage({
    type: 'loading',
    message: 'plugins.editing.messages.loading_table_data',
    autoclose: false,
    closable: false
  });

  setTimeout(() => {
    content.once('ready', () => setTimeout(()=> {
      GUI.closeUserMessage();
    }));

    GUI.showContent({
      content,
      //perc: 100,
      push: this._isContentChild,
      showgoback: false,
      closable: false
    });
  }, 300);

  return d.promise();
};

/**
 *
 * @param layerName
 * @returns {`form_${string}`}
 * @private
 */
proto._generateFormId = function(layerName) {
  return `${this._formIdPrefix}${layerName}`;
};

/**
 *
 */
proto.stop = function() {
  this.disableSidebar(false);
  GUI[this._isContentChild ? 'popContent' : 'closeContent']();
  //reset current plugin layout (right content) to application
  this.getEditingService().resetCurrentLayout();
};

module.exports = OpenTableTask;

