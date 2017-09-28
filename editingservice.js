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
  // layersStore del plugin editing che conterrà tutti i layer di editing
  this._layersstore = new LayersStore({
    id: 'editing'
  });
  this._layers = {}; // layers di editing
  // STATO GENERALE DEL EDITNG SERVICE
  // CHE CONTERRÀ TUTTI GLI STATI DEI VARI PEZZI UTILI A FAR REAGIRE L'INTERFACCIA
  this.state = {
    toolboxes: [], // contiene tutti gli stati delle toolbox in editing
    toolboxselected: null, // tiene riferimento alla toolbox selezionata
    toolboxidactivetool: null,
    message: null, // messaggio genarle del pannello di editing
    relations: [] // relazioni
  };
  //mapservice
  this._mapService = GUI.getComponent('map').getService();
  // prendo tutti i layers del progetto corrente che si trovano
  // all'interno dei Layerstore del catalog registry con caratteristica editabili.
  // Mi verranno estratti tutti i layer editabili anche quelli presenti nell'albero del catalogo
  // come per esempio il caso di layers relazionati
  this.init = function(config) {
    // set di colori
    var COLORS = [
      '#ff790d',
      '#62bdff',
      '#7aff54',
      '#00ffbf',
      '#00bfff',
      '#0040ff',
      '#8000ff',
      '#ff00ff',
      '#331909',
      '#234d20',
      '#7f3e16'
    ];
    // setto la configurazione del plugin
    this.config = config;
    // contiene tutti i toolbox
    this._toolboxes = [];
    // restto
    this.state.toolboxes = [];
    var editableLayer;
    var layerId;
    var color;
    var layers = this._getEditableLayersFromCatalog();
    //vado ad aggiungere il layersstore alla maplayerssotreregistry
    MapLayersStoreRegistry.addLayersStore(this._layersstore);
    //ciclo su ogni layers editiabile
    _.forEach(layers, function(layer) {
      layerId = layer.getId();
      // vado a chiamare la funzione che mi permette di
      // estrarre la versione vettoriale del layer di partenza
      editableLayer = layer.getLayerForEditing();
      // colore
      color = COLORS.splice(0,1).pop();
      // applico il colore
      editableLayer.setColor(color);
      // vado ad aggiungere ai layer editabili
      self._layers[layerId] = editableLayer;
      //aggiungo il layer al layersstore
      self._layersstore.addLayer(editableLayer);
      // aggiungo all'array dei vectorlayers se per caso mi servisse
      self._sessions[layer.getId()] = null;
    });
    // vado a creare i toolboxes
    this._buildToolBoxes();
    // creo l'albero delle dipendenze padre figlio per ogni toolbox
    this._createToolBoxDependencies();
    // disabilito l'eventuale tool attivo se viene attivata
    // un'interazione di tipo pointerInteractionSet sulla mappa
    this._mapService.on('mapcontrol:active', function(interaction) {
      var toolboxselected = self.state.toolboxselected;
      if ( toolboxselected && toolboxselected.getActiveTool()) {
        toolboxselected.getActiveTool().stop();
      }
    });
  }
}

inherit(EditingService, PluginService);

var proto = EditingService.prototype;

// udo delle relazioni
proto.undoRelations = function(undoItems) {
  var self = this;
  var session;
  var toolbox;
  _.forEach(undoItems, function(items, toolboxId) {
    toolbox = self.getToolBoxById(toolboxId);
    session = toolbox.getSession();
    session.undo(items);
  })
};

// undo delle relazioni
proto.rollbackRelations = function(rollbackItems) {
  var self = this;
  var session;
  var toolbox;
  _.forEach(rollbackItems, function(items, toolboxId) {
    toolbox = self.getToolBoxById(toolboxId);
    session = toolbox.getSession();
    session.rollback(items);
  })
};

// redo delle relazioni
proto.redoRelations = function(redoItems) {
  var self = this;
  var session;
  var toolbox;
  _.forEach(redoItems, function(items, toolboxId) {
    toolbox = self.getToolBoxById(toolboxId);
    session = toolbox.getSession();
    session.redo(items);
  })
};

proto.getEditingLayer = function(id) {
  var toolbox = this.getToolBoxById(id);
  return toolbox.getEditingLayer();
};

proto._buildToolBoxes = function() {
  var self = this;
  var toolbox;
  var editor;
  _.forEach(this._layers, function(layer) {
    editor = layer.getEditor();
    // la toolboxes costruirà il toolboxex adatto per quel layer
    // assegnadogli le icone dei bottonii etc ..
    toolbox = ToolBoxesFactory.build(editor);
    // vado ad aggiungere la toolbox
    self.addToolBox(toolbox);
  })
};

//funzione che server per aggiungere un editor
proto.addToolBox = function(toolbox) {
  this._toolboxes.push(toolbox);
  // vado ad aggiungere la sessione
  this._sessions[toolbox.getId()] = toolbox.getSession();
  this.state.toolboxes.push(toolbox.state);
};

proto._createToolBoxDependencies = function() {
  var self = this;
  var layer;
  _.forEach(this._toolboxes, function(toolbox, toolboxId) {
    layer = toolbox.getLayer();
    toolbox.setFather(layer.isFather());
    toolbox.state.editing.dependencies = self._getToolBoxEditingDependencies(layer);
    if (layer.isFather() && toolbox.hasDependencies() ) {
      _.forEach(layer.getRelations().getRelations(), function(relation) {
        toolbox.addRelation(relation);
      })
    }
  })
};

proto._getToolBoxEditingDependencies = function(layer) {
  var self = this;
  var relationLayers = _.merge(layer.getChildren(), layer.getFathers());
  var toolboxesIds = _.filter(relationLayers, function(layerName) {
    return !!self._layers[layerName]
  });
  return toolboxesIds;
};

// verifico se le sue diendenza sono legate a layer effettivamente in editing o no
proto._hasEditingDependencies = function(layer) {
  var toolboxesIds = this._getToolBoxEditingDependencies(layer);
  return !!toolboxesIds.length;
};

// funzione che serve a manageggia
proto.handleToolboxDependencies = function(toolbox) {
  var self = this;
  var dependecyToolBox;
  if (toolbox.isFather())
  // verifico se le feature delle dipendenze sono state caricate
    this.getLayersDependencyFeatures(toolbox.getId(), toolbox.getFeaturesOption());
  _.forEach(toolbox.getDependencies(), function(toolboxId) {
    dependecyToolBox = self.getToolBoxById(toolboxId);
    // disabilito visivamente l'editing
    dependecyToolBox.setEditing(false);
  })
};

proto.commitDirtyToolBoxes = function(toolboxId) {
  var self = this;
  _.forEach(this._toolboxes, function(toolbox, tid) {
    if (tid != toolboxId && toolbox.isDirty() && toolbox.hasDependencies()) {
      self.commit(toolbox)
        .fail(function() {
          toolbox.revert()
            .then(function() {
              // se ha dpiendenze vado a fare il revert delle modifche fatte
              _.forEach(toolbox.getDependencies(), function(toolboxId) {
                self.getToolBoxById(toolboxId).revert();
              })
            })
        })
    }
  })
};

proto._getEditableLayersFromCatalog = function() {
  var layers = CatalogLayersStoresRegistry.getLayers({
    EDITABLE: true
  });
  return layers;
};

proto.getRelationsByFeature = function(relation, feature) {
  var toolboxId = relation.getChild();
  var relationChildField = relation.getChildField();
  var relationFatherField= relation.getFatherField();
  var featureValue = feature.get(relationFatherField);
  var toolbox = this.getToolBoxById(toolboxId);
  var editingLayer = toolbox.getEditingLayer();
  var features = editingLayer.getSource().getFeatures();
  var relations = [];
  _.forEach(features, function(feature) {
    if (feature.get(relationChildField) == featureValue)
      relations.push(feature);
  });
  return relations;
};

proto.loadPlugin = function() {
  return this._load = !!this._getEditableLayersFromCatalog().length; // mi dice se ci sono layer in editing e quindi da caricare il plugin
};

// ritorna i layer editabili presenti nel layerstore dell'editing
proto.getLayers = function() {
  return this._layers;
};

proto.getLayersById = function(layerId) {
  return this._layers[layerId];
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
  // prima di stoppare tutto e chidere panello
  $.when.apply(this, commitpromises).
    always(function() {
    self._mapService.refreshMap();
      _.forEach(self._toolboxes, function(toolbox) {
        // vado a stoppare tutti le toolbox
        toolbox.stop();
        // vado a deselzionare eventuali toolbox
        toolbox.setSelected(false);
      });
      self.clearState();
      d.resolve();
    });
  return d.promise();
};

proto.clearState = function() {
  this.state.toolboxselected = null; // tiene riferimento alla toolbox selezionata
  this.state.toolboxidactivetool =  null;
  this.state.message =  null; // messaggio genarle del pannello di editing
};

// funzione che filtra le relazioni in base a quelle presenti in editing
proto.filterRelationsInEditing = function(relations, feature, isNew) {
  var self = this;
  var relationsinediting = [];
  var relationinediting;
  _.forEach(relations, function(relation) {
    if (self._layers[relation.getChild()]) {
      // aggiungo lo state della relazione
      relationinediting = relation.getState();
      relationinediting.relations = !isNew ? self.getRelationsByFeature(relation, feature): []; // le relazioni esistenti
      relationinediting.validate = {
        valid:true
      };
      relationsinediting.push(relationinediting);
      
    }
  });
  return relationsinediting;
};

proto.stopSessionDependencies = function(layerId) {
  var self = this;
  var relationLayers = this._layers[layerId].getChildren();
  var toolbox;
  _.forEach(relationLayers, function(id) {
    toolbox = self.getToolBoxById(id);
    if (toolbox && !toolbox.inEditing())
      self._sessions[id].stop();
  })
};

// fa lo start di tutte le dipendenze del layer legato alla toolbox che si è avviato
proto.getLayersDependencyFeatures = function(layerId, options) {
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
  var self = this;
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
          self._mapService.refreshMap();
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
          workflow.stop();
          d.resolve(toolbox);
        })
    })
    .fail(function() {
      workflow.stop();
      d.reject(toolbox);
    });
  return d.promise();
};

module.exports = new EditingService;