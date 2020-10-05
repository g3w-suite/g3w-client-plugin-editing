const inherit = g3wsdk.core.utils.inherit;
const base =  g3wsdk.core.utils.base;
const t = g3wsdk.core.i18n.tPlugin;
const GUI = g3wsdk.gui.GUI;
const WorkflowsStack = g3wsdk.core.workflow.WorkflowsStack;
const EditingTask = require('./editingtask');
const EditingFormComponent = require('../../../form/editingform');

function OpenFormTask(options={}) {
  this._edit_relations = options.edit_relations === undefined ? true : options._edit_relations;
  this._formIdPrefix = 'form_';
  this._isContentChild = false;
  this._feature;
  this._originalLayer;
  this._editingLayer;
  this._layerName;
  this._originalFeature;
  this._fields;
  this._session;
  this._editorFormStructure;
  this._multi = options.multi || false; // set if can handle multi edit features
  base(this, options);
}

inherit(OpenFormTask, EditingTask);

module.exports = OpenFormTask;

const proto = OpenFormTask.prototype;

proto._getFieldUniqueValuesFromServer = function(layer, uniqueFields) {
  const fieldsName = _.map(uniqueFields, (field) => {
    return field.name
  });
  layer.getWidgetData({
    type: 'unique',
    fields: fieldsName.join()
  }).then( response => {
    const data = response.data;
    _.forEach(data, (values, fieldName) => {
      values.forEach((value) => {
        uniqueFields[fieldName].input.options.values.push(value);
      })
    })
  }).fail((err) => {
    console.log(err)
  })
};

proto._getUniqueFieldsType = function(fields) {
  const uniqueFields = {};
  fields.forEach((field) => {
     if (field.input && field.input.type === 'unique')
       uniqueFields[field.name] = field;
  });
  return uniqueFields;
};

proto._getForm = function(inputs, context) {
  const excludeFields = context.excludeFields;
  this._isContentChild = !!(WorkflowsStack.getLength() > 1);
  this._session = context.session;
  this._originalLayer = inputs.layer;
  this._editingLayer = this._originalLayer.getEditingLayer();
  this._layerName = this._originalLayer.getName();
  this._feature = inputs.features[inputs.features.length - 1];
  this._originalFeature = this._feature.clone();
  this._fields = this._originalLayer.getFieldsWithValues(this._feature, {
    exclude: excludeFields
  });
  this._fields = this._multi ? this._fields.map(field => {
    const _field = JSON.parse(JSON.stringify(field));
    _field.value = null;
    _field.validate.required = false;
    console.log(_field)
    return _field;
  }).filter(field => !field.pk) : this._fields;
  if (this._originalLayer.hasFormStructure()) {
    const editorFormStructure = this._originalLayer.getEditorFormStructure();
    this._editorFormStructure = editorFormStructure.length ? editorFormStructure : null;
  }
  const uniqueFields = this._getUniqueFieldsType(this._fields);
  !_.isEmpty(uniqueFields) && this._getFieldUniqueValuesFromServer(this._originalLayer, uniqueFields);
  return GUI.showContentFactory('form');
};

proto._cancelFnc = function(promise, inputs) {
  return function() {
    GUI.setModal(false);
    this.fireEvent('closeform', {});
    promise.reject(inputs);
  }
};

proto._saveFnc = function(promise, context, inputs) {
  return function(fields) {
    const session = context.session;
    const layerId = this._originalLayer.getId();
    if (!this._multi) {
      this._originalLayer.setFieldsWithValues(this._feature, fields);
      const newFeature = this._feature.clone();
      if (this._isContentChild) {
        inputs.relationFeature = {
          newFeature,
          originalFeature: this._originalFeature
        };
      }
      this.fireEvent('saveform', {
        newFeature,
        originalFeature: this._originalFeature
      }).then(()=> {
        session.pushUpdate(layerId, newFeature, this._originalFeature);
        GUI.setModal(false);
        promise.resolve(inputs);
      })
    } else {
      const fieldsNotNull = fields.filter(field => field.value !== null);
      console.log(inputs.features);
      promise.resolve(inputs);
    }
  }
};

proto.startForm = function(options = {}) {
  const { inputs, context, promise } = options;
  const { session } = context;
  const formComponent = options.formComponent || EditingFormComponent;
  const Form = this._getForm(inputs, context);
  const layerId = this._originalLayer.getId();
  const isnew = this._originalFeature.isNew();
  const formService = Form({
    formComponent,
    title: "plugins.editing.editing_attributes",
    name: this._layerName,
    id: this._generateFormId(this._layerName),
    dataid: this._layerName,
    layer: this._originalLayer,
    isnew,
    fields: this._fields,
    context_inputs: !this._multi && this._edit_relations && {
      context,
      inputs
    },
    formStructure: this._editorFormStructure,
    modal: true,
    perc: this._editorFormStructure ? 100 : null,
    push: this._isContentChild,
    showgoback: !this._isContentChild,
    buttons:[{
      title: this._isContentChild ? "plugins.editing.form.buttons.save_and_back" : "plugins.editing.form.buttons.save",
      type: "save",
      class: "btn-success",
      cbk: this._saveFnc(promise, context, inputs).bind(this)
    }, {
      title: "plugins.editing.form.buttons.cancel",
      type: "cancel",
      class: "btn-danger",
      cbk: this._cancelFnc(promise, inputs).bind(this)
    }]
  });
  this.fireEvent('openform',
    {
      layerId,
      session,
      feature: this._originalFeature,
      formService
    });
  WorkflowsStack.getCurrent().setContextService(formService);
};

proto.run = function(inputs, context) {
  const d = $.Deferred();
  this.startForm({
    inputs,
    context,
    promise: d
  });
  this.disableSidebar(true);
  return d.promise();
};

proto._generateFormId = function(layerName) {
  return this._formIdPrefix + layerName;
};

proto.stop = function() {
  this.disableSidebar(false);
  this._isContentChild ? GUI.popContent() : GUI.closeForm();
};

