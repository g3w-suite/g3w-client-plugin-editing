const inherit = g3wsdk.core.utils.inherit;
const base =  g3wsdk.core.utils.base;
const WorkflowsStack = g3wsdk.core.workflow.WorkflowsStack;
const PluginService = g3wsdk.core.plugin.PluginService;
const CatalogLayersStoresRegistry = g3wsdk.core.catalog.CatalogLayersStoresRegistry;
const MapLayersStoreRegistry = g3wsdk.core.map.MapLayersStoreRegistry;
const LayersStore = g3wsdk.core.layer.LayersStore;
const Session = g3wsdk.core.editing.Session;
const Layer = g3wsdk.core.layer.Layer;
const GUI = g3wsdk.gui.GUI;
const ToolBoxesFactory = require('../toolboxes/toolboxesfactory');
const t = g3wsdk.core.i18n.tPlugin;
const CommitFeaturesWorkflow = require('../workflows/commitfeaturesworkflow');

function EditingService() {
  base(this);
  // contains alla sessions
  this._sessions = {};
  // events
  this._events = {
    layer: {
      start_editing: {
        before: {},
        after: {}
      }
    }
  };
  this._orphanNodes = {};
  this._allHistory = {
    currentIndex: 0,
    history: [],
    undoRedo: {
      canUndo: false,
      canRedo: false
    }
  };
  //oggetto contente i layerId e i relativi stati di commit dovuti al cabiamento (relaionale) con il branch
  this._nodesLayersCommitStateIdsRelatedToBranchLayer = {};
  this._nodelayerIds = [];
  this._branchLayerId = null;
  this.progeoApi = {};
  // state of editing
  this.state = {
    toolboxes: [], // contiene tutti gli stati delle toolbox in editing
    toolboxselected: null, // tiene riferimento alla toolbox selezionata
    toolboxidactivetool: null,
    message: null, // messaggio genarle del pannello di editing
    editing: {
      enabled: true,
      type: 'all'
    } // useful fo general editing
  };
  //mapservice
  this._mapService = GUI.getComponent('map').getService();
  // disable active tool on wehena a control is activated
  this._mapService.on('mapcontrol:active', (interaction) => {
    let toolboxselected = this.state.toolboxselected;
    if ( toolboxselected && toolboxselected.getActiveTool()) {
      toolboxselected.getActiveTool().stop();
    }
  });
  //plugin components
  this._formComponents = {};
  // oggetto che server per ascoltare editing da parte di plugin
  this._subscribes = {};
  // prendo tutti i layers del progetto corrente che si trovano
  // all'interno dei Layerstore del catalog registry con caratteristica editabili.
  // Mi verranno estratti tutti i layer editabili anche quelli presenti nell'albero del catalogo
  // come per esempio il caso di layers relazionati
  this.init = function(config) {
    // lego il project state dell'editing al project state di progeo
    this.state.editing = this.progeoApi.getEditingState();
    // layersStore del plugin editing che conterrà tutti i layer di editing
    this._layersstore = new LayersStore({
      id: 'editing',
      queryable: false // lo setto a false così che quando faccio la query (controllo) non prendo anche questi
    });
    //add edting layer store to mapstoreregistry
    MapLayersStoreRegistry.addLayersStore(this._layersstore);
    // setto la configurazione del plugin
    this.config = config;
    // oggetto contenente tutti i layers in editing
    this._editableLayers = {
      [Symbol.for('layersarray')]: []
    };
    // contiene tutti i toolbox
    this._toolboxes = [];
    // restto
    this.state.toolboxes = [];
    const _dependencies = {
      branch: [],
      nodes: []
    };
    this._branchLayerId = this.progeoApi.getBranchLayerId();
      // sono i layer originali caricati dal progetto e messi nel catalogo
    const layers = this._getEditableLayersFromCatalog();
    let editingLayersLenght = layers.length;
    //ciclo su ogni layers editiabile
    for (let i =0; i < layers.length; i++) {
      const layer = layers[i];
      const layerId = layer.getId();
      if (layerId === this._branchLayerId)
        _dependencies.nodes.push(layer);
      else {
        this._orphanNodes[layerId] = [];
        _dependencies.branch.push(layer);
      }
      this._editableLayers[layerId] = {};
      // vado a chiamare la funzione che mi permette di
      // estrarre la versione editabile del layer di partenza (es. da imagelayer a vector layer, table layer/tablelayer etc..)
      const editableLayer = layer.getLayerForEditing();
      if (!this.isBranchLayer(layerId))
        this._nodelayerIds.push(editableLayer.getId());
      if (editableLayer.isReady()) {
        editingLayersLenght-=1;
      }
      editableLayer.on('layer-config-ready', () => {
        editingLayersLenght-=1;
        this._attachLayerWidgetsEvent(editableLayer);
        if (editingLayersLenght === 0) {
          this._ready();
        }
      });
      // vado ad aggiungere ai layer editabili
      this._editableLayers[layerId] = editableLayer;
      this._editableLayers[Symbol.for('layersarray')].push({
        layer: editableLayer,
        dependency: layerId === this._branchLayerId ? _dependencies.branch : _dependencies.nodes,
        icon: layer.getIconUrlFromLegend()
      });
      // aggiungo all'array dei vectorlayers se per caso mi servisse
      this._sessions[layerId] = null;
    }
  };

  this.isBranchLayer = function(layerId) {
    return layerId === this._branchLayerId
  };

  this._ready = function() {
    // set toolbox colors
    this.setLayersColor();
    // after sadd layers to layerstore
    this._layersstore.addLayers(this.getLayers());
    // vado a creare i toolboxes
    this._buildToolBoxes();
    //this.registerOrphanNodes();
    this.emit('ready');
  }
}

inherit(EditingService, PluginService);

let proto = EditingService.prototype;

//api methods

proto.getFormComponentsById = function(layerId) {
  return this._formComponents[layerId] || [];
};

proto.getFormComponents = function() {
  return this._formComponents;
};

proto.addFormComponents = function({layerId, components= []} = {}) {
  if (!this._formComponents[layerId])
    this._formComponents[layerId] = [];
  for (let i=0; i < components.length; i++) {
    const component = components[i];
    this._formComponents[layerId].push(component)
  }
};

proto.getSession = function({layerId} = {}) {
  const toolbox = this.getToolBoxById(layerId);
  return toolbox.getSession();
};

proto.getFeature = function({layerId} = {}) {
  const toolbox = this.getToolBoxById(layerId);
  const tool = toolbox.getActiveTool();
  return tool.getFeature();
};

proto.subscribe = function({event, layerId}={}) {
  let observable;
  switch (event) {
    case 'editing':
      observable = this.getToolBoxById(layerId);
      break;
  }
  return observable;
};

// END API

proto.getUndoRedo = function() {
  return this._allHistory.undoRedo;
};

proto.setUndoRedo = function() {
  this._allHistory.undoRedo.canUndo = this._allHistory.currentIndex > 0;
  this._allHistory.undoRedo.canRedo = this._allHistory.currentIndex < this._allHistory.history.length;
  this.checkOrphanNodes();
};

proto.clearHistory = function() {
  this._allHistory.history = [];
  this._allHistory.currentIndex = 0;
  this.setUndoRedo();
};

proto.addChangeToHistory = function(session) {
  const change = {
    id: session.getLastStateId(),
    session
  };
  //vado a verificare se la mima modifica si aggiunge a quella finale ultima
  if (this._allHistory.currentIndex === this._allHistory.history.length) {
    this._allHistory.history.push(change);
    this._allHistory.currentIndex+=1;
  } else {
    // altrimenti
    this._allHistory.history.splice(this._allHistory.currentIndex, this._allHistory.history.length, change);
    this._allHistory.currentIndex = this._allHistory.history.length;
  }
  this.setUndoRedo();
};

proto.undoHistory = function() {
  this._allHistory.currentIndex-=1;
  const change = this._allHistory.history[this._allHistory.currentIndex];
  this.undo(change.session).then(() => {
    this.setUndoRedo();
  });

};

proto.redoHistory = function() {
  const change = this._allHistory.history[this._allHistory.currentIndex];
  this._allHistory.currentIndex+=1;
  this.redo(change.session).then(() => {
    this.setUndoRedo();
  });
};

proto.redo = function(session) {
  return new Promise((resolve, reject) => {
    const redoItems = session.redo();
    this.undoRedoRelations({
      relationsItems: redoItems,
      action: 'redo'
    });
    this.toolboxSetCommit(session.getId());
    // necessario per posporlo ad dopo spostamento della mappa
    this._mapService.getMap().once('postrender', () => {
      resolve();
    });
  });

};

// redo delle relazioni
proto.undoRedoRelations = function({relationsItems, action} = {}) {
  Object.entries(relationsItems).forEach(([toolboxId, items]) => {
    const toolbox = this.getToolBoxById(toolboxId);
    const session = toolbox.getSession();
    session[action](items);
  })
};

proto.undo = function(session) {
  return new Promise((resolve, reject) => {
    const undoItems = session.undo();
    this.undoRedoRelations({
      relationsItems: undoItems,
      action: 'undo'
    });
    this.toolboxSetCommit(session.getId());
    this._mapService.getMap().once('postrender', () => {
      resolve();
    });
  });

};

// udo delle relazioni
proto.undoRelations = function(undoItems) {
  Object.entries(undoItems).forEach(([toolboxId, items]) => {
    const toolbox = this.getToolBoxById(toolboxId);
    const session = toolbox.getSession();
    session.undo(items);
  })
};

// undo delle relazioni
proto.rollbackRelations = function(rollbackItems) {
  Object.entries(rollbackItems).forEach(([toolboxId, items]) => {
    const toolbox = this.getToolBoxById(toolboxId);
    const session = toolbox.getSession();
    session.rollback(items);
  })
};


proto.getBranchLayerId = function() {
  return this._branchLayerId;
};

proto.getBranchLayerActions = function() {
  return this.progeoApi.getBranchLayerActions();
};

proto.getBranchLayerAction = function(action=null) {
  if (action) {
    return this.progeoApi.getBranchLayerActions()[action]
  }
  return null
};

proto.getNodeLayerTools = function(layerId) {
  return this.progeoApi.getNodeLayerTools(layerId);
};

proto.getNodeLayerAction = function(layerId) {
  return this.progeoApi.getNodeLayerAction(layerId);
};

proto.setProgeoApi = function(api) {
  this.progeoApi = api;
};

proto.getChartComponent = function(options={}) {
  return this.progeoApi.getChartComponent(options);
};


// method to get and syle orphans nodes
proto.setOrphanNodes = function({layerId , nodes}) {
  this._orphanNodes[layerId] = nodes;
  nodes.forEach((node) => {
    node.setStyle(new ol.style.Style({
      image: new ol.style.Circle({
        radius: 7,
        fill: new ol.style.Fill({color: 'black'}),
        stroke: new ol.style.Stroke({
          color: [255,0,0], width: 2
        })
      })
    }))
  });
};

proto.getOrphanNodes = function() {
  return this._orphanNodes;
};

proto.getOrphanNodesById = function(layerId) {
  return this._orphanNodes[layerId] || [];
};

proto.getBranchLayerSource = function() {
  const branchId = this.getBranchLayerId();
  const toolBox = this.getToolBoxById(branchId);
  return toolBox.getEditingLayer().getSource();
};

proto.activeQueryInfo = function() {
  this._mapService.activeMapControl('query');
};

proto.setLayersColor = function() {

  const LAYERS_COLOR = [
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
  for (const layer of this.getLayers()) {
    const color = !layer.getColor() && LAYERS_COLOR.splice(0,1).pop();
    layer.setColor(color);
  }
};

proto._layerChildrenRelationInEditing = function(layer) {
  let relations = layer.getChildren();
  let childrenrealtioninediting = [];
  relations.forEach((relation) => {
    if (this.getLayerById(relation))
      childrenrealtioninediting.push(relation);
  });
  return childrenrealtioninediting;
};

proto.setEnabledEditing = function(bool){
  this.state.editing.enabled = bool;
};

proto.removeAllGeometryTools = function() {
  if (this.state.editing.type === 'attributes') {
    const toolboxes = this.getToolBoxes();
    for (let i= 0; i < toolboxes.length; i++) {
      toolboxes[i].removeGeometryTools();
    }
  }
};

proto.toolboxSetCommit = function(toolboxId) {
  const toolbox = this.getToolBoxById(toolboxId);
  toolbox.setCommit();
};

// restituisce il layer che viene utilizzato dai task per fare le modifiche
// ol.vector nel cso dei vettoriali, tableLayer nel caso delle tabelle
proto.getEditingLayer = function(id) {
  let toolbox = this.getToolBoxById(id);
  return toolbox.getEditingLayer();
};

proto.setLineStyle = function({color, editingLayer}) {
  const styleFnc = function (feature, resolution) {
    const geometry = feature.getGeometry();
    const styles = [
      // linestring
      new ol.style.Style({
        stroke: new ol.style.Stroke({
          color,
          width: 3
        })
      })
    ];
    const center = ol.extent.getCenter(geometry.getExtent());
    const arrowLength = resolution * 5;
    geometry.forEachSegment(function (start, end) {
      const dx = end[0] - start[0];
      const dy = end[1] - start[1];
      const rotation = Math.atan2(dy, dx);

      const lineStr1 = new ol.geom.LineString([center, [center[0] - arrowLength, center[1] + arrowLength]]);
      lineStr1.rotate(rotation, center);
      const lineStr2 = new ol.geom.LineString([center, [center[0] - arrowLength, center[1] - arrowLength]]);
      lineStr2.rotate(rotation, center);
      const stroke = new ol.style.Stroke({
        color,
        width: 5
      });

      styles.push(new ol.style.Style({
        geometry: lineStr1,
        stroke: stroke
      }));
      styles.push(new ol.style.Style({
        geometry: lineStr2,
        stroke: stroke
      }));
    });
    return styles;
  };
  editingLayer.setStyle(styleFnc)
};
proto._buildToolBoxes = function() {
  const dependencyToolboxSession = {};
  const layerswithdependency = this.getLayersWithDependecy();
  for (let i =0; i < layerswithdependency.length; i++) {
    // la toolboxes costruirà il toolboxex adatto per quel layer
    // assegnadogli le icone dei bottonii etc ..
    const {layer, dependency, icon} = layerswithdependency[i];
    const toolbox = ToolBoxesFactory.build({
      layer,
      dependency,
      icon,
      style: layer.getId() !== this._branchLayerId ? new ol.style.Style({
        image: new ol.style.Icon({
          src: icon,
          offset: [-4, 4],
        }),
        stroke: new ol.style.Stroke({
          color: layer.getColor()
        })
      }): null
    });
    dependency.forEach((_dependency) => dependencyToolboxSession[_dependency.getId()] = toolbox.getSession());
    // vado ad aggiungere la toolbox
    this.addToolBox(toolbox);
    if (layer.getGeometryType() === 'Line') {
      this.setLineStyle({
        color: layer.getColor(),
        editingLayer: toolbox.getEditingLayer()
      })
    }
  }

  for (const toolBoxId in dependencyToolboxSession) {
    this._setDependencyToolboxSession({
      toolBoxId,
      dependencySession: dependencyToolboxSession[toolBoxId]
    })
  }
};

proto._setDependencyToolboxSession = function({toolBoxId, dependencySession}) {
  const toolbox = this.getToolBoxById(toolBoxId);
  toolbox && toolbox.setDependencySession(dependencySession);
};

//funzione che server per aggiungere un editor
proto.addToolBox = function(toolbox) {
  this._toolboxes.push(toolbox);
  // vado ad aggiungere la sessione
  this._sessions[toolbox.getId()] = toolbox.getSession();
  this.state.toolboxes.push(toolbox.state);
};

proto.addEvent = function({type, id, fnc}) {
  if (!this._events[type])
    this._events[type] = {};
  if (!this._events[type][id])
    this._events[type][id] = [];
  this._events[type][id].push(fnc);
};

proto.runEventHandler = function({type, id} = {}) {
  this._events[type] && this._events[type][id] && this._events[type][id].forEach((fnc) => {
    fnc();
  });
};

proto._attachLayerWidgetsEvent = function(layer) {
  const fields = layer.getEditingFields();
  for (let i=0; i < fields.length; i++) {
    const field = fields[i];
    if(field.type !== 'child' && field.input.type === 'select_autocomplete') {
      const options = field.input.options;
      const {key, values, value, usecompleter, layer_id, loading} = options;
      if (!usecompleter) {
        this.addEvent({
          type: 'start-editing',
          id: layer.getId(),
          fnc() {
            // remove all values
            loading.state = 'loading';
            values.splice(0);
            const relationLayer = CatalogLayersStoresRegistry.getLayerById(layer_id);
            if (relationLayer) {
              relationLayer.getDataTable({
                ordering: key
              }).then((response) => {
                if(response && response.features) {
                  const features = response.features;
                  for (let i = 0; i < features.length; i++) {
                    values.push({
                      key: features[i].properties[key],
                      value: features[i].properties[value]
                    })
                  }
                  loading.state = 'ready';
                }
              }).fail((error) => {
                loading.state = 'error'
              });
            } else {
              loading.state = 'error'
            }
          }
        })
      }
    }
  }
};

// funzione che crea le dipendenze
proto._createToolBoxDependencies = function() {
  this._toolboxes.forEach((toolbox) => {
    const layer = toolbox.getLayer();
    toolbox.setFather(layer.isFather());
    toolbox.state.editing.dependencies = this._getToolBoxEditingDependencies(layer);
    if (layer.isFather() && toolbox.hasDependencies() ) {
      const layerRelations = layer.getRelations().getRelations();
      for (const relationName in layerRelations) {
        const relation = layerRelations[relationName];
        toolbox.addRelation(relation);
      }
    }
  })
};

proto.isFieldRequired = function(layerId, fieldName) {
  return this.getLayerById(layerId).isFieldRequired(fieldName);
};

proto._getToolBoxEditingDependencies = function(layer) {
  let relationLayers = _.merge(layer.getChildren(), layer.getFathers());
  let toolboxesIds = relationLayers.filter((layerName) => {
    return !!this.getLayerById(layerName);
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

proto.getLayers = function() {
  return this._editableLayers[Symbol.for('layersarray')].map((layerObject) => {
    return layerObject.layer;
  });
};

proto.getLayersAndIcon = function() {
  return this._editableLayers[Symbol.for('layersarray')].map((layerObject) => {
    return {
      layer: layerObject.layer,
      icon: layerObject.icon
    };
  });
};

proto.getLayersWithDependecy = function() {
  return this._editableLayers[Symbol.for('layersarray')]
};

proto.getCurrentWorkflow = function() {
  return WorkflowsStack.getCurrent();
};

proto.getCurrentWorkflowData = function() {
  const currentWorkFlow = WorkflowsStack.getCurrent();
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
    fields = layer.getFieldsWithValues(relation, {
      relation: true
    });
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
  let featureValue = feature.isPk(relationFatherField) ? feature.getId() : feature.get(relationFatherField);
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

// funzione che restituisce l'editing layer estratto dal layer del catalogo
// vectorLayer lel caso di un imageLayere e tablelayer  nel cso di un table lauer
proto.getLayerById = function(layerId) {
  return this._editableLayers[layerId];
};

proto.beforeEditingStart = function({layer} = {}) {
  this._checkLayerWidgets(layer);
};

proto.afterEditingStart = function({layer}= {}) {
  //TODO
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
    this.commit(true).then(() => {
      const toolboxes = this.getToolBoxes();
      const promises = toolboxes.map((toolbox) => {
        toolbox.stop();
      });
      Promise.all(promises).then(()=> {
        resolve()
      }).catch((err) => {
        reject(err)
      })
    }).catch((err)=> {
      reject(err);
    })
  })
};

// remove Editing LayersStore
proto.clear = function() {
  MapLayersStoreRegistry.removeLayersStore(this._layersstore);
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
    if (this.getLayerById(relation.getChild())) {
      // aggiungo lo state della relazione
      relationinediting = {
        relation:relation.getState(),
        relations: this.getRelationsAttributesByFeature(relation, feature) // le relazioni esistenti
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
  let relationLayerChildren = this.getLayerById(layerId).getChildren();
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
  let relationLayerFathers = this.getLayerById(layerId).getFathers();
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
  let children = this.getLayerById(layerId).getChildren();
  let relationChildLayers = children.filter((id) => {
    return !!this.getLayerById(id);
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
      options = this.createEditingDataOptions(this.getLayerById(id).getType());
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

proto._applyChangesToNewRelationsAfterCommit = function(relationsResponse) {
  for (relationLayerId in relationsResponse) {
    const response = relationsResponse[relationLayerId];
    const layer = this.getLayerById(relationLayerId);
    const sessionFeaturesStore = this.getToolBoxById(relationLayerId).getSession().getFeaturesStore();
    const featureStore = layer.getSource();
    const features = _.clone(sessionFeaturesStore.readFeatures());
    features.forEach((feature) => {
      feature.clearState();
    });
    featureStore.setFeatures(features);
    layer.applyCommitResponse({
      response,
      result: true
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

proto._isThereOrphanNodes = function() {
  return !!this._nodelayerIds.find((nodeLayerId) => {
    return this._orphanNodes[nodeLayerId].length;
  })
};

proto._createCommitMessage = function(sessions) {
  function create_changes_list_dom_element({layerName, add, update, del}) {
    const changeIds = {};
    changeIds[`${t('editing.messages.commit.add')}`] = `${add.length}`;
    changeIds[`${t('editing.messages.commit.update')}`] = `[${update.map((u) => u.id).join(', ')}]`;
    changeIds[`${t('editing.messages.commit.delete')}`] = `[${del.join(', ')}]`;
    let dom = `<h4 style="font-weight: bold;">${layerName}</h4>
               <ul style='border-bottom-color: #f4f4f4;'>`;
    Object.entries(changeIds).forEach(([action, ids]) => {
      dom += `<li style="word-break: break-all;">${action} : ${ids}</li>`;
    });
    dom += "</ul>";
    return dom;
  }
  let message = "";
  if (this._isThereOrphanNodes()) {
    message+=`<h4 style='color:red;'>${t('editing.messages.orphan_nodes')}</h4>`
  }

  for (let i = 0; i < sessions.length; i++) {
    const session = sessions[i];
    const commitItems = session.getCommitItems();
    const {add, update, delete:del} = commitItems;
    const layerName = this.getLayerById(session.getId()).getName();
    if ((add.length + update.length + del.length))
      message += create_changes_list_dom_element({
        layerName,
        add,
        update,
        del
      });
  }
  return message;
};

// metyhod to get
proto.checkOrphanNodes = function() {
  const map = this._mapService.getMap();
  map.once('postrender', () => {
    const branchLayer = this.getToolBoxById(this._branchLayerId).getEditingLayer();
    this._nodelayerIds.forEach((layerId) => {
      const toolbox = this.getToolBoxById(layerId);
      const layernode = toolbox.getEditingLayer();
      const nodes = layernode.getSource().getFeatures();
      const nodeStyle = layernode.getStyle();
      layernode.getSource().forEachFeature((node) =>{
        node.setStyle(nodeStyle)
      });
      this._orphanNodes[layerId] = [];
      nodes.forEach((node) => {
        const coordinate = node.getGeometry().getCoordinates();
        const pixel = map.getPixelFromCoordinate(coordinate);
        map.getFeaturesAtPixel(pixel,  {
          layerFilter: (layer) => {
            return layer === branchLayer
          }
        }) ?  null : this._orphanNodes[layerId].push(node);
      });
      this._orphanNodes[layerId].forEach((node) => {
        const styles = [
          layernode.getStyle(),
          new ol.style.Style({
            image: new ol.style.Circle({
              radius: 15,
              stroke: new ol.style.Stroke({
                color: [255, 0, 0], width: 5
              })
            })
          })
        ];
        node.setStyle(styles)
      })
    })
  });
};

proto._preCommit = function() {
  // get all changes that are not part of commit
  const history = this._allHistory.history.slice(this._allHistory.currentIndex);
  history.forEach((change) => {
    const {id, session} = change;
    session.deleteState(id);
  });
  const deleteOrphanNodes = (session) => {
    const layerId = session.getId();
    const orphanNodes = this._orphanNodes[layerId];
    for  (let i = 0; i < orphanNodes.length; i++) {
      const orphannode = orphanNodes[i];
      session.pushDelete(layerId, orphannode);
      session.save();
    }
  };
  const commitObject = {
    branch: false,
    sessions: []
  };
  const branch_toolbox = this.getToolBoxById(this._branchLayerId);
  if (branch_toolbox.canCommit()) {
    commitObject.branch = true;
    const session = branch_toolbox.getSession();
    commitObject.sessions.push(session);
    this._nodesLayersCommitStateIdsRelatedToBranchLayer = session.moveRelationStatesOwnSession();
  }
  this.getToolBoxes().forEach((toolbox) => {
    if (toolbox.getId() !== this._branchLayerId && toolbox.canCommit())
      commitObject.sessions.push(toolbox.getSession());
  });
  this._nodelayerIds.forEach((nodeLayerId) => {
    if (this._orphanNodes[nodeLayerId].length) {
      const toolbox = this.getToolBoxById(nodeLayerId);
      const session = toolbox.getSession();
      deleteOrphanNodes(session);
      commitObject.sessions.push(session)
    }
  });
  return commitObject;
};

proto._removeStateFromDependency = function(layerId) {
  this._nodesLayersCommitStateIdsRelatedToBranchLayer[layerId];
  const toolbox = this.getToolBoxById(layerId);
  const session = toolbox.getSession();
  session.removeChangesFromHistory(this._nodesLayersCommitStateIdsRelatedToBranchLayer);
  delete this._nodesLayersCommitStateIdsRelatedToBranchLayer[layerId];
};

proto._removeStatesFromDependency = function() {
 for (let layerId in this._nodesLayersCommitStateIdsRelatedToBranchLayer) {
   this._removeStateFromDependency(layerId)
  }
};

proto._handleCommitsResponse = function({responses, commitObject}) {
  const deleteOrphanNodes = this._isThereOrphanNodes();
  const doWithResponse = {
    refreshMap: false,
    message: {
      successful : 0,
      fail: []
    }
  };
  for (let i = 0; i < responses.length; i++) {
    const [commitItems, response] = responses[i];
    if (response.result) {
      doWithResponse.message.successful+=1;
    } else {
      doWithResponse.message.fail.push(response.errors);
    }
    doWithResponse.refreshMap = doWithResponse.refreshMap || response.result;
  }
  if (doWithResponse.message.successful === responses.length)
    GUI.notify.success(t("editing.messages.saved"));
  else {
    const message = doWithResponse.message.fail.join('\n\n');
    GUI.notify.error(message);
  }

  if (doWithResponse.refreshMap)
    this._mapService.refreshMap({force: true});

  if (deleteOrphanNodes) {
    this._nodelayerIds.forEach((nodeLayerId) => {
      const toolbox = this.getToolBoxById(nodeLayerId);
      const editingLayer = toolbox.getEditingLayer();
      const orphanNodes = this._orphanNodes[nodeLayerId];
      for (let i=0; i < orphanNodes.length; i++) {
        editingLayer.getSource().removeFeature(orphanNodes[i]);
      }
      this._orphanNodes[nodeLayerId] = [];
    })
  }
  commitObject.sessions.forEach((session) => {
    const layerId = session.getId();
    const toolbox = this.getToolBoxById(layerId);
    toolbox.setCommit() && this._removeStateFromDependency(layerId);
  });
};

proto.commit = function(close=false) {
  return new Promise((resolve, reject) => {
    const commitObject = this._preCommit();
    if (!commitObject.sessions.length) {
      resolve();
    } else {
      let workflow = new CommitFeaturesWorkflow({
        type:  'commit'
      });
      const message = this._createCommitMessage(commitObject.sessions);
      workflow.start({
        inputs: {
          close,
          message
        }})
        .then(() => {
          const dialog = GUI.dialog.dialog({
            message: `<h4 class="text-center">
                      <i style="margin-right: 5px;" class=${GUI.getFontClass('spinner')}></i>
                      ${t('editing.messages.saving')}
                    </h4>`,
            closeButton: false
          });
          // array di response
          const responses = [];
          //vado a costruire la funzione per committare i nodi
          const commitNodes = () => {
            const sessionCommit = commitObject.sessions.map((session) => {
              return session.commit();
            });
            $.when(...sessionCommit)
              .then((...args) => {
                if (commitObject.sessions.length === 1)
                  responses.push(args);
                else
                  args.forEach(arg => responses.push(arg));
                this._handleCommitsResponse({
                  responses,
                  commitObject
                });
                resolve()
              }, (error) => {
                console.log(error)
              })
              .always(() => {
                workflow.stop();
                dialog.modal('hide');
              })
          };
          //vado a vedere se posso committare il branch
          // se si lo vado a fare subito prima dei nodi
          if (commitObject.branch) {
            const branch_session = commitObject.sessions.splice(0, 1)[0];
            branch_session.commit().then((...args) => {
              responses.push(args);
              const toolbox = this.getToolBoxById(branch_session.getId());
              toolbox.setCommit();
              if (commitObject.sessions.length) {
                commitNodes()
              } else {
                this._handleCommitsResponse({
                  responses,
                  commitObject
                });
                resolve();
              }
            }).always(() => {
              workflow.stop();
              dialog.modal('hide');
            })
          } else {
            commitNodes()
          }
        })
        .fail((err) => {
          // significa che ho detto cancella
          workflow.stop();
          this._removeStatesFromDependency();
          if (close) {
            const toolboxes = this.getToolBoxes();
            toolboxes.forEach((toolbox) => {
              toolbox.stop();
              toolbox.setCommit();
            });
            resolve();
          } else {
            reject();
          }
        })
    }

  })
};

EditingService.EDITING_FIELDS_TYPE = ['unique'];


module.exports = new EditingService;
