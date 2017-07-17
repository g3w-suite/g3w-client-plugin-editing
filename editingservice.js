var inherit = g3wsdk.core.utils.inherit;
var base =  g3wsdk.core.utils.base;
//prendo il plugin service di core
var PluginService = g3wsdk.core.plugin.PluginService;
var CatalogLayersStoresRegistry = g3wsdk.core.catalog.CatalogLayersStoresRegistry;
var PluginConfig = require('./pluginconfig');
var Session = g3wsdk.core.editing.Session;
var ToolBoxesFactory = require('./toolboxes/toolboxesfactory');

function EditingService() {

  var self = this;
  var options = {};
  base(this, options);
  this._session = null;
  // prprietà che contiene i layer vettoriali
  this._vectorLayers = [];
  // proprietà che contiene i controlli per l'editing
  this._toolboxes = [];
  // prendo tutti i layers del progetto corrente che si trovano sul
  // CATALOGO quelli naturalmente editabili
  this.layers = CatalogLayersStoresRegistry.getLayers({
    EDITABLE: true
  });
}

inherit(EditingService, PluginService);

var proto = EditingService.prototype;

proto.init = function(config) {
  var self = this;
  // vado a settare l'url di editing aggiungendo l'id del
  // progetto essendo editing api generale
  //config.baseurl = config.baseurl + this.project.getId() + '/';
  this.config = config;
  // inizializzo la sessione
  this._session = new Session();
  var vectorLayer;
  var editor;
  //temporaneo giusto per ottenere il vettoriale del layer
  // per poter eseguire l'editing
  _.forEach(this.layers, function(layer) {
    // vado a chiamare la funzione che mi permette di
    // estrarre la versione vettoriale del layer di partenza
    vectorLayer = layer.getLayerForEditing();
    // aggiungo il vectorlayer
    self._vectorLayers.push(vectorLayer);
    // estraggo l'editor
    editor = vectorLayer.getEditor();
    // vado ad aggiungere un editor control
    this.addEditorControl(editor);
    // aggiungo l'editor alla sessione
    self._session.addEditor(editor);
  });
  
};

//funzione che server per aggiungere un editor
proto.addEditorControl = function(editor) {
  var editorControl = ToolBoxesFactory.build(editor);
  this._toolboxes.push(editorControl);
};

proto.getToolBoxes = function() {
  return this._toolboxes;
};

proto.getVectorLayers = function() {
  return this._vectorLayers;
};

proto._cancelOrSave = function(){
  return resolve();
};

proto._stopEditing = function(){

};

proto.stop = function() {
  this._stopEditing();
};

module.exports = new EditingService;