var inherit = g3wsdk.core.utils.inherit;
var base =  g3wsdk.core.utils.base;
var GUI = g3wsdk.gui.GUI;
var EditingTask = require('./editingtask');
var EditingFormComponent = require('../../../form/editingform');

function OpenFormTask(options) {

  options = options || {};
  // prefisso delle nuove  feature
  this._formIdPrefix = 'form_';
  this._isChild = false;
  base(this, options);
}

inherit(OpenFormTask, EditingTask);

module.exports = OpenFormTask;

var proto = OpenFormTask.prototype;

// metodo eseguito all'avvio del tool
proto.run = function(inputs, context) {
  var self = this;
  this._isChild = context.isChild;
  console.log('Open Form Task task run.......');
  var d = $.Deferred();
  var session = context.session;
  // vado a recuperare i
  var layer = context.layer;
  var layerId = layer.getId();
  var excludeFields = context.excludeFields;
  var feature = inputs.features[inputs.features.length - 1];
  var originalFeature = feature.clone();
  var fields = layer.getFieldsWithValues(feature, {
    exclude: excludeFields,
    pkeditable: feature.isNew()
  });
  var showForm  = GUI.showContentFactory('form');
  var layerName = layer.getName();
  var formService = showForm({
    formComponent: EditingFormComponent,
    title: "Edita attributi "+ layerName,
    name: "Edita attributi "+ layerName,
    id: self._generateFormId(layerName),
    dataid: layerName,
    layer: layer,
    pk: layer.getPk(),
    isnew: feature.isNew(),
    fields: fields,
    relationsOptions:  {
      context: context,
      inputs: inputs
    },
    modal: true,
    push: this._isChild, // indica se posso aggiungere form
    showgoback: !this._isChild, // se è figlo evito di visualizzare il go back
    buttons:[{
        title: "Salva",
        type: "save",
        class: "btn-success",
        cbk: function(fields) {
          // vado a settare per quel layer i valori ai campi
          layer.setFieldsWithValues(feature, fields);
          // verifico se non è nuovo
          if (!feature.isNew()) {
            session.pushUpdate(layerId, feature, originalFeature);
          } 
          GUI.setModal(false);
          d.resolve(inputs);
        }
      },
      {
        title: "Cancella",
        type: "cancel",
        class: "btn-primary",
        cbk: function() {
          GUI.setModal(false);
          d.reject(inputs);
        }
      }
    ]
  });
  context.formService = formService;
  return d.promise();
};


proto._generateFormId = function(layerName) {
  return this._formIdPrefix + layerName;
};


// metodo eseguito alla disattivazione del tool
proto.stop = function() {
  console.log('stop openform task ...');
  this._isChild ? GUI.popContent() : GUI.closeForm();
  return true;
};

