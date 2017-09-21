var inherit = g3wsdk.core.utils.inherit;
var base =  g3wsdk.core.utils.base;
var GUI = g3wsdk.gui.GUI;
var EditingTask = require('./editingtask');
var EditingFormComponent = require('../../../form/vue/editingform');

function OpenFormTask(options) {

  options = options || {};
  // prefisso delle nuove  feature
  this._newPrefix = '_new_';
  base(this, options);
}

inherit(OpenFormTask, EditingTask);

module.exports = OpenFormTask;

var proto = OpenFormTask.prototype;

// metodo eseguito all'avvio del tool
proto.run = function(inputs, context) {
  var EditingService = require('../../../editingservice');
  var context = context;
  var self = this;
  console.log('Open Form Task task run.......');
  var d = $.Deferred();
  var session = context.session;
  // vado a recuperare i
  var feature = inputs.features[0];
  var originalFeature = feature.clone();
  originalFeature.update();
  var fields = layer.getFieldsWithValues(feature);
  var showForm  = GUI.showContentFactory('form');
  var layerName = layer.getName();
  var relations = [];
  var layer = session.getEditor().getLayer();
  if (layer.isFather()) {
    relations = layer.getRelations().getArray();
    // vado a filtrare le relazioni per quelle che son o effettivamente in editing
    relations = EditingService.filterRelationsInEditing(relations);
    if (!feature.isNew()) {
      EditingService.getRelationsByFeature(relations, feature)
    }
  }
  showForm({
    formComponent: EditingFormComponent,
    title: 'Edit Feature',
    name: "Edita attributi "+ layerName,
    formId: self._generateFormId(layerName),
    dataid: layerName,
    layer: layer,
    pk: layer.getPk(),
    isnew: feature.isNew(),
    fields: fields,
    relations:  {
      relations: relations,
      options: {
        task: this,
        context: context,
        inputs: inputs
      }
    },
    modal: true,
    buttons:[{
        title: "Salva",
        type: "save",
        class: "btn-success",
        cbk: function(fields) {
          // vado a settare per quel layer i valori ai campi
          layer._setFieldsWithValues(feature, fields, relations);
          // verifico se nuovo
          if (!feature.isNew()) {
            // lo setto come update
            feature.update();
            session.push({
              layerId: session.getId(),
              feature: feature
            }, {
              layerId: session.getId(),
              feature:originalFeature
            });
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
  return d.promise();
};


proto._generateFormId = function() {
  return this._newPrefix+Date.now();
};



// metodo eseguito alla disattivazione del tool
proto.stop = function() {
  console.log('stop openform task ...');
  GUI.closeForm();
  GUI.setModal(false);
  return true;
};

