import TableVueObject    from '../../../components/Table.vue';

const {
  inherit,
  base
}                        = g3wsdk.core.utils;
const { WorkflowsStack } = g3wsdk.core.workflow;
const { GUI }            = g3wsdk.gui;
const { Component }      = g3wsdk.gui.vue;

const TableService       = require('../../../services/tableservice');
const EditingTask        = require('./editingtask');

/**
 * ORIGINAL SOURCE: g3w-client-plugin-editing/g3w-editing-components/table.js.js@3.6
 */
const InternalComponent = Vue.extend(TableVueObject);
const TableComponent = function(options={}) {
  base(this);
  const service = options.service || new TableService({ ...options });
  this.setService(service);
  const internalComponent = new InternalComponent({ service });
  this.setInternalComponent(internalComponent);
  internalComponent.state = service.state;
  service.once('ready', () => this.emit('ready'));
  this.unmount = function() {
    service.cancel();
    return base(this, 'unmount');
  };
};
inherit(TableComponent, Component);

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
  const exclude = this._isContentChild && context.exclude;
  const capabilities = originalLayer.getEditingCapabilities();
  const editingLayer = originalLayer.getEditingLayer();

  //get editing features
  let features = editingLayer.readEditingFeatures();

  if (exclude && features.length > 0) {
    const {value} = exclude;
    features = features.filter(feature => feature.get(foreignKey) != value);
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

