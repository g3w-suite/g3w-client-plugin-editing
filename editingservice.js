var inherit = g3wsdk.core.utils.inherit;
var base =  g3wsdk.core.utils.base;
//prendo il plugin service di core
var PluginService = g3wsdk.core.plugin.PluginService;
var CatalogLayersStoresRegistry = g3wsdk.core.catalog.CatalogLayersStoresRegistry;
var Editor = g3wsdk.core.editing.Editor;
var ProjectsRegistry = g3wsdk.core.project.ProjectsRegistry;
var PluginConfig = require('./pluginconfig');

function EditingService() {

  var self = this;
  var options = {};
  base(this, options);

  // prendo tutti i layers del progetto corrente che si trovano sul
  // CATALOGO quelli naturalmente editabili
  this.layers = CatalogLayersStoresRegistry.getLayers({
    EDITABLE: true
  });
}

inherit(EditingService, PluginService);

var proto = EditingService.prototype;

proto.init = function(config) {
  // vado a settare l'url di editing aggiungendo l'id del
  // progetto essendo editng api generale
  //config.baseurl = config.baseurl + this.project.getId() + '/';
  this.config = config;
};

proto.createLayersConfig = function() {
  var self = this;
  var pluginLayers = [];
  //vado a prelevare i layer name del plugin
  _.forEach(this.config.layers, function(value, name) {
    pluginLayers.push(name);
  });
  // filtro i layers del progetto con quelli del plugin
  this.layers = _.filter(this.layers, function(layer) {
    return pluginLayers.indexOf(layer.state.id) > -1;
  });
  // creo la struttura per poter inzializzare il pannello dell'editing
  var layersConfig = {
    layerCodes: {},
    layers: {},
    editorsToolBars: {},
    editorClass : {}
  };
  var layerConfig;
  _.forEach(this.layers, function(layer) {
    layerConfig = self.createLayerConfig(layer);
    layersConfig.layerCodes[layer.state.id] = layer.state.id;
    layersConfig.layers[layer.state.id] = layerConfig.layer;
    layersConfig.editorsToolBars[layer.state.id] = layerConfig.editor;
    layersConfig.editorClass[layer.state.id] = Editor;
  });
  return layersConfig;
};

//funzione che server per aggiungere un editor
proto.addEditor = function(editor) {
  var editorControl = EditorControlFactory.build(editor);
  this._editorsControls.push(editorControl);
};

proto.getEditorsControls = function() {
  return this._editorsControls;
};

proto._cancelOrSave = function(){
  return resolve();
};

proto._stopEditing = function(){

};

module.exports = new EditingService;