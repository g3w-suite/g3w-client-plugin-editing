const inherit = g3wsdk.core.utils.inherit;
const base =  g3wsdk.core.utils.base;
const t = g3wsdk.core.i18n.tPlugin;
const GUI = g3wsdk.gui.GUI;
const WorkflowsStack = g3wsdk.core.workflow.WorkflowsStack;
const ComponentsFactory = g3wsdk.gui.ComponentsFactory;
const EditingTask = require('./editingtask');
const EditingFormComponent = require('../../../form/editingform');

function OpenFormTask(options={}) {
  this._formIdPrefix = 'form_';
  this._isContentChild = false;
  this._feature;
  this._originalLayer;
  this._editingLayer;
  this._layerName;
  this._originalFeature;
  this._pk;
  this._fields;
  this._session;
  this._editorFormStructure;
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
  }).then(function(response) {
    const data = response.data;
    _.forEach(data, function(values, fieldName) {
      _.forEach(values, function(value) {
        uniqueFields[fieldName].input.options.values.push(value);
      })
    })
  }).fail(() => {
    console.log('errore')
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
  this._originalLayer = context.layer;
  this._editingLayer = inputs.layer;
  this._pk = this._originalLayer.getPk();
  this._layerName = this._originalLayer.getName();
  // vado a prendere l'ultima feature
  this._feature = inputs.features[inputs.features.length - 1];
  this._originalFeature = this._feature.clone();
  this._fields = this._originalLayer.getFieldsWithValues(this._feature, {
    exclude: excludeFields
  });
  this._editorFormStructure = this._originalLayer.getEditorFormStructure();
  const uniqueFields = this._getUniqueFieldsType(this._fields);
  if (!_.isEmpty(uniqueFields))
    this._getFieldUniqueValuesFromServer(this._originalLayer, uniqueFields);
  return GUI.showContentFactory('form');
};

proto._cancelFnc = function(promise) {
  return function() {
    GUI.setModal(false);
    promise.reject();
  }
};

proto._saveFnc = function(promise, inputs) {
  return function(fields) {
    const newFeature = this._feature;
    const layerId = this._originalLayer.getId();
    this._originalLayer.setFieldsWithValues(newFeature, fields);
    if (newFeature.isNew() && this._originalLayer.isPkEditable()) {
        fields.forEach((field) => {
          if (field.name === newFeature.getPk())
            newFeature.set(newFeature.getPk(), field.value);
        });
    }
    this._session.pushUpdate(layerId, newFeature, this._originalFeature);
    GUI.setModal(false);
    promise.resolve(inputs);
  }
};

proto.startForm = function(options = {}) {
  const inputs = options.inputs;
  const context = options.context;
  const promise = options.promise;
  const formComponent = options.formComponent || EditingFormComponent;
  const Form = this._getForm(inputs, context);
  const formService = Form({
    formComponent,
    title: t("editing.editing_attributes") + " " + this._layerName,
    name: t("editing.editing_attributes") + " " + this._layerName,
    id: this._generateFormId(this._layerName),
    dataid: this._layerName,
    layer: this._originalLayer,
    pk: this._pk,
    isnew: this._originalFeature.isNew(),
    fields: this._fields,
    context_inputs:  {
      context,
      inputs
    },
    formStructure: this._editorFormStructure,
    modal: true,
    perc: this._editorFormStructure ? 100 : null,
    push: this._isContentChild, // indica se posso aggiungere form
    showgoback: !this._isContentChild, // se è figlo evito di visualizzare il go back
    buttons:[{
      title: t("editing.form.buttons.save"),
      type: "save",
      class: "btn-success",
      cbk: _.bind(this._saveFnc(promise, inputs), this)
    }, {
      title: t("editing.form.buttons.cancel"),
      type: "cancel",
      class: "btn-primary",
      cbk: _.bind(this._cancelFnc(promise),this)
    }]
  });
  const graphComponent = ComponentsFactory.build({
    type: 'graph',
    options: {
      type:'z',
      xhr: {
        url: "/progeo/api/profile/3/",
        data: {
          id: 13
        }
      }

    }
  });
  formService.addComponent({
    id: "Profilo",
    component: graphComponent._vueInternalComponent
  });
  WorkflowsStack.getCurrent().setContextService(formService);
};

// metodo eseguito all'avvio del tool
proto.run = function(inputs, context) {
  const d = $.Deferred();
  this.startForm({
    inputs: inputs,
    context: context,
    promise: d
  });
  return d.promise();
};

// genera il from id
proto._generateFormId = function(layerName) {
  return this._formIdPrefix + layerName;
};

// metodo eseguito alla disattivazione del tool
proto.stop = function() {
  this._isContentChild ? GUI.popContent() : GUI.closeForm();
};

