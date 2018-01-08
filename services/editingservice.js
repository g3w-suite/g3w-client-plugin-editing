let inherit = g3wsdk.core.utils.inherit;
let base =  g3wsdk.core.utils.base;
//prendo il plugin service di core
let WorkflowsStack = g3wsdk.core.workflow.WorkflowsStack;
let PluginService = g3wsdk.core.plugin.PluginService;
let CatalogLayersStoresRegistry = g3wsdk.core.catalog.CatalogLayersStoresRegistry;
let MapLayersStoreRegistry = g3wsdk.core.map.MapLayersStoreRegistry;
let LayersStore = g3wsdk.core.layer.LayersStore;
let Session = g3wsdk.core.editing.Session;
let Layer = g3wsdk.core.layer.Layer;
let GUI = g3wsdk.gui.GUI;
let serverErrorParser= g3wsdk.core.errors.parsers.Server;
let ToolBoxesFactory = require('../toolboxes/toolboxesfactory');
let CommitFeaturesWorkflow = require('../workflows/commitfeaturesworkflow');

function EditingService() {
  let self = this;
  base(this);
  // proprietà che contiene tutte le sessioni legati ai layer e quindi ai toolbox
  this._sessions = {};
  // layersStore del plugin editing che conterrà tutti i layer di editing
  this._layersstore = new LayersStore({
    id: 'editing',
    queryable: false // lo setto a false così che quando faccio la query (controllo) non prendo anche questi
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
    let editableLayer;
    let layerId;
    // sono i layer originali caricati dal progetto e messi nel catalogo
    let layers = this._getEditableLayersFromCatalog();
    //vado ad aggiungere il layersstore alla maplayerssotreregistry
    MapLayersStoreRegistry.addLayersStore(this._layersstore);
    //ciclo su ogni layers editiabile
    layers.forEach((layer) => {
      layerId = layer.getId();
      // vado a chiamare la funzione che mi permette di
      // estrarre la versione editabile del layer di partenza (es. da imagelayer a vector layer, table layer/tablelayer etc..)
      editableLayer = layer.getLayerForEditing();
      // se di tipo table assesgno sempre un solo colore
      //color = layer.getType() == Layer.LayerTypes.TABLE ? "#cc3300" : COLORS.splice(0,1).pop();
      // setto il colore che mi servrà per colorarare si il vettoriale che il toolbox
      //editableLayer.setColor(color);
      // vado ad aggiungere ai layer editabili
      this._editableLayers[layerId] = editableLayer;
      // aggiungo all'array dei vectorlayers se per caso mi servisse
      this._sessions[layer.getId()] = null;
    });
    // vao a settare i colori dei layere e delle toolbox
    this.setLayersColor();
    // disabilito l'eventuale tool attivo se viene attivata
    // un'interazione di tipo pointerInteractionSet sulla mappa
    this._mapService.on('mapcontrol:active', function(interaction) {
      let toolboxselected = self.state.toolboxselected;
      if ( toolboxselected && toolboxselected.getActiveTool()) {
        toolboxselected.getActiveTool().stop();
      }
    });
    _.forEach(this._editableLayers, (layer) => {
      //aggiungo il layer al layersstore
      this._layersstore.addLayer(layer);
    });
    // vado a creare i toolboxes
    this._buildToolBoxes();
    // creo l'albero delle dipendenze padre figlio per ogni toolbox
    this._createToolBoxDependencies();
  }
}

inherit(EditingService, PluginService);

let proto = EditingService.prototype;

proto.setLayersColor = function() {
  let RELATIONS_COLORS = [
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

  let COLORS = [
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

  let color;
  let childrenLayers;
  _.forEach(this._editableLayers, (layer) => {
    // verifico se è un layer è padre e se ha figli in editing
    childrenLayers = this._layerChildrenRelationInEditing(layer);
    if (layer.isFather() && childrenLayers.length) {
      color = RELATIONS_COLORS.splice(0,1).pop().reverse();
      !layer.getColor() ? layer.setColor(color.splice(0,1).pop()): null;
      childrenLayers.forEach((layerId) => {
        !this._editableLayers[layerId].getColor() ? this._editableLayers[layerId].setColor(color.splice(0,1).pop()): null;
      });
    }
  });
  _.forEach(this._editableLayers, (layer, layerId) => {
    !this._editableLayers[layerId].getColor() ? layer.setColor(COLORS.splice(0,1).pop()): null;
  })
};

proto._layerChildrenRelationInEditing = function(layer) {
  let relations = layer.getChildren();
  let childrenrealtioninediting = [];
  relations.forEach((relation) => {
    if (this._editableLayers[relation])
      childrenrealtioninediting.push(relation);
  });
  return childrenrealtioninediting;
};

// udo delle relazioni
proto.undoRelations = function(undoItems) {
  let session;
  let toolbox;
  undoItems.forEach((items, toolboxId) => {
    toolbox = this.getToolBoxById(toolboxId);
    session = toolbox.getSession();
    session.undo(items);
  })
};

// undo delle relazioni
proto.rollbackRelations = function(rollbackItems) {
  let session;
  let toolbox;
  Object.entries(rollbackItems).forEach(([toolboxId, items]) => {
    toolbox = this.getToolBoxById(toolboxId);
    session = toolbox.getSession();
    session.rollback(items);
  })
};

// redo delle relazioni
proto.redoRelations = function(redoItems) {
  let session;
  let toolbox;
  Object.entries(redoItems).forEach(([toolboxId, items]) => {
    toolbox = this.getToolBoxById(toolboxId);
    session = toolbox.getSession();
    session.redo(items);
  })
};

// restituisce il layer che viene utilizzato dai task per fare le modifiche
// ol.vector nel cso dei vettoriali, tableLayer nel caso delle tabelle
proto.getEditingLayer = function(id) {
  let toolbox = this.getToolBoxById(id);
  return toolbox.getEditingLayer();
};

proto._buildToolBoxes = function() {
  let toolbox;
  _.forEach(this._editableLayers, (layer) => {
    // la toolboxes costruirà il toolboxex adatto per quel layer
    // assegnadogli le icone dei bottonii etc ..
    toolbox = ToolBoxesFactory.build(layer);
    // vado ad aggiungere la toolbox
    this.addToolBox(toolbox);
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
  let layer;
  this._toolboxes.forEach((toolbox, toolboxId) => {
    layer = toolbox.getLayer();
    toolbox.setFather(layer.isFather());
    toolbox.state.editing.dependencies = this._getToolBoxEditingDependencies(layer);
    if (layer.isFather() && toolbox.hasDependencies() ) {
      _.forEach(layer.getRelations().getRelations(), (relation) => {
        toolbox.addRelation(relation);
      })
    }
  })
};

proto.isFieldRequired = function(layerId, fieldName) {
  return this._editableLayers[layerId].isFieldRequired(fieldName);
};

proto._getToolBoxEditingDependencies = function(layer) {
  let relationLayers = _.merge(layer.getChildren(), layer.getFathers());
  let toolboxesIds = relationLayers.filter((layerName) => {
    return !!this._editableLayers[layerName]
  });
  return toolboxesIds;
};

// verifico se le sue diendenza sono legate a layer effettivamente in editing o no
proto._hasEditingDependencies = function(layer) {
  let toolboxesIds = this._getToolBoxEditingDependencies(layer);
  return !!toolboxesIds.length;
};

// funzione che serve a manageggia
proto.handleToolboxDependencies = function(toolbox) {
  let dependecyToolBox;
  if (toolbox.isFather())
  // verifico se le feature delle dipendenze sono state caricate
    this.getLayersDependencyFeatures(toolbox.getId());
  toolbox.getDependencies().forEach((toolboxId) => {
    dependecyToolBox = this.getToolBoxById(toolboxId);
    // disabilito visivamente l'editing
    dependecyToolBox.setEditing(false);
  })
};

proto._getEditableLayersFromCatalog = function() {
  let layers = CatalogLayersStoresRegistry.getLayers({
    EDITABLE: true
  });
  return layers;
};

proto.getCurrentWorflow = function() {
  let currentWorkFlow = WorkflowsStack.getLast();
  return {
    session: currentWorkFlow.getSession(),
    inputs: currentWorkFlow.getInputs(),
    context: currentWorkFlow.getContext(),
    feature: currentWorkFlow.getCurrentFeature(),
    layer: currentWorkFlow.getLayer()
  };
};

proto.getRelationsAttributesByFeature = function(relation, feature) {
  let relationsattributes = [];
  let toolboxId = relation.getChild();
  let layer = this.getToolBoxById(toolboxId).getLayer();
  let relations = this.getRelationsByFeature(relation, feature, layer.getType());
  let fields;
  relations.forEach((relation) => {
    fields = layer.getFieldsWithValues(relation);
    relationsattributes.push({
      fields: fields,
      id: relation.getId()
    });
  });
  return relationsattributes;
};

proto.getRelationsByFeature = function(relation, feature, layerType) {
  let toolboxId = relation.getChild();
  let relationChildField = relation.getChildField();
  let relationFatherField= relation.getFatherField();
  let featureValue = feature.get(relationFatherField);
  let toolbox = this.getToolBoxById(toolboxId);
  let editingLayer = toolbox.getEditingLayer();
  let features = layerType == 'vector' ? editingLayer.getSource().getFeatures() : editingLayer.getSource().readFeatures() ;
  let relations = [];
  features.forEach((feature) => {
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

// funzione che restituisce l'editing layer estratto dal layer del catalogo
// vectorLayer lel caso di un imageLayere e tablelayer  nel cso di un table lauer
proto.getLayerById = function(layerId) {
  return this._editableLayers[layerId];
};

// vado a recuperare il toolbox a seconda del suo id
proto.getToolBoxById = function(toolboxId) {
  let toolBox = null;
  this._toolboxes.forEach((toolbox) => {
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
  return new Promise((resolve, reject) => {
    let commitpromises = [];
    // vado a chiamare lo stop di ogni toolbox
    this._toolboxes.forEach((toolbox) => {
      // vado a verificare se c'è una sessione sporca e quindi
      // chiedere se salvare
      if (toolbox.getSession().getHistory().state.commit) {
        commitpromises.push(this.commit(toolbox));
      }
    });

    // prima di stoppare tutto e chidere panello
    $.when.apply(this, commitpromises)
      .always(() => {
        this._mapService.refreshMap();
        this._toolboxes.forEach((toolbox) => {
          // vado a stoppare tutti le toolbox
          toolbox.stop();
          // vado a deselzionare eventuali toolbox
          toolbox.setSelected(false);
        });
        this.clearState();
        resolve();
    });
  });
};

proto.clearState = function() {
  this.state.toolboxselected = null; // tiene riferimento alla toolbox selezionata
  this.state.toolboxidactivetool =  null;
  this.state.message =  null; // messaggio genarle del pannello di editing
};

// funzione che filtra le relazioni in base a quelle presenti in editing
proto.getRelationsInEditing = function(relations, feature, isNew) {
  let relationsinediting = [];
  let relationinediting;
  relations.forEach((relation) => {
    if (this._editableLayers[relation.getChild()]) {
      // aggiungo lo state della relazione
      relationinediting = {
        relation:relation.getState(),
        relations: !isNew ? this.getRelationsAttributesByFeature(relation, feature): [] // le relazioni esistenti
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
  // caso padre verifico se i figli sono in editing o meno
  let relationLayerChildren = this._editableLayers[layerId].getChildren();
  let toolbox;
  relationLayerChildren.forEach((id) => {
    toolbox = this.getToolBoxById(id);
    if (toolbox && !toolbox.inEditing())
      this._sessions[id].stop();
  });
};

proto.fatherInEditing = function(layerId) {
  let inEditing = false;
  let toolbox;
  // caso padre verifico se ci sono padri in editing o meno
  let relationLayerFathers = this._editableLayers[layerId].getFathers();
  relationLayerFathers.forEach((id) => {
    toolbox = this.getToolBoxById(id);
    if (toolbox && toolbox.inEditing()) {
      inEditing = true;
      return false;
    }
  });
  return inEditing;
};

// prendo come opzione il tipo di layer
proto.createEditingDataOptions = function(layerType) {
  let options = {
    editing: true,
    type: layerType
  };
  // verifico se layer vettoriale
  if(layerType == Layer.LayerTypes.VECTOR) {
    // aggiungo il filto bbox
    let bbox = this._mapService.getMapBBOX();
    options.filter = {
      bbox: bbox
    }
  }
  // ritorno opzione
  return options
};

// fa lo start di tutte le dipendenze del layer legato alla toolbox che si è avviato
proto.getLayersDependencyFeatures = function(layerId) {
  // vado a recuperare le relazioni (figli al momento) di quel paricolare layer
  /*
   IMPORTANTE: PER EVITARE PROBLEMI È IMPORTANTE CHE I LAYER DIPENDENTI SIANO A SUA VOLTA EDITABILI
   */
  let children = this._editableLayers[layerId].getChildren();
  let relationChildLayers = children.filter((id) => {
    return !!this._editableLayers[id];
  });
  // se ci sono layer figli dipendenti
  if (!_.isNil(relationChildLayers) && relationChildLayers.length) {
    /*
     * qui andrò a verificare se stata istanziata la sessione altrimenti vienne creata
     * se la sessione è attiva altrimenti viene attivata
     * */
    //cerco prima tra i toolbox se presente
    let session;
    let toolbox;
    let options;
    // cliclo sulle dipendenze create
    relationChildLayers.forEach((id) => {
      options = this.createEditingDataOptions(this._editableLayers[id].getType());
      session = this._sessions[id];
      toolbox = this.getToolBoxById(id);
      //setto la proprietà a loading
      toolbox.startLoading();
      //verifico che ci sia la sessione
      if (session) {
        if (!session.isStarted()) {
          session.start(options)
            .always(() => {
              // setto la proprià a stop loading sempre
              toolbox.stopLoading();
            })
        } else {
          session.getFeatures(options)
            .always(() => {
              toolbox.stopLoading();
            })
        }
      } else {
        // altrimenti per quel layer la devo instanziare
        try {
          let layer = this._layersstore.getLayerById(id);
          let editor = layer.getEditor();
          session = new Session({
            editor: editor
          });
          this._sessions[id] = session;
          session.start();
        }
        catch(err) {
          console.log(err);
        }
      }
    })
  }
};

proto._applyChangesToRelationsAfterCommit = function(commitItemsRelations, relationsResponse) {
  let layer;
  let sessionFeaturesStore;
  let featureStore;
  let features;

  for (const [layerId, relationResponse] of Object.entries(relationsResponse)) {
    layer = this.getLayerById(layerId);
    sessionFeaturesStore = this.getToolBoxById(layerId).getSession().getFeaturesStore();
    featureStore = layer.getSource();
    features = _.clone(sessionFeaturesStore.readFeatures());
    features.forEach((feature) => {
      feature.clearState();
    });
    featureStore.setFeatures(features);
    layer.applyCommitResponse({
      response: relationResponse
    });
  }
};

proto.commitDirtyToolBoxes = function(toolboxId) {
  return new Promise((resolve, reject) => {
    let toolbox = this.getToolBoxById(toolboxId);
    if (toolbox.isDirty() && toolbox.hasDependencies()) {
      this.commit(toolbox)
        .fail(() => {
          toolbox.revert()
            .then(() => {
              // se ha dipendenze vado a fare il revert delle modifiche fatte
              toolbox.getDependencies().forEach((toolboxId) => {
                this.getToolBoxById(toolboxId).revert();
              })
            })
        })
        .always(() => {
          resolve(toolbox);
        })
    } else
      resolve(toolbox);
  });
};

proto._createCommitMessage = function(commitItems) {
  function create_changes_list_dom_element(add, update, del) {
    let changeIds = {
      Aggiunte: _.map(add, 'id').join(','),
      Modificate:  _.map(update, 'id').join(','),
      Cancellate:  del.join(',')
    };
    let dom = "<ul style='border-bottom-color: #f4f4f4;'>";
    Object.entries(changeIds).forEach(([action, ids]) => {
      dom += "<li>" + action + ": [" + ids + "]</li>";
    });
    dom += "</ul>";
    return dom;
  }

  let message = "";
  message += create_changes_list_dom_element(commitItems.add, commitItems.update, commitItems.delete);
  if (!_.isEmpty(commitItems.relations)) {
    message += "<div style='height:1px; background:#f4f4f4;border-bottom:1px solid #f4f4f4;'></div>";
    message += "<div style='margin-left: 40%'><h4>Relazioni</h4></div>";
    Object.entries(commitItems.relations).forEach(([ relationName, commits]) => {
      message +=  "<div><span style='font-weight: bold'>" + relationName + "</span></div>";
      message += create_changes_list_dom_element(commits.add, commits.update, commits.delete);
    })
  }
  return message;
};

proto.commit = function(toolbox) {
  let d = $.Deferred();
  toolbox = toolbox || this.state.toolboxselected;
  let session = toolbox.getSession();
  let layer = toolbox.getLayer();
  let workflow = new CommitFeaturesWorkflow({
    type:  'commit'
  });
  workflow.start({
    inputs: {
      layer: layer,
      message: this._createCommitMessage(session.getCommitItems())
    }})
    .then(() => {
      // funzione che serve a fare il commit della sessione legata al tool
      // qui probabilmente a seconda del layer se ha dipendenze faccio ogni sessione
      // produrrà i suoi dati post serializzati che pi saranno uniti per un unico commit
      session.commit()
        .then( (commitItems, response) => {
          let relationsResponse = response.response.new_relations;
          let commitItemsRelations = commitItems.relations;
          this._applyChangesToRelationsAfterCommit(commitItemsRelations, relationsResponse);
          GUI.notify.success("I dati sono stati salvati correttamente");
          this._mapService.refreshMap();
          workflow.stop();
          d.resolve(toolbox);
        })
        .fail( (error) => {
          let parser = new serverErrorParser({
            error: error
          });
          let message = parser.parse();
          GUI.notify.error(message);
          workflow.stop();
          d.resolve(toolbox);
        })
    })
    .fail(() => {
      workflow.stop();
      d.reject(toolbox);
    });
  return d.promise();
};

module.exports = new EditingService;
