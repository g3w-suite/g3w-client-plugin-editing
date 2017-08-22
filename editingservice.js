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
  // contiene la configurazione del plugin
  this._config = null;
  // conterrà i layer di editing
  this._layers = {};
  // proprietà che contiene tutte le sessioni legati ai layer e quindi ai toolbox
  this._sessions = {};
  // contiene tutti i toolbox
  this._toolboxes = [];
  // layersStore del plugin editing che conterrà tutti i layer di editing
  this._layersstore = new LayersStore({
    id: 'editing'
  });
  var layers =  CatalogLayersStoresRegistry.getLayers({
    EDITABLE: true
  });
  // mi dice se caricare o meno il plugin di editing;
  this._load = !!layers.length;
  // prendo tutti i layers del progetto corrente che si trovano
  // all'interno dei Layerstore del catalog registry con caratteristica editabili.
  // Mi verranno estratti tutti i layer editabili anche quelli presenti nell'albero del catalogo
  // come per esempio il caso di layers relazionati
  this.init = function(config) {
    // setto la configurazione del plugin
    this.config = config;
    //vado ad aggiungere il layersstore alla maplayerssotreregistry
    MapLayersStoreRegistry.addLayersStore(this._layersstore);
    var editableLayer;
    var editor;
    var layerId;
    //ciclo su ogni layers editiabile
    _.forEach(layers, function(layer) {
      layerId = layer.getId();
      // vado a chiamare la funzione che mi permette di
      // estrarre la versione vettoriale del layer di partenza
      editableLayer = layer.getLayerForEditing();
      editableLayer.on('config:ready', function(config) {
        // vado ad aggiungere un nuovo toolbox passandogli l'editor (e quindi il layer associato)
        self.addToolBox(editor);
        console.log(config);
      });
      // vado ad aggiungere ai layer editabili
      self._layers[layerId] = editableLayer;
      //aggiungo il layer al layersstore
      self._layersstore.addLayer(editableLayer);
      // aggiungo all'array dei vectorlayers se per caso mi servisse
      self._sessions[layer.getId()] = null;
      // estraggo l'editor
      editor = editableLayer.getEditor();
    });
  }
}

inherit(EditingService, PluginService);

var proto = EditingService.prototype;

proto.loadPlugin = function() {
  return this._load;
};

// ritorna i layer editabili presenti nel layerstore dell'editing
proto.getLayers = function() {
  return this._layers;
};

//funzione che server per aggiungere un editor
proto.addToolBox = function(editor) {
  // la toolboxes costruirà il toolboxex adatto per quel layer
  // assegnadogli le icone dei bottonii etc ..
  var toolbox = ToolBoxesFactory.build(editor);
  this._toolboxes.push(toolbox);
  // vado ad aggiungere la sessione
  this._sessions[toolbox.getId()] = toolbox.getSession();
};

proto.getToolBoxes = function() {
  return this._toolboxes;
};

proto.getEditableLayers = function() {
  return this._editableLayers;
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
  //console.log(layer, uniqueId);
  var layerId = layer.get('id');
  var dependencies = this.getDependencies(layerId);
  _.forEach(dependencies, function(dep) {
    //TODO
  })
};

proto.applyChangesDependencies = function(id, changes) {
  var self = this;
  var dependencies = this.getDependencies(id);
  var session;
  _.forEach(dependencies, function(dependecy) {
    session = self._sessions[dependecy].applyChanges(changes[dependecy], true);
  })
};


// fa lo start di tutte le dipendenze del layer legato alla toolbox che si è avviato
proto.startEditingDependencies = function(layerId, options) {
  var self = this;
  var d = $.Deferred();
  //magari le options lo posso usare per passare il tipo di filtro da passare
  // allo start della sessione
  options = options || options;
  // vado a recuperare le dependencies (figli al momento) di quel paricolare layer
  /*

  IMPORTANTE: PER EVITARE PROBLEMI È IMPORTANTE CHE I LAYER DIPENDENTI SIANO A SUA VOLTA EDITABILI

   */

  var dependencyLayers = this._layers[layerId].getChildrens();
  // se ci sono
  if (dependencyLayers) {
    /*
    * qui andrò a verificare se stata istanziata la sessione altrimenti vienne creata
    * se la sessione è attiva altrimenti viene attivata
    * */
    //cerco prima tra i toolbox se presente
    var session;
    // cliclo sulle dipendenze create
    _.forEach(dependencyLayers, function(id) {
      session = self._sessions[id];
      //verifico che ci sia la sessione
      if (session)
        if (!session.isStarted()) {
          // faccio partire la sessione
          session.start(options);
        } else {
          // altrimenti recupero le features secondo quell'opzione
          session.getFeatures(options);
        }
      else {
        // altrimenti per quel layer la devo instanziare
        var layer = self._layersstore.getLayerById(id);
        var editor = layer.getEditor();
        session = new Session({
          editor: editor
        });
        self._sessions[id] = session;
        session.start();
      }
    })
  }
  return d.promise();
};

proto.getDependencies = function(id) {
  //TODO qui passo le sessioni dei layer dipendenti
  //console.log(this._dependencies[id]);
 return this._dependencies[id];
};


module.exports = new EditingService;