import './g3wsdk';
import pluginConfig                                                from './config';
import { EditingWorkflow }                                         from './g3wsdk/workflow/workflow';
import { promisify }                                               from './utils/promisify';
import { saveOfflineItem }                                         from './utils/saveOfflineItem';
import { showCommitModalWindow }                                   from './utils/showCommitModalWindow';
import { getRelation1_1ByLayerId }                                 from './utils/getRelation1_1ByLayerId';
import { getRelation1_1EditingLayerFieldsReferredToChildRelation } from './utils/getRelation1_1EditingLayerFieldsReferredToChildRelation';
import { createFeature }                                           from './utils/createFeature';
import {
  OpenFormStep,
  ConfirmStep,
  AddFeatureStep,
  AddPartToMultigeometriesStep,
}                                                                  from './workflows';
import EditingVueComponent                                         from './components/Editing.vue';

const { G3W_FID }                              = g3wsdk.constant;
const { ApplicationState, ApplicationService } = g3wsdk.core;
const { CatalogLayersStoresRegistry }          = g3wsdk.core.catalog;
const { SessionsRegistry }                     = g3wsdk.core.editing;
const { Layer, LayersStore }                   = g3wsdk.core.layer;
const { Feature }                              = g3wsdk.core.layer.features;
const { MapLayersStoreRegistry }               = g3wsdk.core.map;
const { Plugin, PluginService }                = g3wsdk.core.plugin;
const { noop }                                 = g3wsdk.core.utils;
const { GUI }                                  = g3wsdk.gui;
const { Panel }                                = g3wsdk.gui.vue;
const { Server: serverErrorParser }            = g3wsdk.core.errors.parsers;
const { Geometry }                             = g3wsdk.core.geometry;
const {
  getScaleFromResolution,
  getResolutionFromScale,
}                                              = g3wsdk.ol.utils;

Object
  .entries({
    EditingWorkflow,
    OpenFormStep,
    ConfirmStep,
    AddFeatureStep,
    AddPartToMultigeometriesStep,
    showCommitModalWindow,
  })
  .forEach(([k, v]) => console.assert(undefined !== v, `${k} is undefined`));


const ToolBox      = require('./toolboxes/toolbox');

// addEventListener("unhandledrejection", console.trace);

new (class extends Plugin {

  constructor() {

    super({
      name: 'editing',
      i18n: pluginConfig.i18n,
      fontClasses: [
        { name: 'measure',   className: "fas fa-ruler-combined" },
        { name: 'magnete',   className: "fas fa-magnet" },
        { name: 'clipboard', className: "fas fa-clipboard" }
      ],
    });

    /**
     * Global plugin state
     */
    this.state = {
      open:                false, // check if panel is open or not
      toolboxes:           [],
      _toolboxes:          [],    // TODO: `state._toolboxes` vs `state.toolboxes` ?
      toolboxselected:     null,
      toolboxidactivetool: null,
      /** @since g3w-client-plugin-editing@v3.6.2 */
      showselectlayers:    true,  // whether to show selected layers on editing panel
      message:             null,
      relations:           [],
      sessions:            {},    // store all sessions
      layers_in_error:     false,
      formComponents:      {},    // plugin components
      subscribers:         {},
      constraints:         {      // editing contraints (layer, filter, ..) to get features
        toolboxes: {},
        showToolboxesExcluded: true
      },
      featuresOnClose:     {},    // layers fatures to result when close editing (KEY LAYERID, VALUES ARRAY OF FEATURE FID CHANGES OR ADDED)
      uniqueFieldsValues:  {},    // store unique fields values for each layer
      saveConfig:          {      // store configuration of how save/commit changes to server
        mode: "default",          // default, autosave
        modal: false,
        messages: undefined,      // object to set custom message
        cb: {
          done: undefined,        // function executed after commit change done
          error: undefined        // function executed after commit changes error
        }
      },
      editableLayers:      {},
      events:              {
        'start-editing': {},
        'show-relation-editing': {},
        layer: {
          start_editing: {
            before: {},
            after: {}
          }
        }
      },
      show_errors: false,
      editFeatureKey: undefined,
      panel: null, // editing panel
      currentLayout: ApplicationService.getCurrentLayoutName(),
      unwatchLayout: (new Vue()).$watch(
        ()=> ApplicationState.gui.layout.__current,
        layoutName => this.state.currentLayout = layoutName !== this.getName() ? layoutName : this.state.currentLayout
      ),
      onMapControlToggled: ({ target }) => {
        target.isToggled() && target.isClickMap() && this.state.toolboxselected && this.state.toolboxselected.getActiveTool() && this.state.toolboxselected.stopActiveTool();
      },
    };

    // BACKOMP v3.x
    this.setService(Object.assign(new PluginService, {
      state:                             this.state,
      config:                            this.config,
      getRelation1_1ByLayerId,
      getRelation1_1EditingLayerFieldsReferredToChildRelation,
      getSession:                        this.getSession.bind(this),
      getFeature:                        this.getFeature.bind(this),
      subscribe:                         this.subscribe.bind(this),
      unsubscribe:                       this.unsubscribe.bind(this),
      fireEvent:                         this.fireEvent.bind(this),
      undo:                              this.undo.bind(this),
      redo:                              this.redo.bind(this),
      getEditingLayer:                   this.getEditingLayer.bind(this),
      addToolBox:                        this.addToolBox.bind(this),
      runEventHandler:                   this.runEventHandler.bind(this),
      resetDefault:                      this.resetDefault.bind(this),
      resetAPIDefault:                   this.resetAPIDefault.bind(this),
      getLayers:                         this.getLayers.bind(this),
      getLayerById:                      this.getLayerById.bind(this),
      getToolBoxById:                    this.getToolBoxById.bind(this),
      getSessionById:                    this.getSessionById.bind(this),
      setApplicationEditingConstraints:  this.setApplicationEditingConstraints.bind(this),
      getToolBoxes:                      this.getToolBoxes.bind(this),
      getEditableLayers:                 this.getEditableLayers.bind(this),
      stop:                              this.stop.bind(this),
      saveChange:                        this.saveChange.bind(this),
      commit:                            this.commit.bind(this),
      undoRedoLayerUniqueFieldValues:    this.undoRedoLayerUniqueFieldValues.bind(this),
      undoRedoRelationUniqueFieldValues: this.undoRedoRelationUniqueFieldValues.bind(this),
      stopEditing:                       this.stopEditing.bind(this),
      startEditing:                      this.startEditing.bind(this),
      addLayerFeature:                   this.addLayerFeature.bind(this),
    }));

    // set map control toggle event
    GUI.getService('map').on('mapcontrol:toggled', this.state.onMapControlToggled);

    this._init();
  }

  async _init() {
    // skip when no editable layer
    if (!CatalogLayersStoresRegistry.getLayers({ EDITABLE: true }).length) {
      return;
    }

    this.setHookLoading({ loading: true });

    /** ORIGINAL SOURCE: g3w-client-plugin-editing/api/index.js@v3.7.1 */
    this.service.setApi({
      api: {
        getSession:                       this.getSession.bind(this),
        getFeature:                       this.getFeature.bind(this),
        subscribe:                        this.subscribe.bind(this),
        unsubscribe:                      this.unsubscribe.bind(this),
        getToolBoxById:                   this.getToolBoxById.bind(this),
        addNewFeature:                    createFeature,
        commitChanges:                    this.commit.bind(this),
        setApplicationEditingConstraints: this.setApplicationEditingConstraints.bind(this),
        getMapService:                    () => GUI.getService('map'),
        updateLayerFeature:               noop,
        deleteLayerFeature:               noop,
        addLayerFeature:                  this.addLayerFeature.bind(this),
        hidePanel:                        this.hideEditingPanel.bind(this),
        resetDefault:                     this.resetAPIDefault.bind(this),
        startEditing:                     this.startEditing.bind(this),
        stopEditing:                      this.stopEditing.bind(this),
        showPanel:                        this.showPanel.bind(this),
        setSaveConfig:                    this.setSaveConfig.bind(this),
        addFormComponents:                this.addFormComponents.bind(this),
      }
    });

    //add editing layer store to mapstoreregistry
    MapLayersStoreRegistry.addLayersStore(new LayersStore({ id: 'editing', queryable: false }));

    this.state.editableLayers = {};
    this.state._toolboxes     = [];
    this.state.toolboxes      = [];

    // loop over editable layers
    (await Promise.allSettled(
      CatalogLayersStoresRegistry
        .getLayers({ EDITABLE: true })
        .map(l => l.getLayerForEditing({
          vectorurl: this.config.vectorurl,
          project_type: this.config.project_type
        }))
    )).forEach(response => {

      // skip on http error
      if ('fulfilled' !== response.status) {
        this.state.layers_in_error = true;
        return;
      }

      const layer = response.value;

      this.state.editableLayers[layer.getId()] = layer;

      /**
       * attach layer widgets event: get data from api when a field of a layer
       * is related to a wgis form widget (ex. relation reference, value map, etc..)
       */
      layer
        .getEditingFields()
        .filter(field => field.input && 'select_autocomplete' === field.input.type && !field.input.options.filter_expression && !field.input.options.usecompleter)
        /** @TODO need to avoid to call the same fnc to same event many times to avoid waste server request time */
        .forEach(field => ['start-editing', 'show-relation-editing'].forEach(type => {
            const id = layer.getId();
            this.state.events[type][id] = this.state.events[type][id] || [];
            this.state.events[type][id].push(async () => {
              const options = field.input.options;
  
              // remove all values
              options.loading.state = 'loading';
              options.values = [];
  
              const relationLayer = options.layer_id && CatalogLayersStoresRegistry.getLayerById(options.layer_id);
              const has_filter    = ([undefined, null].indexOf(options.filter_fields || []) > -1 || 0 === (options.filter_fields || []).length);
  
              try {
  
                // relation reference widget + no filter set
                if (options.relation_reference && has_filter) {
                  const response = await layer.getFilterData({ fformatter: field.name }); // get data with fformatter
                  if (response && response.data) {
                    // response data is an array ok key value objects
                    options.values.push(...response.data.map(([value, key]) => ({ key, value })));
                    options.loading.state = 'ready';
                    this.fireEvent('autocomplete', { field, data: [response.data] });
                    return options.values;
                  }
                }
  
                // value map widget
                if (relationLayer) {
                  const response = await promisify(relationLayer.getDataTable({ ordering: options.key }));
                  if (response && response.features) {
                    options.values.push(...(response.features || []).map(feature => ({
                      key: feature.properties[options.key],
                      value: feature.properties[options.value]
                    })));
                    options.loading.state = 'ready';
                    this.fireEvent('autocomplete', { field, features: response.features })
                    return options.values;
                  }
                }
  
                /** @TODO check if deprecated */
                const features = [];
                options.loading.state = 'ready';
                this.fireEvent('autocomplete', { field, features });
                return features;
  
              } catch (e) {
                console.warn(e);
                options.loading.state = 'error';
                return Promise.reject(e);
              }
            });
          }));

          this.state.sessions[layer.getId()] = null;

      });

    /**
     * set 1:1 relations fields editable
     * 
     * Check if layer has relation 1:1 (type ONE) and if fields
     *
     * belong to relation where child layer is editable
     *
     * @since g3w-client-plugin-editing@v3.7.0
     */
    this.service
      .getLayers()
      .forEach(editingLayer => {
        const fatherId = editingLayer.getId();                                                // father layer
        getRelation1_1ByLayerId(fatherId)
          .forEach(relation => {                                                              // loop `Relations` instances
            if (fatherId === relation.getFather()) {                                          // check if father layerId is a father of relation
              const isChildEditable = undefined !== this.getLayerById(relation.getChild());   // check if child layerId is editable (in editing)
              getRelation1_1EditingLayerFieldsReferredToChildRelation(relation)               // loop father layer fields (in editing)
                .forEach(field => { field.editable = (field.editable && isChildEditable); }); // current editable boolean value + child editable layer
            }
          })
      });

    // Set editing layer color and toolbox style
    this
      .getLayers()
      .filter(l => !l.getColor())
      .forEach((l, i) => l.setColor([
        "#C43C39", "#d95f02", "#91522D", "#7F9801", "#0B2637",
        "#8D5A99", "#85B66F", "#8D2307", "#2B83BA", "#7D8B8F",
        "#E8718D", "#1E434C", "#9B4F07", '#1b9e77', "#FF9E17",
        "#7570b3", "#204B24", "#9795A3", "#C94F44", "#7B9F35",
        "#373276", "#882D61", "#AA9039", "#F38F3A", "#712333",
        "#3B3A73", "#9E5165", "#A51E22", "#261326", "#e4572e",
        "#29335c", "#f3a712", "#669bbc", "#eb6841", "#4f372d",
        "#cc2a36", "#00a0b0", "#00b159", "#f37735", "#ffc425",
      ][i % 40]));

    // after add layers to layerstore
    MapLayersStoreRegistry.getLayersStore('editing').addLayers(this.getLayers());

    // create toolboxes
    this.getLayers().forEach(l => this.addToolBox(ToolBox.create(l)));

    // create toolboxes dependencies tree
    this.state._toolboxes.forEach(toolbox => {
      const layer = toolbox.getLayer();
      toolbox.setFather(layer.isFather());
      // get toolbox editing dependencies
      toolbox.state.editing.dependencies = [
        ...layer.getChildren(),
        ...layer.getFathers()
      ].filter((layerName) => undefined !== this.getLayerById(layerName));
      if (layer.isFather() && toolbox.hasDependencies() ) {
        const layerRelations = layer.getRelations().getRelations();
        for (const relationName in layerRelations) {
          toolbox.addRelation(layerRelations[relationName]);
        }
      }
    })

    // setup plugin interface
    GUI.isReady().then(() => {

    if (this.registerPlugin(this.config.gid) && false !== this.config.visible) {

      /**
       * ORIGINAL SOURCE: g3w-client-plugin/toolboxes/toolboxesfactory.js@v3.7.1
       *
       * Register query result action: edit selected feature from query results
       */
      this.state.editFeatureKey = GUI.getService('queryresults').onafter('editFeature', async({
        layer,
        feature,
      } = {}) => {
        const fid = feature.attributes[G3W_FID] || feature.id;

        if (undefined === fid) {
          return
        }

        this.getToolBoxes().forEach(tb => tb.setShow(layer.id === tb.getId()));
        this.showEditingPanel();
    
        this.state.showselectlayers = false;
    
        this.subscribe('closeeditingpanel', () => { this.state.showselectlayers = true; return { once: true } });
    
        const toolBox   = this.getToolBoxById(layer.id);
        const { scale } = toolBox.getEditingConstraints(); // get scale constraint from setting layer
    
        // start toolbox (filtered by feature id)
        try {
          await promisify(toolBox.start({ filter: { fids: fid } }));
    
          const _layer    = toolBox.getLayer();
          const source    = _layer.getEditingLayer().getSource();
          const is_vector = _layer.getType() === Layer.LayerTypes.VECTOR;
    
          // get feature from Editing layer source (with styles)
          const features = is_vector ? source.getFeatures() : source.readFeatures();
          const feature  = features.find(f => f.getId() == fid);
    
          // skip when not feature is get from server
          if (!feature) {
            return;
          }
    
          const geom = feature.getGeometry();
    
          // feature has no geometry → select toolbox
          if (!geom || undefined === scale) {
            toolBox.setSelected(true);
          }
    
          // feature has geometry → zoom to geometry
          if (geom) {
            GUI.getService('map').zoomToGeometry(geom);
          }
    
          // check map scale after zoom to feature
          // if currentScale is more that scale constraint set by layer editing
          // needs to go to scale setting by layer editing constraint
          if (geom && undefined !== scale) {
            GUI.getService('map').getMap().once('moveend', () => {
              const units        = GUI.getService('map').getMapUnits();
              const map          = GUI.getService('map').getMap();
              const currentScale = parseInt(getScaleFromResolution(map.getView().getResolution(), units));
              if (currentScale > scale) {
                map.getView().setResolution(getResolutionFromScale(scale, units));
              }
              //set select only here otherwise is show editing constraint
              toolBox.setSelected(true);
            });
          }
    
          const session = toolBox.getSession();
    
          this.state.toolboxselected = toolBox;
    
          const addPartTool = is_vector && !geom && toolBox.getTools().find(t => 'addPart' === t.getId());
    
          // check if layer is single geometry. Need to show and change behaviour
          if (addPartTool && !Geometry.isMultiGeometry(_layer.getGeometryType())) {
            addPartTool.setVisible(true);
          }
    
          // add geometry when vector layer feature has no geometry
          if (addPartTool) {
            //get workflow
            const op = addPartTool.getOperator();
            const w = new EditingWorkflow({
              type: 'drawgeometry',
              helpMessage: 'editing.workflow.steps.draw_geometry',
              steps: [
                new AddFeatureStep({
                  add: false,
                  steps: {
                    addfeature: {
                      description: 'editing.workflow.steps.draw_geometry',
                      directive:   't-plugin',
                      done: false
                    }
                  },
                  onRun: ({inputs, context}) => {
                    w.emit('settoolsoftool', [{
                      type: 'snap',
                      options: {
                        layerId: inputs.layer.getId(),
                        source:  inputs.layer.getEditingLayer().getSource(),
                        active:  true
                      }
                    }]);
                    w.emit('active', ['snap']);
                  },
                  onStop: () => w.emit('deactive', ['snap'])
                }),
                new AddPartToMultigeometriesStep({}),
              ],
              registerEscKeyEvent: true
            })
    
            addPartTool.setOperator(w);
    
            this.subscribe('closeeditingpanel', () => {
              addPartTool.setOperator(op);
              addPartTool.setVisible(Geometry.isMultiGeometry(_layer.getGeometryType()));
            })
          }
    
          /** ORIGINAL SOURCE: g3w-client-plugin-editing/workflows/editnopickmapfeatureattributesworkflow.js@v3.7.1 */
          const w = (new EditingWorkflow({
            type: 'editnopickmapfeatureattributes',
            runOnce: true,
            helpMessage: 'editing.tools.update_feature',
            steps: [ new OpenFormStep() ]
          }));
    
          await promisify(
            w.start({
              inputs:  { layer: _layer, features: [feature] },
              context: { session }
            })
          );
    
          await promisify(session.save());
    
          this.saveChange();
    
        } catch (e) {
          console.warn(e);
          session.rollback()
        }
      });

      this.config.name = this.config.name || "plugins.editing.editing_data";
      this.addToolGroup({ position: 0, title: 'EDITING' });
      this.addTools({
        action: this.showEditingPanel,
        offline: false,
        icon: 'pencil'
      }, { position: 0, title: 'EDITING' });
    }
  });

    this.setHookLoading({ loading: false });
    this.setApi(this.service.getApi());
    this.setReady(true);
  }

 /**
  * [API Method] Get session
  *
  * @param layerId
  *
  * @returns {*}
  */
  getSession({ layerId } = {}) {
    return this.getToolBoxById(layerId).getSession();
  }

  /**
   * [API Method]
   *
   * @param layerId
   *
   * @returns Feature in editing
   */
  getFeature({ layerId } = {}) {
    return this.getToolBoxById(layerId).getActiveTool().getFeature();
  }

  /**
   * [API Method] Subscribe handler function on event
   *
   * @param event
   * @param { Function } fnc
   *
   * @returns { Function } function
   */
  subscribe(event, fnc) {
    if (!this.state.subscribers[event]) this.state.subscribers[event] = [];
    if (!this.state.subscribers[event].find(subscribe => subscribe === fnc)) this.state.subscribers[event].push(fnc);
    return fnc;
  }

  /**
   * [API Method] Unsubscribe handler function on event
   *
   * @param event
   * @param fnc
   */
  unsubscribe(event, fnc) {
    this.state.subscribers[event] = this.state.subscribers[event].filter(subscribe => subscribe !== fnc);
  }

  /**
   * @param event
   * @param options
   *
   * @returns { Promise<unknown> }
   */
  async fireEvent(event, options={}) {
    if (this.state.subscribers[event]) {
      this.state.subscribers[event].forEach(fnc => {
        const response = fnc(options);
        if (response && response.once) {
          this.unsubscribe(event, fnc);
        }
      });
    }
  }

  /**
   * Undo method
   */
  undo() {
    const session = this.state.toolboxselected.getSession();
    const layerId = session.getId();
    const sessionItems = session.getLastHistoryState().items;

    this.undoRedoLayerUniqueFieldValues({
      layerId,
      sessionItems,
      action: 'undo'
    });

    const undoItems = session.undo();

    this.undoRedoRelationUniqueFieldValues({
      relationSessionItems: undoItems,
      action: 'undo'
    });

    // undo relations
    Object.entries(undoItems).forEach(([toolboxId, items]) => { this.getToolBoxById(toolboxId).getSession().undo(items); });
  }

  /**
   * @FIXME add description
   */
  redo() {
    const session = this.state.toolboxselected.getSession();
    const layerId = session.getId();
    const sessionItems = session.getLastHistoryState().items;
    this.undoRedoLayerUniqueFieldValues({
      layerId,
      sessionItems,
      action: 'redo'
    });
    const redoItems = session.redo();

    this.undoRedoRelationUniqueFieldValues({
      relationSessionItems: redoItems,
      action: 'redo'
    });

    // redo relations
    Object.entries(redoItems).forEach(([toolboxId, items]) => { this.getToolBoxById(toolboxId).getSession().redo(items); });
  }

  /**
   * @param id
   *
   * @returns {*}
   */
  getEditingLayer(id) {
    return this.state.editableLayers[id].getEditingLayer();
  }

  /**
   * @param toolbox
   */
  addToolBox(toolbox) {
    this.state._toolboxes.push(toolbox);
    // add session
    this.state.sessions[toolbox.getId()] = toolbox.getSession();
    this.state.toolboxes.push(toolbox.state);
  }

  /**
   * @param { Object } handler
   * @param handler.type
   * @param handler.id
   *
   * @returns { Promise<void> }
   */
  async runEventHandler({
    type,
    id,
  } = {}) {
    if (this.state.events[type] && this.state.events[type][id]) {
      await Promise.allSettled(this.state.events[type][id].map(fnc => fnc()));
    }
  }

  /**
   * Reset default values
   */
  resetDefault() {
    this.state.saveConfig = {
      mode: "default", // default, autosave
      modal: false,
      messages: null, // object to set custom message
      cb: {
        done: null, // function Called after save
        error: null, // function called affte commit error
      }
    };
    GUI.getService('map').disableClickMapControls(false);
  }

  /**
   * ORIGINAL SOURCE: g3w-client-plugin-editing/api/index.js@v3.7.1
   *
   * Reset default toolbox state modified by other plugin
   *
   * @since g3w-client-plugin-editing@v3.7.2
   */
  resetAPIDefault({
    plugin=true,
    toolboxes=true,
  } = {}) {
    if (toolboxes) {
      this.getToolBoxes().forEach(tb => { tb.resetDefault(); });
    }
    if (plugin) {
      this.resetDefault();
    }
  }

  /**
   * @returns { Array }
   */
  getLayers() {
    return Object.values(this.state.editableLayers);
  }

  /**
   * @param { string } layerId
   *
   * @returns {*}
   */
  getLayerById(layerId) {
    return this.state.editableLayers[layerId];
  }

  /**
   * @param { string } toolboxId
   *
   * @returns {*}
   */
  getToolBoxById(toolboxId) {
    return this.state._toolboxes.find(tb => tb.getId() === toolboxId);
  }

  /**
   * Get layer session by id (layer id is the same of session)
   *
   * @param id
   *
   * @returns {*}
   *
   * @since g3w-client-plugin-editing@v3.7.0
   */
  getSessionById(id) {
    return this.state.sessions[id];
  }

  /**
   * Method to apply filter editing contsraint to toolbox editing
   * Apply filter editing contsraint to toolbox editing
   *
   * @param constraints
   */
  setApplicationEditingConstraints(constraints={showToolboxesExcluded: true, toolboxes:{}}) {
    this.state.constraints = {
      ...this.state.constraints,
      ...constraints
    };

    const { toolboxes, showToolboxesExcluded } = constraints;
    const toolboxIds = Object.keys(toolboxes);
    if (false === showToolboxesExcluded) {
      this.state.toolboxes.forEach(toolbox => toolbox.show =  toolboxIds.indexOf(toolbox.id) !== -1);
    }
    toolboxIds.forEach(toolboxId => this
      .getToolBoxById(toolboxId)
      .setEditingConstraints(toolboxes[toolboxId]))
  }

  /**
   * @returns { Array }
   */
  getToolBoxes() {
    return this.state._toolboxes;
  }

  /**
   * @returns {*|{}}
   */
  getEditableLayers() {
    return this.state.editableLayers;
  }

  /**
   * Stop editing
   *
   * @returns { Promise<unknown> }
   */
  async stop() {
    const commitpromises = [];
    this.state._toolboxes
      .forEach(toolbox => {
        // check if temp changes are waiting to save on server
        if (toolbox.getSession().getHistory().state.commit) {
          // ask to commit before exit
          commitpromises.push(this.commit({toolbox, modal:true}));
        }
      });
    try {
      await promisify($.when.apply(this, commitpromises));    
    } catch (e) {
      console.warn(e);
    }
    this.state._toolboxes.forEach(toolbox => toolbox.stop());
    this.state.toolboxselected = null;
    this.state.toolboxidactivetool =  null;
    this.state.message =  null;
    GUI.getService('map').refreshMap();
  }

 /**
  * Function called very single change saved temporary
  */
  async saveChange() {
    if ('autosave' === this.state.saveConfig.mode) {
      return this.commit({ modal: false }); // set to not show modal ask window
    }
  }

  /**
   * Commit and save changes on server persistently
   *
   * @param { Object } commit
   * @param commit.toolbox
   * @param commit.commitItems
   * @param commit.messages
   * @param commit.done
   * @param { boolean } commit.modal
   * @param { boolean } commit.close
   *
   * @returns {*}
   */
  commit({
    toolbox,
    commitItems,
    modal = true,
    close = false,
  } = {}) {
    const d             = $.Deferred();
    const commitPromise = d.promise();
    const {
      cb = {},
      messages = {
        success:{},
        error:{}
      },
    }                   = this.state.saveConfig;
    toolbox             = toolbox || this.state.toolboxselected;
    let session         = toolbox.getSession();
    let layer           = toolbox.getLayer();
    const layerType     = layer.getType();
    const items         = commitItems;
    commitItems         = commitItems || session.getCommitItems();
    const {
      add = [],
      delete: cancel = [],
      update = [],
      relations = {},
    } = commitItems;

    //check if there are some changes to commit
    if (
      [
        ...add,
        ...cancel,
        ...update,
        ...Object.keys(relations)
      ].length === 0
    ) {
      GUI.showUserMessage({
        type: 'info',
        message: 'Nothing to save',
        autoclose: true,
        closable: false
      });

      d.resolve(toolbox);

      return d.promise();
    }

    const promise = modal ? showCommitModalWindow({
      layer,
      commitItems,
      close,
      commitPromise // add a commit promise
    }) : Promise.resolve(messages);

    promise
      .then(messages => {
        //check if application is online
        if (ApplicationState.online) {
          session.commit({items: items || commitItems})
            .then((commitItems, response) => {
              //@TODO need to double check why ApplicationState.online is repeated
              if (ApplicationState.online) {
                //if result is true
                if (response.result) {
                  const {autoclose=true, message="plugins.editing.messages.saved"} = messages.success;
                  if (messages && messages.success) {
                    GUI.showUserMessage({
                      type: 'success',
                      message,
                      duration: 3000,
                      autoclose
                    });
                  }

                  //In case of vector layer need to refresh map commit changes
                  if (layerType === Layer.LayerTypes.VECTOR) {
                    GUI.getService('map').refreshMap({force: true});
                  }

                  if (cb.done && cb.done instanceof Function) {
                    cb.done(toolbox);
                  }

                  // add items when close editing to results to show changes
                  const layerId = toolbox.getId(); 

                  if (undefined === this.state.featuresOnClose[layerId]) {
                    this.state.featuresOnClose[layerId] = new Set();
                  }

                  [
                    ...response.response.new.map(({id}) => id),
                    ...commitItems.update.map(update => update.id)
                  ].forEach(fid => this.state.featuresOnClose[layerId].add(fid))

                  //@since 3.7.2
                  //it is useful when click on save all disk icon in editing forma for relation purpose
                  this.emit('commit', response.response);

                } else { //result is false. An error occurs
                  const parser = new serverErrorParser({
                    error: response.errors
                  });

                  const errorMessage = parser.parse({
                    type: 'String'
                  });

                  const {autoclose=false, message} = messages.error;

                  GUI.showUserMessage({
                    type: 'alert',
                    message: message || errorMessage,
                    textMessage: !message,
                    autoclose
                  });

                  if (cb.error && cb.error instanceof Function) {
                    cb.error(toolbox, message || errorMessage);
                  }
                }

                d.resolve(toolbox);
              }
            })
            .fail((error={}) => {
              //parse error server
              const parser = new serverErrorParser({
                error: error.errors ? error.errors : error
              });
              //set type string
              const errorMessage = parser.parse({
                type: 'String'
              });

              const {autoclose = false, message} = messages.error;

              GUI.showUserMessage({
                type: 'alert',
                message: message || errorMessage,
                textMessage: !message,
                autoclose
              });

              d.reject(toolbox);

              if (cb.error && cb.error instanceof Function) {
                cb.error(toolbox, message || errorMessage);
              }
            });
        //case offline
      } else {
        saveOfflineItem({
          data: { [session.getId()]: commitItems },
          id: 'EDITING_CHANGES'
        })
          .then(() => {
            GUI.showUserMessage({
              type: 'success',
              message: "plugins.editing.messages.saved_local",
              autoclose: true
            });
            session.clearHistory();
            d.resolve(toolbox);
          })
          .catch(error => {
            GUI.showUserMessage({
              type: 'alert',
              message: error,
              textMessage: true,
            });

            d.reject(toolbox);
          })
        }
      })
      .catch((e) => {
        console.warn(e);
        d.reject(toolbox)
    });

    return commitPromise;
  }

 /**
  * @param { Object } opts
  * @param { string } opts.layerId
  * @param { Array }  opts.sessionItems
  * @param opts.action
  */
  undoRedoLayerUniqueFieldValues({
    layerId,
    sessionItems = [],
    action,
  }) {

    // if not set
    if (undefined === this.state.uniqueFieldsValues[layerId]) {
      return;
    }

    sessionItems.forEach(item => {

      Object
        .keys(this.state.uniqueFieldsValues[layerId])
        .forEach(name => {
          const is_array = Array.isArray(item);
          let oldVal, newVal;
          if (is_array) { // 0 = old feature, 1 = new feature
            const has_change = item[1].feature.get(name) != item[0].feature.get(name);
            // update feature that contains "new" and "old" values of feature
            oldVal = has_change ? (action === 'undo' ? item[1].feature.get(name) :  item[0].feature.get(name)) : undefined;
            newVal = has_change ? (action === 'undo' ? item[0].feature.get(name) :  item[1].feature.get(name)) : undefined;
          } else {
            oldVal = 'add' === item.feature.getState()    ? item.feature.get(name) : undefined;
            newVal = 'delete' === item.feature.getState() ? item.feature.get(name) : undefined;
          }
          // delete layer unique field value
          if (undefined !== oldVal) {
            this.state.uniqueFieldsValues[layerId][name].delete(oldVal);
          }
          // add layer unique field value
          if (undefined !== newVal) {
            this.state.uniqueFieldsValues[layerId][name].add(newVal);
          }
        });
    });
  }

  /**
   * @param { Object } opts
   * @param opts.relationSessionItems
   * @param opts.action
   */
  undoRedoRelationUniqueFieldValues({
    relationSessionItems,
    action,
  }) {
    Object
      .entries(relationSessionItems)
      .forEach(([layerId, {own:sessionItems, dependencies:relationSessionItems}]) => {
        this.undoRedoLayerUniqueFieldValues({
          layerId,
          sessionItems,
          action
        });
        this.undoRedoRelationUniqueFieldValues({
          relationSessionItems,
          action
        })
      })
  }

  /**
   * ORIGINAL SOURCE: g3w-client-plugin-editing/api/index.js@v3.7.1
   *
   * Stop editing on layerId
   *
   * @param layerId
   * @param options
   *
   * @returns { Promise<unknown> }
   *
   * @since g3w-client-plugin-editing@v3.7.2
   */
  async stopEditing(layerId, options = {}) {
    return promisify(
      this.getToolBoxById(layerId).stop(options)
    );
  }

  /**
   * ORIGINAL SOURCE: g3w-client-plugin-editing/api/index.js@v3.7.1
   *
   * Start editing API
   *
   * @param layerId
   * @param { Object } options
   * @param { boolean } [options.selected=true]
   * @param { boolean } [options.disablemapcontrols=false]
   * @param { boolean } [options.showselectlayers=true]
   * @param options.title
   *
   * @returns { Promise<unknown> }
   *
   * @since g3w-client-plugin-editing@v3.7.2
   */
  async startEditing(layerId, options = {}, data = false) {
    options.selected           = undefined === options.selected           ? true : options.selected;
    options.showselectlayers   = undefined === options.showselectlayers   ? true : options.showselectlayers;
    options.disablemapcontrols = undefined === options.disablemapcontrols ? false : options.showselectlayers;
    // get toolbox related to layer id
    const toolbox = this.getToolBoxById(layerId);
    // set show select layers input visibility
    this.state.showselectlayers = options.showselectlayers;
    // skip when ..
    if (!toolbox) {
      return Promise.reject();
    }
    // set selected
    toolbox.setSelected(options.selected);
    // set seletcted toolbox
    if (options.selected) {
      this.state.toolboxselected = toolbox;
    }
    if (options.title) {
      toolbox.setTitle(options.title);
    }
    // start editing toolbox (options contain also filter type)
    data = await promisify(toolbox.start(options))
    // disablemapcontrols in conflict
    if (options.disablemapcontrols) {
      GUI.getService('map').disableClickMapControls(true);
    }
    // opts contain information about start editing has features loaded
    return data ? { toolbox, data } : toolbox;
  }

  /**
   * ORIGINAL SOURCE: g3w-client-plugin-editing/api/index.js@v3.7.1
   *
   * Add Feature
   *
   * @param { Object } opts
   * @param opts.layerId
   * @param opts.feature
   *
   * @since g3w-client-plugin-editing@v3.7.2
   */
  addLayerFeature({
    layerId,
    feature,
  } = {}) {
    // skip when mandatory params are missing
    if (undefined === feature || undefined === layerId) {
      return Promise.reject();
    }
    return new Promise((resolve, reject) => {
      const layer = this.getLayerById(layerId);
      // get session
      const session = this.getSessionById(layerId);
      // exclude an eventually attribute pk (primary key) not editable (mean autoincrement)
      const attributes = layer
        .getEditingFields()
        .filter(attr => !(attr.pk && !attr.editable));
      // start session (get no features but set layer in editing)
      session.start({
        filter: {
          nofeatures: true,                    // no feature
          nofeatures_field: attributes[0].name // get first field in editing form
        },
        editing: true,
      })

      /** ORIGINAL SOURCE: g3w-client-plugin-editing/workflows/easyaddfeatureworkflow.js@v3.7.1 */
      // create workflow
      const workflow = new EditingWorkflow({
      type: 'addfeature',
      steps: [
        new OpenFormStep({
          push: true,
          showgoback: false,
          saveAll: false,
        })
      ],
    });

      const stop = cb => {
        workflow.stop();
        session.stop();
        return cb();
      };

      try {
        //check if feature has property of layer
        attributes.forEach(a => {
          if (undefined === feature.get(a.name)) {
            feature.set(a.name, null);
          }
        })

        //set feature as g3w feature
        feature = new Feature({ feature, properties: attributes.map(a => a.name) });
        //set new
        feature.setTemporaryId();

        // add to session and source as new feature
        session.pushAdd(layerId, feature, false);
        layer.getEditingLayer().getSource().addFeature(feature);

        //start workflow
        workflow.start({
          inputs:  { layer, features: [feature] },
          context: { session },
        })
        .then(() => {
          session.save();
          this
            .commit({ modal: false, toolbox: this.getToolBoxById(layerId) })
            .then(() => stop(resolve))
            .fail(() => stop(reject))
        })
        .fail(() => stop(reject));

      } catch(e) {
        console.warn(e);
        reject();
      }
    })
  }

  /**
   * @param { Object } save
   * @param save.mode     - default or autosave
   * @param save.cb       - object contain done/error two functions
   * @param save.modal    - Boolean true or false to show to ask
   * @param save.messages - object success or error
   */
  setSaveConfig({ mode = 'default', cb = {}, modal = false, messages } = {}) {
    Object.assign(this.state.saveConfig, { mode, modal, messages, cb: { ...this.state.saveConfig.cb, ...cb }});
  }

  addFormComponents({ layerId, components = [] } = {}) {
    this.state.formComponents[layerId] = (this.state.formComponents[layerId] || []).concat(components)
  }

  /**
   * ORIGINAL SOURCE: g3w-client-plugin-editing/api/index.js@v3.7.1
   *
   * Show editing panel
   *
   * @param options
   * @param options.toolboxes
   *
   * @since g3w-client-plugin-editing@v3.7.2
   */
  showPanel(options = {}) {
    if (options.toolboxes && Array.isArray(options.toolboxes)) {
      this.getToolBoxes().forEach(tb => tb.setShow(-1 !== options.toolboxes.indexOf(tb.getId())));
    }
    this.showEditingPanel(options);
  }

  /**
   * Show editing panel toolbars
   * 
   * ORIGINAL SOURCE: g3w-client-plugin-editing/g3w-editing-components/editing.js.js@3.6
   * ORIGINAL SOURCE: g3w-client-plugin-editing/g3w-editing-components/panel.js.js@3.6
   */
  showEditingPanel(opts={}) {
    if (this.getLayers().length > 0) {
      this.state.panel = new Panel({
        ...opts,
        id: "editing-panel",
        title: opts.title || "plugins.editing.editing_data",
        internalPanel: new (Vue.extend(EditingVueComponent))({
          service:       this,
          resourcesurl:  opts.resourcesUrl || GUI.getResourcesUrl(),
          showcommitbar: undefined !== opts.showcommitbar ? opts.showcommitbar : true,
        }),
      });
      GUI.showPanel(this.state.panel);
      if (!this.state.show_errors && this.state.layers_in_error) {
        GUI.showUserMessage({ type: 'warning', message: 'plugins.editing.errors.some_layers', closable: true });
        this.state.show_errors = true;
      }
    } else {
      GUI.showUserMessage({ type: 'alert', message: 'plugins.editing.errors.no_layers' })
    }
    return this.state.panel;
  }

  hideEditingPanel() {
    if (null !== this.state.panel) {
      GUI.closePanel();
      this.state.panel = null;
    }
  }

  unload() {
    this.hideEditingPanel();
    if (this.config.visible) {
      this.removeTools();
    }
    this.state.unwatchLayout();
    MapLayersStoreRegistry.removeLayersStore(MapLayersStoreRegistry.getLayersStore('editing'));
    SessionsRegistry.clear();
    // turn off events
    GUI.getService('map').off('mapcontrol:toggled', this.state.onMapControlToggled);
    // unregister query result action
    GUI.getService('queryresults').un('editFeature', this.state.editFeatureKey);
  }
  
  setCurrentLayout() {
    ApplicationService.setCurrentLayout(this.getName());
  }

  resetCurrentLayout() {
    ApplicationService.setCurrentLayout(this.state.currentLayout);
  }

});