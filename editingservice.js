var inherit = g3wsdk.core.utils.inherit;
var base =  g3wsdk.core.utils.base;
//prendo il plugin service di core
var PluginService = g3wsdk.core.plugin.PluginService;
var CatalogLayersStoresRegistry = g3wsdk.core.catalog.CatalogLayersStoresRegistry;
var MapLayersStoreRegistry = g3wsdk.core.map.MapLayersStoreRegistry;
var LayersStore = g3wsdk.core.layer.LayersStore;
var Session = g3wsdk.core.editing.Session;
var ToolBoxesFactory = require('./toolboxes/toolboxesfactory');

function EditingService() {

  var self = this;
  base(this);
  // prprietà che contiene i layer vettoriali
  this._editableLayers = [];
  // proprietà che contiene i controlli per l'editing
  this._toolboxes = [];
  // oggetto che contiene il legame tra layers (relazionei / dipendenze)
  this._dependencies = {};
  // prendo tutti i layers del progetto corrente che si trovano
  // all'interno dei Layerstore del catalog registry con caratteristica editabili.
  // Mi verranno estratti tutti i layer editabili anche quelli presenti nell'albero del catalogo
  // come per esempio il caso di layers relazionati
  this.layers = CatalogLayersStoresRegistry.getLayers({
    EDITABLE: true
  });
  this.init = function(config) {
    // creo il layer Store degli editing
    var layersStore = new LayersStore({
      id: 'editing'
    });
    //vado ad aggiungere il layersstore alla maplayerssotreregistry
    MapLayersStoreRegistry.addLayersStore(layersStore);
    // vado a settare l'url di editing aggiungendo l'id del
    // progetto essendo editing api generale
    //config.baseurl = config.baseurl + this.project.getId() + '/';
    this.config = config;
    var editableLayer;
    var editor;
    var layerDependencies;
    //ciclo su ogni layer editiabile
    _.forEach(this.layers, function(layer) {
      //vado a vedere se il layer ha altri layer dipendenti per l'editing
      layerDependencies = layer.getRelations();
      // vado a chiamare la funzione che mi permette di
      // estrarre la versione vettoriale del layer di partenza
      editableLayer = layer.getLayerForEditing();
      //aggiungo il layer al layersstore
      layersStore.addLayer(editableLayer);
      // aggiungo all'array dei vectorlayers se per caso mi servisse
      self._editableLayers.push(editableLayer);
      // estraggo l'editor
      editor = editableLayer.getEditor();
      // vado ad aggiungere un nuovo toolbox passandogli l'editor (e quindi il layer associato)
      self.addToolBox(editor);
    });
    //FAKE
    //CREO UN FAKE DI DIPENDENZA TRA I DUE LAYER
    this._dependencies['editing_comuni20170629104534275'] = ['editing_ferrovia_firenze20170724115017180'];
  };
}

inherit(EditingService, PluginService);

var proto = EditingService.prototype;

//funzione che server per aggiungere un editor
proto.addToolBox = function(editor) {
  // la toolboxes costruirà il toolboxex adatto per quel layer
  // assegnadogli le icone dei bottonii etc ..
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

proto.saveDependencies = function(layer, uniqueId) {
  console.log(layer, uniqueId);
  var layerId = layer.get('id');
  var dependencies = this.getDependencies(layerId);
  _.forEach(dependencies, function(dep) {
    //TODO
  })
};

proto.getDependencies = function(layerId) {
  //TODO qui passo le sessioni dei layer dipendenti
  console.log(this._dependencies[layerId]);
 return this._dependencies[layerId];
};

module.exports = new EditingService;