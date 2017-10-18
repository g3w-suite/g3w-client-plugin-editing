var inherit = g3wsdk.core.utils.inherit;
var base =  g3wsdk.core.utils.base;
var GUI = g3wsdk.gui.GUI;
var WorkflowsStack = g3wsdk.core.workflow.WorkflowsStack;
var EditingTask = require('./editingtask');
var EditingFormComponent = require('../../../form/editingform');

function OpenFormTask(options) {

  options = options || {};
  // prefisso delle nuove  feature
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
  base(this, options);

}

inherit(OpenFormTask, EditingTask);

module.exports = OpenFormTask;

var proto = OpenFormTask.prototype;

proto._getForm = function(inputs, context) {
  this._isContentChild = !!(WorkflowsStack.getLength() > 1);
  this._session = context.session;
  // vado a recuperare i
  this._originalLayer = context.layer;
  this._editingLayer = inputs.layer;
  this._pk = this._originalLayer.getPk();
  this._layerName = this._originalLayer.getName();
  var excludeFields = context.excludeFields;
  // vado a prendere l'ultima feature
  this._feature = inputs.features[inputs.features.length - 1]; 
  this._originalFeature = this._feature.clone();
  this._fields = this._originalLayer.getFieldsWithValues(this._feature, {
    exclude: excludeFields
  });
  return GUI.showContentFactory('form');
};

proto._cancelFnc = function(promise, inputs) {
    GUI.setModal(false);
    promise.reject(inputs);
};

proto._saveFnc = function(promise, inputs) {
  return function(fields) {
    var newFeature = this._feature;
    var layerId = this._originalLayer.getId();
    // vado a settare per quel layer i valori ai campi
    this._originalLayer.setFieldsWithValues(newFeature, fields);
    console.log(newFeature);
    // verifico se non è nuovo
    if (!newFeature.isNew()) {
      this._session.pushUpdate(layerId, newFeature, this._originalFeature);
    } else {
      //vado ad aggiungere la feature
      if (this._originalLayer.isPkEditable())
        _.forEach(fields, function (field) {
          if (field.name == newFeature.getPk())
            newFeature.set(newFeature.getPk(), field.value);
        });
    }
    GUI.setModal(false);
    promise.resolve(inputs);
  }
};

proto.startForm = function(options) {
  options = options || {};
  var self = this;
  var inputs = options.inputs;
  var context = options.context;
  var promise = options.promise;
  var formComponent = options.formComponent || EditingFormComponent;
  var Form = this._getForm(inputs, context);
  var formService = Form({
    formComponent: formComponent,
    title: "Edita attributi "+ this._layerName,
    name: "Edita attributi "+ this._layerName,
    id: self._generateFormId(this._layerName),
    dataid: this._layerName,
    layer: this._originalLayer,
    pk: this._pk,
    isnew: this._originalFeature.isNew(),
    fields: this._fields,
    relationsOptions:  {
      context: context,
      inputs: inputs
    },
    modal: true,
    push: this._isContentChild, // indica se posso aggiungere form
    showgoback: !this._isContentChild, // se è figlo evito di visualizzare il go back
    buttons:[{
      title: "Salva",
      type: "save",
      class: "btn-success",
      cbk: _.bind(self._saveFnc(promise, inputs), self)
    }, {
      title: "Cancella",
      type: "cancel",
      class: "btn-primary",
      cbk: _.bind(self._cancelFnc, self, promise, inputs)
    }]
  });
  context.formService = formService;
};

// metodo eseguito all'avvio del tool
proto.run = function(inputs, context) {
  var d = $.Deferred();
  this.startForm({
    inputs: inputs,
    context: context,
    promise: d
  });
  return d.promise();
};


proto._generateFormId = function(layerName) {
  return this._formIdPrefix + layerName;
};

// metodo eseguito alla disattivazione del tool
proto.stop = function() {
  this._isContentChild ? GUI.popContent() : GUI.closeForm();
};

