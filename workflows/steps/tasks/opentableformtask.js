var inherit = g3wsdk.core.utils.inherit;
var base =  g3wsdk.core.utils.base;
var GUI = g3wsdk.gui.GUI;
var EditingTask = require('./editingtask');

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
  var EditingFormComponent = require('../../../form/editingform');
  this._isChild = context.isChild || GUI.getContentLength();
  console.log('Open Table Form Task task run.......');
  var d = $.Deferred();
  var session = context.session;
  // vado a recuperare i
  var layer = context.layer;
  var layerId = layer.getId();
  var excludeFields = context.excludeFields;
  var feature = inputs.features.length ? inputs.features[inputs.features.length - 1] : layer.createNewFeature();
  var originalFeature = feature ? feature.clone() : null;
  var fields = layer.getFieldsWithValues(feature, {
    exclude: excludeFields
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
    showgoback: false, // se è figlo evito di visualizzare il go back
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
          }  else {
            //vado ad aggiungere la feature
            if (layer.isPkEditable())
              _.forEach(fields, function(field) {
                if (field.name == feature.getPk())
                  feature.set(feature.getPk(), field.value);
              });
            self._isChild ? layer.getSource().addFeature(feature) : session.getFeaturesStore().addFeature(feature);
            session.pushAdd(layerId, feature);
          }
          inputs.features.length ? null : inputs.features.push(feature);
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

