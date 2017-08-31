var inherit = g3wsdk.core.utils.inherit;
var base =  g3wsdk.core.utils.base;
//prendo il plugin service di core
var PluginService = g3wsdk.core.plugin.PluginService;
var CatalogLayersStoresRegistry = g3wsdk.core.catalog.CatalogLayersStoresRegistry;
var MapLayersStoreRegistry = g3wsdk.core.map.MapLayersStoreRegistry;
var LayersStore = g3wsdk.core.layer.LayersStore;
var Session = g3wsdk.core.editing.Session;
var GUI = g3wsdk.gui.GUI;
var ToolBoxesFactory = require('./toolboxes/toolboxesfactory');
var CommitFeaturesWorkflow = require('./workflows/commitfeaturesworkflow');

function EditingService() {
  var self = this;
  base(this);
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
  this._layers = {}; // layers di editing
  this._load = !!layers.length; // mi dice se ci sono layer in editing e quindi da caricare il plugin
  // STATO GENERALE DEL EDITNG SERVICE
  // CHE CONTERRÀ TUTTI GLI STATI DEI VARI PEZZI UTILI A FAR REAGIRE L'INTERFACCIA
  this.state = {
    toolboxes: [],
    toolboxselected: null,
    message: null
  };
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
      // vado ad aggiungere ai layer editabili
      self._layers[layerId] = editableLayer;
      //aggiungo il layer al layersstore
      self._layersstore.addLayer(editableLayer);
      // aggiungo all'array dei vectorlayers se per caso mi servisse
      self._sessions[layer.getId()] = null;
      // estraggo l'editor
      editor = editableLayer.getEditor();
      // vado ad aggiungere la toolbox
      self.addToolBox(editor);
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

// vado a recuperare il toolbox a seconda del suo id
proto.getToolBoxById = function(toolboxId) {
  var toolBox = null;
  _.forEach(this._toolboxes, function(toolbox) {
    if (toolbox.getId() == toolboxId) {
      toolBox = toolbox;
      return false;
    }
  });
  return toolBox;
};

//funzione che server per aggiungere un editor
proto.addToolBox = function(editor) {
  // la toolboxes costruirà il toolboxex adatto per quel layer
  // assegnadogli le icone dei bottonii etc ..
  var toolbox = ToolBoxesFactory.build(editor);
  // vado a popolare lo state delle toolbox
  this._toolboxes.push(toolbox);
  this.state.toolboxes.push(toolbox.state);
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

proto.stop = function() {
  var d = $.Deferred();
  var self = this;
  var commitpromises = [];
  // vado a chiamare lo stop di ogni toolbox
  _.forEach(this._toolboxes, function(toolbox) {
    // vado a verificare se c'è una sessione sporca e quindi
    // chiedere se salvare
    if (toolbox.getSession().getHistory().state.commit) {
      commitpromises.push(self.commit(toolbox));
    }
  });
  $.when.apply(this, commitpromises).
    always(function() {
      _.forEach(arguments, function(toolbox) {
        // vado a stoppare tutti le toolbox
        toolbox.stop();
        // vado a deselzionare eventuali toolbox
        toolbox.setSelected(false);
      });
      d.resolve();
    });
  this.state.toolboxselected = null;
  return d.promise();
};

// fa lo start di tutte le dipendenze del layer legato alla toolbox che si è avviato
proto.startEditingDependencies = function(layerId, options) {
  var self = this;
  var d = $.Deferred();
  //magari le options lo posso usare per passare il tipo di filtro da passare
  // allo start della sessione
  options = options || options;
  // vado a recuperare le relazioni (figli al momento) di quel paricolare layer
  /*

  IMPORTANTE: PER EVITARE PROBLEMI È IMPORTANTE CHE I LAYER DIPENDENTI SIANO A SUA VOLTA EDITABILI

   */
  var relationLayers = this._layers[layerId].getChildren();
  // se ci sono
  if (relationLayers) {
    /*
    * qui andrò a verificare se stata istanziata la sessione altrimenti vienne creata
    * se la sessione è attiva altrimenti viene attivata
    * */
    //cerco prima tra i toolbox se presente
    var session;
    // cliclo sulle dipendenze create
    _.forEach(relationLayers, function(id) {
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
        try {
          var layer = self._layersstore.getLayerById(id);
          var editor = layer.getEditor();
          session = new Session({
            editor: editor
          });
          self._sessions[id] = session;
          session.start();
        }
        catch(err) {
          console.log(err);
        }
      }
    })
  }
  return d.promise();
};

proto.commit = function(toolbox) {
  var d = $.Deferred();
  toolbox = toolbox || this.state.toolboxselected;
  var layer = toolbox.getLayer();
  var workflow = new CommitFeaturesWorkflow({
    type:  'commit'
  });
  workflow.start({
    inputs: {
      layer: layer
    }
  })
    .then(function() {
      var session = toolbox.getSession();
      // funzione che serve a fare il commit della sessione legata al tool
      // qui probabilmente a seconda del layer se ha dipendenze faccio ogni sessione
      // produrrà i suoi dati post serializzati che pi saranno uniti per un unico commit
      session.commit()
        .then(function() {
          GUI.notify.success("I dati sono stati salvati correttamente");
        })
        .fail(function(err) {
          var error_message = "";
          function traverseErrorMessage(obj) {
            _.forIn(obj, function (val, key) {
              if (_.isArray(val)) {
                error_message = val[0];
              }
              if (_.isObject(val)) {
                traverseErrorMessage(obj[key]);
              }
              if (error_message) {
                return false;
              }
            });
          }
          if (err) {
            traverseErrorMessage(err.error.data);
            GUI.notify.error("<h4>Errore nel salvataggio sul server</h4>" +
              "<h5>" + error_message  + "</h5>");
          } else {
            GUI.notify.error("Errore nel salvataggio sul server");
          }
        }).
        always(function() {
          d.resolve(toolbox);
        })
    })
    .fail(function() {
      d.reject(toolbox);
    });
  return d.promise();
};

module.exports = new EditingService;