var inherit = g3wsdk.core.utils.inherit;
var base =  g3wsdk.core.utils.base;
//prendo il plugin service di core
var WorkflowsStack = g3wsdk.core.workflow.WorkflowsStack;
var PluginService = g3wsdk.core.plugin.PluginService;
var CatalogLayersStoresRegistry = g3wsdk.core.catalog.CatalogLayersStoresRegistry;
var MapLayersStoreRegistry = g3wsdk.core.map.MapLayersStoreRegistry;
var LayersStore = g3wsdk.core.layer.LayersStore;
var Session = g3wsdk.core.editing.Session;
var Layer = g3wsdk.core.layer.Layer;
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
  // oggetto contenente tutti i layers in editing
  this._editableLayers = {};
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

    // setto la configurazione del plugin
    this.config = config;
    // contiene tutti i toolbox
    this._toolboxes = [];
    // restto
    this.state.toolboxes = [];
    var editableLayer;
    var layerId;
    var color;
    // sono i layer originali caricati dal progetto e messi nel catalogo
    var layers = this._getEditableLayersFromCatalog();
    //vado ad aggiungere il layersstore alla maplayerssotreregistry
    MapLayersStoreRegistry.addLayersStore(this._layersstore);
    //ciclo su ogni layers editiabile
    _.forEach(layers, function(layer) {
      layerId = layer.getId();
      // vado a chiamare la funzione che mi permette di
      // estrarre la versione editabile del layer di partenza (es. da imagelayer a vector layer, table layer/tablelayer etc..)
      editableLayer = layer.getLayerForEditing();
      // se di tipo table assesgno sempre un solo colore
      //color = layer.getType() == Layer.LayerTypes.TABLE ? "#cc3300" : COLORS.splice(0,1).pop();
      // setto il colore che mi servrà per colorarare si il vettoriale che il toolbox
      //editableLayer.setColor(color);
      // vado ad aggiungere ai layer editabili
      self._editableLayers[layerId] = editableLayer;
      // aggiungo all'array dei vectorlayers se per caso mi servisse
      self._sessions[layer.getId()] = null;
    });
    // vao a settare i colori dei layere e delle toolbox
    this.setLayersColor();
    // disabilito l'eventuale tool attivo se viene attivata
    // un'interazione di tipo pointerInteractionSet sulla mappa
    this._mapService.on('mapcontrol:active', function(interaction) {
      var toolboxselected = self.state.toolboxselected;
      if ( toolboxselected && toolboxselected.getActiveTool()) {
        toolboxselected.getActiveTool().stop();
      }
    });
    _.forEach(this._editableLayers, function(layer) {
      //aggiungo il layer al layersstore
      self._layersstore.addLayer(layer);
    });
    // vado a creare i toolboxes
    this._buildToolBoxes();
    // creo l'albero delle dipendenze padre figlio per ogni toolbox
    this._createToolBoxDependencies();
  }
}

inherit(EditingService, PluginService);

var proto = EditingService.prototype;

proto.setLayersColor = function() {
  var RELATIONS_COLORS = [
    ["#656F94",
      "#485584",
      "#303E73",
      "#1B2B63",
      "#0C1B53"],

    ["#CF858F",
      "#B95A67",
      "#A23645",
      "#8B1929",
      "#740313"],

    ["#86B976",
      "#64A450",
      "#479030",
      "#2F7C16",
      "#1B6803"],

    ["#DAC28C",
      "#C2A45E",
      "#AA8739",
      "#926E1A",
      "#7A5603"]
  ];

  var COLORS = [
    "#AFEE30",
    "#96C735",
    "#7B9F35",
    "#5F772F",
    "#414F25",

    "#4138B2",
    "#3E3794",
    "#373276",
    "#2E2B59",
    "#22203B",

    "#FFD033",
    "#D5B139",
    "#AA9039",
    "#7F6E33",
    "#544A27",

    "#CD2986",
    "#AB2E74",
    "#882D61",
    "#66294B",
    "#431F34"
  ];
  var self = this;
  var fatherLayers = {};
  var color;
  var relationLayers = [];
  _.forEach(this._editableLayers, function(layer, layerId) {
    if (layer.isFather() && self._layerChildrenRelationInEditing(layer).length)
      fatherLayers[layerId] = self._layerChildrenRelationInEditing(layer);
  });
  _.forEach(fatherLayers, function(children, fatherLayerId) {
    color = RELATIONS_COLORS.splice(0,1).pop().reverse();
    relationLayers.push(fatherLayerId);
    self._editableLayers[fatherLayerId].setColor(color.splice(0,1).pop());
    _.forEach(children, function(childId) {
      relationLayers.push(childId);
      !self._editableLayers[childId].getColor() ? self._editableLayers[childId].setColor(color.splice(0,1).pop()): null;
    })
  });
  _.forEach(this._editableLayers, function(layer, layerId) {
    if (relationLayers.indexOf(layerId) == -1) {
      layer.setColor(COLORS.splice(0,1).pop());
    }
  })
};

proto._layerChildrenRelationInEditing = function(layer) {
  var self = this;
  var relations = layer.getChildren();
  var childrenrealtioninediting = [];
  _.forEach(relations, function(relation) {
    if (self._editableLayers[relation])
      childrenrealtioninediting.push(relation);
  });
  return childrenrealtioninediting;
};

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
  _.forEach(this._editableLayers, function(layer) {
    // la toolboxes costruirà il toolboxex adatto per quel layer
    // assegnadogli le icone dei bottonii etc ..
    toolbox = ToolBoxesFactory.build(layer);
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

// funzione che crea le dipendenze
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

proto.isFieldRequired = function(layerId, fieldName) {
  return this._editableLayers[layerId].isFieldRequired(fieldName);
};

proto._getToolBoxEditingDependencies = function(layer) {
  var self = this;
  var relationLayers = _.merge(layer.getChildren(), layer.getFathers());
  var toolboxesIds = _.filter(relationLayers, function(layerName) {
    return !!self._editableLayers[layerName]
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

proto._getEditableLayersFromCatalog = function() {
  var layers = CatalogLayersStoresRegistry.getLayers({
    EDITABLE: true
  });
  return layers;
};

proto.getCurrentWorflow = function() {
  var currentWorkFlow = WorkflowsStack.getLast();
  return {
    session: currentWorkFlow.getSession(),
    inputs: currentWorkFlow.getInputs(),
    context: currentWorkFlow.getContext(),
    feature: currentWorkFlow.getCurrentFeature(),
    layer: currentWorkFlow.getLayer()
  };
};

proto.getRelationsAttributesByFeature = function(relation, feature) {
  var relationsattributes = [];
  var toolboxId = relation.getChild();
  var layer = this.getToolBoxById(toolboxId).getLayer();
  var relations = this.getRelationsByFeature(relation, feature, layer.getType());
  var fields;
  _.forEach(relations, function(relation) {
    fields = layer.getFieldsWithValues(relation);
    relationsattributes.push({
      fields: fields,
      id: relation.getId()
    });
  });
  return relationsattributes;
};

proto.getRelationsByFeature = function(relation, feature, layerType) {
  var toolboxId = relation.getChild();
  var relationChildField = relation.getChildField();
  var relationFatherField= relation.getFatherField();
  var featureValue = feature.get(relationFatherField);
  var toolbox = this.getToolBoxById(toolboxId);
  var editingLayer = toolbox.getEditingLayer();
  var features = layerType == 'vector' ? editingLayer.getSource().getFeatures() : toolbox.getSession().getFeaturesStore().readFeatures() ;
  var relations = [];
  _.forEach(features, function(feature) {
    if (feature.get(relationChildField) == featureValue) {
      relations.push(feature);
    }
  });
  return relations;
};

proto.loadPlugin = function() {
  return this._load = !!this._getEditableLayersFromCatalog().length; // mi dice se ci sono layer in editing e quindi da caricare il plugin
};

// ritorna i layer editabili presenti nel layerstore dell'editing
proto.getLayers = function() {
  return this._editableLayers;
};

proto.getLayersById = function(layerId) {
  return this._editableLayers[layerId];
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
proto.getRelationsInEditing = function(relations, feature, isNew) {
  var self = this;
  var relationsinediting = [];
  var relationinediting;
  _.forEach(relations, function(relation) {
    if (self._editableLayers[relation.getChild()]) {
      // aggiungo lo state della relazione
      relationinediting = {
        relation:relation.getState(),
        relations: !isNew ? self.getRelationsAttributesByFeature(relation, feature): {} // le relazioni esistenti
      };
      relationinediting.validate = {
        valid:true
      };
      relationsinediting.push(relationinediting);
    }
  });
  return relationsinediting;
};

// qui devo verificare sia l condizione del padre che del figlio
proto.stopSessionChildren = function(layerId) {
  var self = this;
  // caso padre verifico se i figli sono in editing o meno
  var relationLayerChildren = this._editableLayers[layerId].getChildren();
  var toolbox;
  _.forEach(relationLayerChildren, function(id) {
    toolbox = self.getToolBoxById(id);
    if (toolbox && !toolbox.inEditing())
      self._sessions[id].stop();
  });
};

proto.fatherInEditing = function(layerId) {
  var self = this;
  var inEditing = false;
  var toolbox;
  // caso padre verifico se ci sono padri in editing o meno
  var relationLayerFathers = this._editableLayers[layerId].getFathers();
  _.forEach(relationLayerFathers, function(id) {
    toolbox = self.getToolBoxById(id);
    if (toolbox && toolbox.inEditing()) {
      inEditing = true;
      return false;
    }
  });
  return inEditing;
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
  var relationLayers = _.filter(this._editableLayers[layerId].getChildren(), function(id) {
    return !!self._editableLayers[id];
  });
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
          if (options.type != self._editableLayers[id].getType())
            options = {
              type: self._editableLayers[id].getType(),
              editing: true
            };
          session.start(options);
        } else {
          // altrimenti recupero le features secondo quell'opzione solo nel caso dei vettoriali
          if (self._editableLayers[id].getType() == Layer.LayerTypes.VECTOR)
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

proto._applyChangesToRelationsAfterCommit = function(commitItemsRelations, relationsResponse) {
  var self = this;
  var layer;
  var sessionFeaturesStore;
  var featureStore;
  var features;
  _.forEach(relationsResponse, function(relationResponse, layerId) {
    layer = self.getLayersById(layerId);
    sessionFeaturesStore = self.getToolBoxById(layerId).getSession().getFeaturesStore();
    featureStore = layer.getSource();
    features = _.clone(sessionFeaturesStore.readFeatures());
    _.forEach(features, function(feature) {
      feature.clearState();
    });
    featureStore.setFeatures(features);
    layer.applyCommitResponse({
      response: relationResponse
    });
  })
};

proto.commitDirtyToolBoxes = function(toolboxId) {
  var self = this;
  var d = $.Deferred();
  var toolbox = this.getToolBoxById(toolboxId);
  if (toolbox.isDirty() && toolbox.hasDependencies()) {
    this.commit(toolbox)
      .fail(function() {
        toolbox.revert()
          .then(function() {
            // se ha dpiendenze vado a fare il revert delle modifche fatte
            _.forEach(toolbox.getDependencies(), function(toolboxId) {
              self.getToolBoxById(toolboxId).revert();
            })
          })
        })
      .always(function() {
        d.resolve(toolbox);
      })
  } else
    d.resolve(toolbox);
  return d.promise();
};

proto._createCommitMessage = function(commitItems) {
  function create_changes_list_dom_element(add, update, del) {
    var changeIds = {
      Aggiunte: _.map(add, 'id').join(','),
      Modificate:  _.map(update, 'id').join(','),
      Cancellate:  _.map(del, 'id').join(',')
    };
    var dom = "<ul>";
    _.forEach(changeIds, function(ids, action) {
      dom += "<li>" + action + ": [" + ids + "]</li>";
    });

    dom += "</ul>";
    return dom;
  }

  var message = "";
  message += create_changes_list_dom_element(commitItems.add, commitItems.update, commitItems.delete);
  if (!_.isEmpty(commitItems.relations)) {
    message += "<h5>Relazioni Modificate</h5>";
    _.forEach(commitItems.relations, function(commits, relationName) {
      message +=  "<div><span style='font-weight: bold'>" + relationName + "</span></div>";
      message += create_changes_list_dom_element(commits.add, commits.update, commits.delete);
    })
  }
  return message;
};

proto.commit = function(toolbox) {
  var self = this;
  var d = $.Deferred();
  toolbox = toolbox || this.state.toolboxselected;
  var session = toolbox.getSession();
  var layer = toolbox.getLayer();
  var workflow = new CommitFeaturesWorkflow({
    type:  'commit'
  });
  workflow.start({
    inputs: {
      layer: layer,
      message: this._createCommitMessage(session.getCommitItems())
    }
  })
    .then(function() {
      // funzione che serve a fare il commit della sessione legata al tool
      // qui probabilmente a seconda del layer se ha dipendenze faccio ogni sessione
      // produrrà i suoi dati post serializzati che pi saranno uniti per un unico commit
      session.commit()
        .then(function (commitItems, response) {
          var relationsResponse = response.response.new_relations;
          var commitItemsRelations = commitItems.relations;
          self._applyChangesToRelationsAfterCommit(commitItemsRelations, relationsResponse);
          GUI.notify.success("I dati sono stati salvati correttamente");
          self._mapService.refreshMap();
          workflow.stop();
          d.resolve(toolbox);
        })
        .fail(function (err) {
          var error_message = "";
          function traverseErrorMessage(obj) {
            _.forIn(obj, function (val, key) {
              if(_.isArray(val)) {
                error_message = val[0];
              }
              if(_.isObject(val)) {
                traverseErrorMessage(obj[key]);
              }
              if(error_message) {
                return false;
              }
            });
          }

          if(err) {
            traverseErrorMessage(err.error.data);
            GUI.notify.error("<h4>Errore nel salvataggio sul server</h4>" +
              "<h5>" + error_message + "</h5>");
          } else {
            GUI.notify.error("Errore nel salvataggio sul server");
          }
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