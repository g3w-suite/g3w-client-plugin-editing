var inherit = g3wsdk.core.utils.inherit;
var base =  g3wsdk.core.utils.base;
var GUI = g3wsdk.gui.GUI;
var EditingTask = require('./editingtask');


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
  var self = this;
  console.log('Open Form Task task run.......');
  var d = $.Deferred();
  var session = context.session;
  // vado a recuperare i
  var layer = session.getEditor().getLayer();
  var feature = inputs.features[0];
  var fields = layer.getFieldsWithValues(feature);
  var relations = layer.getRelations();
  var showForm  = GUI.showContentFactory('form');
  var layerName = layer.getName();
  showForm({
    provider: self,
    name: "Edita attributi "+ layerName,
    formId: self._generateFormId(layerName),
    dataid: layerName,
    layer: layer,
    pk: layer.getPk(),
    isnew: feature.isNew(),
    fields: fields,
    relations: [],
    relationOne: null,//self.checkOneRelation,
    tools: [],//self._formTools,
    buttons:[
      {
        title: "Salva",
        type: "save",
        class: "btn-danger",
        cbk: function(fields, relations) {
          self._setFieldsWithValues(feature, fields, relations);
          if (!feature.isNew()) {
            feature.update();
            session.push({
              layerId: session.getId(),
              feature: feature
            })
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

proto._isNewFeature = function(fid) {
  if (fid) {
    return fid.toString().indexOf(this._newPrefix) == 0;
  }
  return true;
};


// viene chamato quando si preme ad esempio Salva sul Form degli
// attributi di una feature
proto._setFieldsWithValues = function(feature, fields, relations) {
  var attributes = {};
  _.forEach(fields, function(field) {
    // vado a verificares se il campo è primary key e se è editable
    if (feature.getPkFieldName() == field.name && field.editable && feature.isNew()) {
      feature.setId(field.value)
    }
    // mi serve nel caso delle select ch devo forzare il valore a 'null'
    if (field.value == 'null') {
      field.value = null;
    }
    attributes[field.name] = field.value;
  });
  // setto i campi della feature con i valori editati nel form
  feature.setProperties(attributes);
  if (relations) {
    // se ci sono relazioni vado a settare i dai delle relazioni nel layervettoriale originale
    //this.layer.setRelationsData(feature.getId(), relations);
  }
};

//funzione che in base alla feature passata recupera le relazioni associata ad essa
proto._getRelationsWithValues = function(feature) {
  var fid = feature.getId();
  //verifica se il layer ha relazioni
  // restituisce il valore del campo _relation (se esiste è un array) del vectorLayer
  if (this._layer.hasRelations()) {
    var fieldsPromise;
    // se non ha fid vuol dire che è nuovo e senza attributi, quindi prendo i fields vuoti
    if (!fid) {
      fieldsPromise = this._layer.getRelationsWithValues();
    }
    // se per caso ha un fid ma è un vettoriale nuovo
    else if (!this._layer.getFeatureById(fid)){
      // se questa feature, ancora non presente nel vectorLayer, ha comunque i valori delle FKs popolate, allora le estraggo
      if (this._layer.featureHasRelationsFksWithValues(feature)){
        var fks = this._layer.getRelationsFksWithValuesForFeature(feature);
        fieldsPromise = this._layer.getNewRelationsWithValuesFromFks(fks);
      }
      // altrimenti prendo i fields vuoti
      else {
        fieldsPromise = this._layer.getRelationsWithValues(fid);
      }
    }
    // se invece è una feature già presente e quindi non nuova
    // verifico se ha dati delle relazioni già  editati
    else {
      var hasEdits = this._editBuffer.hasRelationsEdits(fid);
      if (hasEdits){
        var relationsEdits = this._editBuffer.getRelationsEdits(fid);
        var relations = this._layer.getRelations();
        _.forEach(relations,function (relation) {
          relation.elements = _.cloneDeep(relationsEdits[relation.name]);
        });
        fieldsPromise = resolve(relations);
      }
      // se non ce li ha vuol dire che devo caricare i dati delle relazioni da remoto
      else {
        fieldsPromise = this._layer.getRelationsWithValues(fid);
      }
    }
  }
  else {
    // nel caso di nessuna relazione risolvo la promise
    // passando il valore null
    fieldsPromise = resolve(null);
  }
  return fieldsPromise;
};


// metodo eseguito alla disattivazione del tool
proto.stop = function() {
  console.log('stop openform task ...');
  GUI.closeForm();
  GUI.setModal(false);
  return true;
};

