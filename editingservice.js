var inherit = g3wsdk.core.utils.inherit;
var base =  g3wsdk.core.utils.base;
//prendo il plugin service di core
var PluginService = g3wsdk.core.plugin.PluginService;
var CatalogLayersStoresRegistry = g3wsdk.core.catalog.CatalogLayersStoresRegistry;
var MapLayersStoreRegistry = g3wsdk.core.map.MapLayersStoreRegistry;
var LayersStore = g3wsdk.core.layer.LayersStore;
var PluginConfig = require('./pluginconfig');
var ToolBoxesFactory = require('./toolboxes/toolboxesfactory');

function EditingService() {

  var self = this;
  base(this);
  // prprietà che contiene i layer vettoriali
  this._vectorLayers = [];
  // proprietà che contiene i controlli per l'editing
  this._toolboxes = [];
  // oggetto contenitore di dipendenze
  this._dependencies = {};
  // prendo tutti i layers del progetto corrente che si trovano sul
  // CATALOGO quelli naturalmente editabili
  this.layers = CatalogLayersStoresRegistry.getLayers({
    EDITABLE: true
  });
  this.init = function(config) {
    var layersStore = new LayersStore({
      id: 'editing'
    });
    //vado ad aggiungere il layersstore alla maplayerssotreregistry
    MapLayersStoreRegistry.addLayersStore(layersStore);
    // vado a settare l'url di editing aggiungendo l'id del
    // progetto essendo editing api generale
    //config.baseurl = config.baseurl + this.project.getId() + '/';
    this.config = config;
    var vectorLayer;
    var editor;
    //ciclo su ogni layer
    _.forEach(this.layers, function(layer) {
      // vado a chiamare la funzione che mi permette di
      // estrarre la versione vettoriale del layer di partenza
      vectorLayer = layer.getLayerForEditing();
      //aggiungo il layer al layersstore
      layersStore.addLayer(vectorLayer);
      // aggiungo il vectorlayer
      self._vectorLayers.push(vectorLayer);
      // estraggo l'editor
      editor = vectorLayer.getEditor();
      // vado ad aggiungere un nuovo toolbox passandogli l'editor (e quindi il layer associato)
      self.addToolBox(editor);
    });
  };
}

inherit(EditingService, PluginService);

var proto = EditingService.prototype;

//funzione che server per aggiungere un editor
proto.addToolBox = function(editor) {
  var toolbox = ToolBoxesFactory.build(editor);
  this._toolboxes.push(toolbox);
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
  // vado a chiamare lo stop di ogni toolbox
  _.forEach(this._toolboxes, function(toolbox) {
      toolbox.stop();
  });
  this._stopEditing();
};

module.exports = new EditingService;