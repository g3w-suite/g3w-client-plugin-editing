import './g3wsdk';
import pluginConfig                              from './config';
import { EditingWorkflow }                       from './g3wsdk/workflow/workflow';
import SessionsRegistry                          from './g3wsdk/editing/sessionsregistry';
import { promisify, $promisify }                 from './utils/promisify';
import { createFeature }                         from './utils/createFeature';
import { getProjectLayerFeatureById }            from './utils/getProjectLayerFeatureById';
import { getEditingLayerById }                   from './utils/getEditingLayerById';
import { setAndUnsetSelectedFeaturesStyle }      from './utils/setAndUnsetSelectedFeaturesStyle';
import {
  OpenFormStep,
  AddFeatureStep,
  AddPartToMultigeometriesStep,
  ConfirmStep,
}                                                from './workflows';
import EditingVueComponent                       from './components/Editing.vue';


const { G3W_FID }                              = g3wsdk.constant;
const { ApplicationState, ApplicationService } = g3wsdk.core;
const { CatalogLayersStoresRegistry }          = g3wsdk.core.catalog;
const { t, tPlugin }                           = g3wsdk.core.i18n;
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
    AddFeatureStep,
    AddPartToMultigeometriesStep,
    ConfirmStep,
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
     * ORIGINAL SOURCE: g3w-client-plugin-editing/services/editingservice.js@v3.7.8
     * 
     * Global plugin state
     * 
     * @since g3w-client-plugin-editing@v3.8.0
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

  /**
   * ORIGINAL SOURCE: g3w-client-plugin-editing/services/editingservice.js@v3.7.8
   * 
   * @since g3w-client-plugin-editing@v3.8.0
   */
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

    // add editing layer store to mapstoreregistry
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

    let i = 0;
    this
      .getLayers()
      .forEach(editingLayer => {
        /**
         * set 1:1 relations fields editable
         * 
         * Check if layer has relation 1:1 (type ONE) and if fields
         *
         * belong to relation where child layer is editable
         *
         * @since g3w-client-plugin-editing@v3.7.0
         */
        const fatherId = editingLayer.getId();                                              // father layer
        CatalogLayersStoresRegistry
          .getLayerById(fatherId)
          .getRelations()
          .getArray()
          .filter(relation => 'ONE' === relation.getType() && fatherId === relation.getFather()) // 'ONE' == join 1:1 + father layerId is a father of relation
          .forEach(relation => {
            const isChildEditable = undefined !== this.getLayerById(relation.getChild());        // check if child layerId is editable (in editing)
            this
              .getLayerById(relation.getFather())
              .getEditingFields()
              .filter(f => f.vectorjoin_id && f.vectorjoin_id === relation.getId())              // father layer fields (in editing)
              .forEach(field => { field.editable = (field.editable && isChildEditable); });      // current editable boolean value + child editable layer
          });
        // Set editing layer color and toolbox style
        if (!editingLayer.getColor()) {
          editingLayer.setColor([
            "#C43C39", "#d95f02", "#91522D", "#7F9801", "#0B2637",
            "#8D5A99", "#85B66F", "#8D2307", "#2B83BA", "#7D8B8F",
            "#E8718D", "#1E434C", "#9B4F07", '#1b9e77', "#FF9E17",
            "#7570b3", "#204B24", "#9795A3", "#C94F44", "#7B9F35",
            "#373276", "#882D61", "#AA9039", "#F38F3A", "#712333",
            "#3B3A73", "#9E5165", "#A51E22", "#261326", "#e4572e",
            "#29335c", "#f3a712", "#669bbc", "#eb6841", "#4f372d",
            "#cc2a36", "#00a0b0", "#00b159", "#f37735", "#ffc425",
          ][i++ % 40]);
        }
      });

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

    await GUI.isReady();
    this._setupGUI();

    this.setHookLoading({ loading: false });
    this.setApi(this.service.getApi());
    this.setReady(true);
  }

  // setup plugin interface
  async _setupGUI() {

    // skip when ..
    if (!this.registerPlugin(this.config.gid) || false === this.config.visible) {
      return;
    }

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

 /**
  * [API Method] ORIGINAL SOURCE: g3w-client-plugin-editing/api/index.js@v3.7.8
  * 
  * Get session
  *
  * @param layerId
  *
  * @returns {*}
  * 
  * @since g3w-client-plugin-editing@v3.8.0
  */
  getSession({ layerId } = {}) {
    return this.getToolBoxById(layerId).getSession();
  }

  /**
   * [API Method] ORIGINAL SOURCE: g3w-client-plugin-editing/api/index.js@v3.7.8
   *
   * @param layerId
   *
   * @returns Feature in editing
   * 
   * @since g3w-client-plugin-editing@v3.8.0
   */
  getFeature({ layerId } = {}) {
    return this.getToolBoxById(layerId).getActiveTool().getFeature();
  }

  /**
   * [API Method] ORIGINAL SOURCE: g3w-client-plugin-editing/api/index.js@v3.7.8
   * 
   * Subscribe handler function on event
   *
   * @param event
   * @param { Function } fnc
   *
   * @returns { Function } function
   * 
   * @since g3w-client-plugin-editing@v3.8.0
   */
  subscribe(event, fnc) {
    if (!this.state.subscribers[event]) this.state.subscribers[event] = [];
    if (!this.state.subscribers[event].find(subscribe => subscribe === fnc)) this.state.subscribers[event].push(fnc);
    return fnc;
  }

  /**
   * [API Method] ORIGINAL SOURCE: g3w-client-plugin-editing/api/index.js@v3.7.8
   * 
   * Unsubscribe handler function on event
   *
   * @param event
   * @param fnc
   * 
   * @since g3w-client-plugin-editing@v3.8.0
   */
  unsubscribe(event, fnc) {
    this.state.subscribers[event] = this.state.subscribers[event].filter(subscribe => subscribe !== fnc);
  }

  /**
   * ORIGINAL SOURCE: g3w-client-plugin-editing/services/editingservice.js@v3.7.8
   * 
   * @param event
   * @param options
   *
   * @returns { Promise<unknown> }
   * 
   * @since g3w-client-plugin-editing@v3.8.0
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
   * ORIGINAL SOURCE: g3w-client-plugin-editing/services/editingservice.js@v3.7.8
   * 
   * Undo method
   * 
   * @since g3w-client-plugin-editing@v3.8.0
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
   * ORIGINAL SOURCE: g3w-client-plugin-editing/services/editingservice.js@v3.7.8
   * 
   * @since g3w-client-plugin-editing@v3.8.0
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
   * ORIGINAL SOURCE: g3w-client-plugin-editing/services/editingservice.js@v3.7.8
   * 
   * @param id
   *
   * @returns {*}
   * 
   * @since g3w-client-plugin-editing@v3.8.0
   */
  getEditingLayer(id) {
    return this.state.editableLayers[id].getEditingLayer();
  }

  /**
   * ORIGINAL SOURCE: g3w-client-plugin-editing/services/editingservice.js@v3.7.8
   * 
   * @param toolbox
   * 
   * @since g3w-client-plugin-editing@v3.8.0
   */
  addToolBox(toolbox) {
    this.state._toolboxes.push(toolbox);
    this.state.sessions[toolbox.getId()] = toolbox.getSession(); // add session
    this.state.toolboxes.push(toolbox.state);
  }

  /**
   * ORIGINAL SOURCE: g3w-client-plugin-editing/services/editingservice.js@v3.7.8
   * 
   * @param { Object } handler
   * @param handler.type
   * @param handler.id
   *
   * @returns { Promise<void> }
   * 
   * @since g3w-client-plugin-editing@v3.8.0
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
   * ORIGINAL SOURCE: g3w-client-plugin-editing/services/editingservice.js@v3.7.8
   * 
   * Reset default values
   * 
   * @since g3w-client-plugin-editing@v3.8.0
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
   * [API Method] ORIGINAL SOURCE: g3w-client-plugin-editing/api/index.js@v3.7.1
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
   * ORIGINAL SOURCE: g3w-client-plugin-editing/services/editingservice.js@v3.7.8
   * 
   * @returns { Array }
   * 
   * @since g3w-client-plugin-editing@v3.8.0
   */
  getLayers() {
    return Object.values(this.state.editableLayers);
  }

  /**
   * ORIGINAL SOURCE: g3w-client-plugin-editing/services/editingservice.js@v3.7.8
   * 
   * @param { string } layerId
   *
   * @returns {*}
   * 
   * @since g3w-client-plugin-editing@v3.8.0
   */
  getLayerById(layerId) {
    return this.state.editableLayers[layerId];
  }

  /**
   * ORIGINAL SOURCE: g3w-client-plugin-editing/services/editingservice.js@v3.7.8
   * 
   * @param { string } toolboxId
   *
   * @returns {*}
   * 
   * @since g3w-client-plugin-editing@v3.8.0
   */
  getToolBoxById(toolboxId) {
    return this.state._toolboxes.find(tb => tb.getId() === toolboxId);
  }

  /**
   * ORIGINAL SOURCE: g3w-client-plugin-editing/services/editingservice.js@v3.7.8
   * 
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
   * ORIGINAL SOURCE: g3w-client-plugin-editing/services/editingservice.js@v3.7.8
   * 
   * Method to apply filter editing contsraint to toolbox editing
   * Apply filter editing contsraint to toolbox editing
   *
   * @param constraints
   * 
   * @since g3w-client-plugin-editing@v3.8.0
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
   * ORIGINAL SOURCE: g3w-client-plugin-editing/services/editingservice.js@v3.7.8
   * 
   * @returns { Array }
   * 
   * @since g3w-client-plugin-editing@v3.8.0
   */
  getToolBoxes() {
    return this.state._toolboxes;
  }

  /**
   * ORIGINAL SOURCE: g3w-client-plugin-editing/services/editingservice.js@v3.7.8
   * 
   * @returns {*|{}}
   * 
   * @since g3w-client-plugin-editing@v3.8.0
   */
  getEditableLayers() {
    return this.state.editableLayers;
  }

  /**
   * ORIGINAL SOURCE: g3w-client-plugin-editing/services/editingservice.js@v3.7.8
   * 
   * Stop editing
   *
   * @returns { Promise<unknown> }
   * 
   * @since g3w-client-plugin-editing@v3.8.0
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
  * ORIGINAL SOURCE: g3w-client-plugin-editing/services/editingservice.js@v3.7.8
  * 
  * Function called very single change saved temporary
  * 
  * @since g3w-client-plugin-editing@v3.8.0
  */
  async saveChange() {
    if ('autosave' === this.state.saveConfig.mode) {
      return this.commit({ modal: false }); // set to not show modal ask window
    }
  }

  /**
   * ORIGINAL SOURCE: g3w-client-plugin-editing/services/editingservice.js@v3.7.8
   * 
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
   * @returns jQuery promise
   * 
   * @since g3w-client-plugin-editing@v3.8.0
   */
  commit({
    toolbox,
    commitItems,
    modal = true,
    close = false,
  } = {}) {
    const cb            = Object.assign(this.state.saveConfig.cb       || {}, { done() {},  error() {} });
    const messages      = Object.assign(this.state.saveConfig.messages || {}, { success: {}, error: {} });
    toolbox             = toolbox || this.state.toolboxselected;
    let layer           = toolbox.getLayer();
    const items         = commitItems;
    commitItems         = commitItems || toolbox.getSession().getCommitItems();
    const online        = ApplicationState.online;
    const has_changes   = [
      ...(commitItems.add || []),
      ...(commitItems.delete || []),
      ...(commitItems.update || []),
      ...Object.keys(commitItems.relations || {})
    ].length;
    let workflow, dialog, serverError;

    return $promisify(async () => {

      // skip when there is nothing to save
      if (!has_changes) {
        GUI.showUserMessage({ type: 'info', message: 'Nothing to save', autoclose: true, closable: false });
        return toolbox;
      }

      try {

        // show commit modal window
        /** ORIGINAL SOURCE: g3w-client-plugin-editing/services/editingservice.js@v3.7.8 */
        if (modal) {
          workflow = new EditingWorkflow({
            type: 'commitfeatures',
            steps: [
              new ConfirmStep({
                dialog(inputs) {
                  return $.Deferred(d => {
                    const dialog = GUI.dialog.dialog({
                      message: inputs.message,
                      title: `${tPlugin("editing.messages.commit_feature")}: "${inputs.layer.getName()}"`,
                      buttons: {
                        SAVE:   { className: "btn-success", callback() { d.resolve(inputs); },    label: t("save"),   },
                        CANCEL: { className: "btn-danger",  callback() { d.reject(); },           label: t(inputs.close ? "exitnosave" : "annul") },
                        ...(inputs.close ? { CLOSEMODAL :
                                { className: "btn-primary", callback() { dialog.modal('hide'); }, label:  t("annul") }
                        } : {}),
                      }
                    });
                    if (inputs.features) {
                      setAndUnsetSelectedFeaturesStyle({ promise: d.promise(), inputs, style: this.selectStyle });
                    }
                  }).promise();
                }
              })
            ]
          });

          await promisify(
            workflow.start({
              inputs: {
                close,
                layer,
                message: _list_changes(commitItems, layer),
              }
            })
          );

          dialog = GUI.dialog.dialog({
            message: `<h4 class="text-center"><i style="margin-right: 5px;" class=${GUI.getFontClass('spinner')}></i>${t('editing.messages.saving')}</h4>`,
            closeButton: false
          });

          // messages set to commit
          Object.assign(messages, {
            success: {
              message: "plugins.editing.messages.saved",
              autoclose: true,
            },
            error: {},
          });
        }

        let data = !online && { [toolbox.getSession().getId()]: commitItems };
        const changes = !online && ApplicationService.getOfflineItem('EDITING_CHANGES');

        // handle offline changes
        /** ORIGINAL SOURCE: g3w-client-plugin-editing/services/editingservice.js@v3.7.8 */
        Object.keys(changes || {}).forEach(layerId => {
          const currLayerId = Object.keys(data)[0];

          // check if previous changes are made in the same layer or in relationlayer of current
          let current = null;

          if (data[layerId]) {
            current = data;
          } else if (data[currLayerId].relations[layerId]) {
            current = data[currLayerId].relations;
          }

          // check if in the last changes
          const relationsIds  = !current && Object.keys(changes[layerId].relations || {});
          const has_relations  = !current && relationsIds.length;
          const GIVE_ME_A_NAME = !current && has_relations && relationsIds.includes(currLayerId);

          // apply changes
          if (current || GIVE_ME_A_NAME) {
            const id   = current ? layerId : currLayerId;
            const curr = current ? current : data;
            const prev = current ? changes : changes[layerId].relations;
            curr[id].add    = [...curr[id].add, ...curr[id].add];
            curr[id].delete = [...curr[id].delete, ...curr[id].delete];
            (prev[id].update || [])
              .filter(update => !curr[id].update.find(u => u.id === update.id))
              .forEach(update => curr[id].update.unshift(update));
            (prev[id].lockids || [])
              .filter(lock => !curr[id].lockids.find(l => l.featureid === lock.featureid))
              .forEach(lock => curr[id].update.unshift(lock));
          }

          if (GIVE_ME_A_NAME) {
            changes[layerId].relations[currLayerId] = data[currLayerId];
            data = changes;
          }
          if (!current && !has_relations) {
            data[layerId] = changes[layerId]
          }
        });

        if (!online) {
          GUI.showUserMessage({
            type: 'success',
            message: "plugins.editing.messages.saved_local",
            autoclose: true
          });
          toolbox.getSession().clearHistory();
        }

        // check if application is online
        const { commit, response } = online ? await promisify(
          toolbox.getSession().commit({ items: items || commitItems, __esPromise: true })
        ) : {};

        // @TODO need to double check why ApplicationState.online is repeated
        const online2 = online && commit && ApplicationState.online;
        const result = online2 && response.result;

        if (result && messages && messages.success) {
          GUI.showUserMessage({
            type: 'success',
            message: messages.success.message || "plugins.editing.messages.saved",
            duration: 3000,
            autoclose: undefined !== messages.success.autoclose ? messages.success.autoclose : true,
          });
        }

        // In case of vector layer need to refresh map commit changes
        if (result && layer.getType() === Layer.LayerTypes.VECTOR) {
          GUI.getService('map').refreshMap({ force: true });
        }

        if (online) {
          cb.done(toolbox);
        }

        // add items when close editing to results to show changes
        const layerId = result && toolbox.getId(); 

        if (layerId) {
          this.state.featuresOnClose[layerId] = this.state.featuresOnClose[layerId] || new Set();
        }

        if (result) {
          [
            ...response.response.new.map(n => n.id),
            ...commit.update.map(u => u.id)
          ].forEach(fid => this.state.featuresOnClose[layerId].add(fid));
        }

        // @since 3.7.2 - click on save all disk icon (editing form relation)
        if (result) {
          this.emit('commit', response.response);
        }

        // result is false. An error occurs
        if (online2 && !result) { 
          serverError = true;
          throw response;
        }
      } catch (e) {
        console.warn(e);

        // rollback relations
        if (modal) {
          try { await _rollback(commitItems.relations); }
          catch (e) { console.warn(e); }
        }

        // parse server error
        if (serverError || !modal) {
          const message = online
            ? (messages.error.message || (new serverErrorParser({ error: e.errors || e || {}})).parse({ type: 'String' }))
            : e;

          GUI.showUserMessage({
            type:        'alert',
            message,
            textMessage: online ? !messages.error.message : true,
            autoclose:   online ? (undefined !== messages.error.autoclose ? messages.error.autoclose : false) : false,
          });

          cb.error(toolbox, message);
        }

        return Promise.reject(toolbox);
      } finally {
        if (modal) {
          workflow.stop()
        }
        // hide saving dialog
        if (dialog) {
          dialog.modal('hide');
        }
      }
      return toolbox;
    });
  }

 /**
  * ORIGINAL SOURCE: g3w-client-plugin-editing/services/editingservice.js@v3.7.8
  * 
  * @param { Object } opts
  * @param { string } opts.layerId
  * @param { Array }  opts.sessionItems
  * @param opts.action
  * 
  * @since g3w-client-plugin-editing@v3.8.0
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
   * ORIGINAL SOURCE: g3w-client-plugin-editing/services/editingservice.js@v3.7.8
   * 
   * @param { Object } opts
   * @param opts.relationSessionItems
   * @param opts.action
   * 
   * @since g3w-client-plugin-editing@v3.8.0
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
   * [API Method] ORIGINAL SOURCE: g3w-client-plugin-editing/api/index.js@v3.7.1
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
   * [API Method] ORIGINAL SOURCE: g3w-client-plugin-editing/api/index.js@v3.7.1
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
   * [API Method] ORIGINAL SOURCE: g3w-client-plugin-editing/api/index.js@v3.7.1
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
   * ORIGINAL SOURCE: g3w-client-plugin-editing/services/editingservice.js@v3.7.8
   * 
   * @param { Object } save
   * @param save.mode     - default or autosave
   * @param save.cb       - object contain done/error two functions
   * @param save.modal    - Boolean true or false to show to ask
   * @param save.messages - object success or error
   * 
   * @since g3w-client-plugin-editing@v3.8.0
   */
  setSaveConfig({ mode = 'default', cb = {}, modal = false, messages } = {}) {
    Object.assign(this.state.saveConfig, { mode, modal, messages, cb: { ...this.state.saveConfig.cb, ...cb }});
  }

  /**
   * ORIGINAL SOURCE: g3w-client-plugin-editing/services/editingservice.js@v3.7.8 
   * 
   * @since g3w-client-plugin-editing@v3.8.0
   */
  addFormComponents({ layerId, components = [] } = {}) {
    this.state.formComponents[layerId] = (this.state.formComponents[layerId] || []).concat(components)
  }

  /**
   * [API Method] ORIGINAL SOURCE: g3w-client-plugin-editing/api/index.js@v3.7.1
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
   * ORIGINAL SOURCE: g3w-client-plugin-editing/g3w-editing-components/editing.js.js@v3.6
   * ORIGINAL SOURCE: g3w-client-plugin-editing/g3w-editing-components/panel.js.js@v3.6
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
  
  /**
   * @since g3w-client-plugin-editing@v3.8.0
   */
  setCurrentLayout() {
    ApplicationService.setCurrentLayout(this.getName());
  }

  /**
   * @since g3w-client-plugin-editing@v3.8.0
   */
  resetCurrentLayout() {
    ApplicationService.setCurrentLayout(this.state.currentLayout);
  }

});

/**
 * @param { Object } commits
 * @param commits.add
 * @param commits.update
 * @param commits.delete
 * 
 * @returns { string } 
 */
function _list_changes(commits, layer) {
  const features  = layer.readFeatures();        // original features
  const efeatures = layer.readEditingFeatures(); // edited features
  return Object
    .keys(commits)
    .filter(c => !['relations', 'lockids'].includes(c)) // no relations here
    .map(c =>
      `<h4>${tPlugin('editing.messages.commit.' + c)} (${ commits[c].length })</h4>`
      + `<ul style="list-style: none; padding-left: 0;">`
      + `${ commits[c].map(item => {
        const id     = item.id || item;
        //find feature in starting state of editing
        const feat   = features.find(f => id === f.getId());
        // find feature in the current state of an editing source
        // In the case of deleted existing feature e feat need to get feat 
        const efeat  = efeatures.find(f => id === f.getId()) || feat;
        //need to check also if geometry is not undefined (alphanumerical layer feature)
        const type   = efeat && efeat.getGeometry && efeat.getGeometry() ? efeat.getGeometry().getType() : '';
        const attrs  = Object.entries(efeat ? efeat.getProperties() : {}).sort((a, b) => a[0] > b[0]);
        return `<li style="margin-bottom: 8px;"><details><summary style="display: list-item;font-weight: bold;padding: 0.5em;cursor: pointer;background-color: rgb(255, 255, 0, 0.25);font-size: medium;user-select: none;">${type} #${id}</summary>${
          attrs.map(([k,v]) => {
            const edited = efeat && v !== efeat.get(k);
            const ins = edited ? ` ← <ins style="background-color: lime; text-decoration-line: none;">${ efeat.get(k) }</ins>` : '';
            const del = edited ? `<del style="background-color: tomato;">${v}</del>` : '';
            return `<b style="padding-left: 1ch;">${k}</b>: ${ (del + ins) || v} <br>`;
          }).join('')
        }</details></li>`
      }).join('')}`
      + `</ul><hr>`).join('')
    // edited relations
    + ((Object.keys(commits.relations) || []).length > 0
      ? `<h4 style='padding-left: 40%;border-top: #f4f4f4 1px solid; font-weight: bold'> ${ tPlugin('editing.relations') }</h4> 
          ${Object.entries(commits.relations)
            .map(r => { 
              const layer = g3wsdk.core.plugin.PluginsRegistry.getPlugin('editing').service.getLayerById(r[0]); 
              return `<b class="skin-color">"${ layer.getName() }"</b>` + _list_changes(r[1], layer) }
            ).join('')}`
      : '');
    + ((Object.keys(commits.relations) || []).length ? Object.entries(commits.relations).map(r => {
      const relation = g3wsdk.core.plugin.PluginsRegistry.getPlugin('editing').getLayerById(r[0]);
      return `<h4 style="font-weight: bold; color: var(--skin-color);">${ tPlugin('editing.relation') }: ${relation.getName() }</h4> ${ _list_changes(r[1], relation)} `;
    }).join('') : '');
}

async function _rollback(relations = {}) {
  return Promise.allSettled(
    Object
    .entries(relations)
    .flatMap(([ layerId, { add, delete: del, update, relations = {}}]) => {
      const source  = getEditingLayerById(layerId).getEditingSource();
      const has_features = source.readFeatures().length > 0; // check if the relation layer has some features
      // get original values
      return [
        // add
        ...(has_features && add || []).map(async ({ id }) => {
          source.removeFeature(source.getFeatureById(id));
        }),
        // update
        ...(has_features && update || []).map(async ({ id }) => {
          const f = await getProjectLayerFeatureById({ layerId, fid: id });
          const feature = source.getFeatureById(id);
          feature.setProperties(f.properties);
          feature.setGeometry(f.geometry);
        }),
        // delete
        ...del.map(async id => {
          const f = await getProjectLayerFeatureById({ layerId, fid: id });
          const feature = new ol.Feature({ geometry: f.geometry })
          feature.setProperties(f.properties);
          feature.setId(id);
          // need to add again to source because it is for relation layer is locked
          source.addFeature(new Feature({ feature }));
        }),
        _rollback(relations),
      ];
    })
  );
}