import i18n                                    from './i18n';
import { Workflow }                            from './g3w-workflow';
import { Step }                                from './g3w-step';
import { createFeature }                       from './utils/createFeature';
import { getEditingLayerById }                 from './utils/getEditingLayerById';
import { setAndUnsetSelectedFeaturesStyle }    from './utils/setAndUnsetSelectedFeaturesStyle';
import { addPartToMultigeometries }            from './utils/addPartToMultigeometries';
import { getCatalogLayers }                    from './utils/getCatalogLayers';
import { getCatalogLayerById }                 from './utils/getCatalogLayerById';

import { OpenFormStep }                        from './actions/open-form';
import { AddFeatureStep }                      from './actions/add-feature';
import { ToolBox }                             from './g3w-toolbox';
import { Collection }                          from './g3w-collection';

const { G3W_FID }                              = g3wsdk.constant;
const { ApplicationState, G3WObject }          = g3wsdk.core;
const _                                        = g3wsdk.core.i18n.t;
const { Layer, LayersStore }                   = g3wsdk.core.layer;
const { Feature }                              = g3wsdk.core.layer.features;
const { Plugin, PluginService }                = g3wsdk.core.plugin;
const { XHR, noop, cloneDeep }                 = g3wsdk.core.utils;
const { GUI }                                  = g3wsdk.gui;
const { Panel }                                = g3wsdk.gui.vue;
const { Server: serverErrorParser }            = g3wsdk.core.errors.parsers;
const { Geometry }                             = g3wsdk.core.geoutils;
const {
  getScaleFromResolution,
  getResolutionFromScale,
}                                              = g3wsdk.ol.utils;

const is_defined = d => undefined !== d;

Object
  .entries({
    Workflow,
    OpenFormStep,
    AddFeatureStep,
    ToolBox,
  })
  .forEach(([k, v]) => console.assert(undefined !== v, `${k} is undefined`));

new (class extends Plugin {

  constructor() {

    super({
      name: 'editing',
      i18n,
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
          done:  () => {},       // function executed after commit change done
          error: () => {}        // function executed after commit changes error
        }
      },
      layers: {},                // editable layers (vector)
      editors: {},
      features: {},              // edited features (local)
      lock_ids: {},              // locked features
      loaded_ids: {},            // Ids of features loaded by current user
      events:              {
        'start-editing':         {},
        'show-relation-editing': {},
        layer: {
          start_editing: {
            before: {},
            after:  {}
          }
        }
      },
      show_errors:    false,
      editFeatureKey: undefined,
      panel:          null, // editing panel
      currentLayout:  ApplicationState.gui.layout.__current,
      unwatchLayout:  Vue.watch(
        () => ApplicationState.gui.layout.__current,
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

    // skip when no editable layer
    if (getCatalogLayers({ EDITABLE: true }).length) {
      this.#init();
    }

  }

  /**
   * ORIGINAL SOURCE: g3w-client-plugin-editing/services/editingservice.js@v3.7.8
   * 
   * @since g3w-client-plugin-editing@v3.8.0
   */
  async #init() {

    this.setHookLoading({ loading: true });

    /** ORIGINAL SOURCE: g3w-client-plugin-editing/api/index.js@v3.7.1 */
    this.service.setApi({
      api: {
        getSession:                       this.getSession.bind(this),
        getFeature:                       this.getFeature.bind(this),
        subscribe:                        this.subscribe.bind(this),
        unsubscribe:                      this.unsubscribe.bind(this),
        getToolBoxById:                   this.getToolBoxById.bind(this),
        getEditingLayerById:              getEditingLayerById, //@since 4.1.0
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
    ApplicationState.layers['editing'] = new LayersStore({ id: 'editing', queryable: false, catalog: false });

    this.state.layers     = {};
    this.state._toolboxes = [];
    this.state.toolboxes  = [];
    
    let count = 0;

    // loop over editable layers
    (await Promise.allSettled(
      getCatalogLayers({ EDITABLE: true }, { TOC_ORDER : true })
        /** ORIGINAL SOURCE: g3w-client/src/map/layers/tablelayer.js@v4.0.0 */
        .map(async layer => {
          try {
            
          if (!layer.isEditable()) {
            return null;
          }
          
          // get layer editing config (from server)
          try {
            const {
            vector,
            constraints = {},
            capabilities,
          } = await layer.getProvider('data').getConfig();

            layer.state.editing =  {
              started:  false,
              modified: false,
              ready:    false
            }

            // add editing configurations
            layer.config.editing = {
              fields:                      vector.fields || [],
              format:                      vector.format,
              constraints,
              capabilities:                capabilities || ['add_feature', 'change_feature', 'change_attr_feature', 'delete_feature' ], // default editing capabilities
              form:                        { perc: null },                                                      // set editing form `perc` to null at beginning
              style:                       vector.style,                                                        // get vector layer style
              geometrytype:                vector.geometrytype,                                                 // whether is a vector layer,
              visible:                     (vector.editing || { visible: true }).visible,                       //@since 3.11.0 let know if layer should be editable directly (true) or through relation layer (false)
              layer_style:                 (vector.editing || { layer_style: null }).layer_style,               // @since v4.0.0 check if has a layer style to for editing form
            };

            // set vector layer color 
            if (vector.style) {
              layer.setColor(vector.style.color);
            }

            layer.state.editing.ready = true;
          } catch(e) {
            console.warn(e);
          }

          // set editing layer
          let editing_layer = Layer.LayerTypes.IMAGE === layer.getType()
            ? new g3wsdk.core.layer.VectorLayer(layer.config)
            : layer;

          const suffixUrl = `${ApplicationState.project.getType()}/${ApplicationState.project.getId()}/${layer.getId()}/`;
          const vectorUrl =  ApplicationState.project.state.vectorurl;

          this.state.features[layer.getId()]   = new Collection(Layer.LayerTypes.TABLE !== layer.getType());
          this.state.lock_ids[layer.getId()]   = [];
          this.state.loaded_ids[layer.getId()] = [];

          /**
           * ORIGINAL SOURCE: g3w-client-plugin-editing/g3wsdk/editing/editor.j@v4.0.0
           * ORIGINAL SOURCE: g3w-client/src/map/layers/featuresstore.js@v4.0.0
           * ORIGINAL SOURCE: g3w-client/src/app/core/layers/features/olfeaturesstore.js@v3.10.2
           */
          const editor = editing_layer._editor = Object.assign(new G3WObject, {

            /** Filter to getFeaturerequest */
            _filter: { bbox: null },
            /** @type { Boolean } true, mean all features of layer are get (e.g. Table layer) */
            _allfeatures: false,
            /** Referred layer */
            _layer:     layer,
            /** Original features (from server) */
            _features: [],
            /** @type { boolean } Whether editor is active or not */
            _started: false,
            urls: {
              editing:     `${vectorUrl}editing/${suffixUrl}`,
              commit:      `${vectorUrl}commit/${suffixUrl}`,
              config:      `${vectorUrl}config/${suffixUrl}`,
              unlock:      `${vectorUrl}unlock/${suffixUrl}`,
            },
            /** Store editing features */
            _featuresstore: Object.assign(new G3WObject, {
                setters: {
                  addFeatures: (feats = []) => feats.forEach(f => editor._featuresstore.addFeature(f)),
                  removeFeature: f => this.state.features[layer.getId()].remove(f),
                  updateFeature: f => this.state.features[layer.getId()].update(f),
                },
                clear:                     () => this.state.features[layer.getId()].clear(),
                addFeature:                f => this.state.features[layer.getId()].add(f),
                clone:                     () => cloneDeep(editor._featuresstore),
                getFeatureById:            () => this.state.features[layer.getId()].getArray().find(f => id == f.getId()),
                readFeatures:              () => this.state.features[layer.getId()].getArray(),
                getLength:                 () => this.state.features[layer.getId()].getArray().length,
                getFeaturesCollection:     () => this.state.features[layer.getId()]._store,
                setFeatures:               (feats = []) => { this.state.features[layer.getId()].clear(); editor._featuresstore.addFeatures(feats); },
            }),
            setters: {
              save:                       () => layer.save(),
              addFeature:                 f => editor._featuresstore.addFeature(f),
              updateFeature:              f => editor._featuresstore.updateFeature(f),
              deleteFeature:              f => editor._featuresstore.deleteFeature(f),
              setFeatures:               (f = []) => editor._featuresstore.setFeatures(f),
              getFeatures:               (l, o, p) => this.__getFeatures(layer.getId(), o, p),
              featuresLockedByOtherUser: f => {},
            },
            addFeature:          f => editor._featuresstore.addFeature(f),
            isStarted:           () => editor._started,
            getLockIds:          () => this.state.lock_ids[layer.getId()],
            getEditingSource:    () => editor._featuresstore,
            getSource:           () => layer.getSource(),
            getLayer:            () => layer,
            rollback:            (c = []) => this.__setChanges(layer.getId(), c, true),
            readFeatures:        () => editor._features,
            readEditingFeatures: () => editor._featuresstore.readFeatures(),
            commit:              c => this.__commitToEditor(layer.getId(), c),
            start:               o => this.__startEditor(layer.getId(), o),
            stop:                () => this.__stopEditor(layer.getId()),
            clear:               () => this.__clearEditor(layer.getId()),
          });

          // clone editable layer
          if (Layer.LayerTypes.TABLE === editing_layer.getType()) {
            editing_layer = editing_layer.clone(); 
          }

          this.state.editors[layer.getId()]            = editing_layer.getEditor(); 
          this.state.layers[layer.getId()]             = editing_layer;
          this.state.uniqueFieldsValues[layer.getId()] = {};

          /**
           * attach layer widgets event: get data from api when a field of a layer
           * is related to a wgis form widget (ex. relation reference, value map, etc..)
           */
          editing_layer
            .getEditingFields()
            .filter(field => field.input && 'select_autocomplete' === field.input.type && !field.input.options.filter_expression && !field.input.options.usecompleter)
            /** @TODO need to avoid to call the same fnc to same event many times to avoid waste server request time */
            .forEach(field => ['start-editing'].forEach(type => {
              const id                    = layer.getId();
              this.state.events[type][id] = this.state.events[type][id] || [];

              this.state.events[type][id].push(async () => {
                const options         = field.input.options;

                // remove all values
                options.loading.state = 'loading';
                options.values        = [];

                const relationLayer = options.layer_id && getCatalogLayerById(options.layer_id);
                const has_filter    = ([undefined, null].includes(options.filter_fields || []) || 0 === (options.filter_fields || []).length);

                try {

                  // relation reference widget + no filter set
                  if (options.relation_reference && has_filter) {
                    const response = await editing_layer.getFilterData({ fformatter: field.name }); // get data with fformatter
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
                    //ordering by value or key depend on orderbyvalue Boolean value
                    const response = await relationLayer.getDataTable({ ordering: options.orderbyvalue ? options.value : options.key });
                    if (response && response.features) {
                      options.values.push(...(response.features || []).map(feature => ({
                        key:   feature.properties[options.value],
                        value: feature.properties[options.key],
                      })));
                      options.loading.state = 'ready';
                      this.fireEvent('autocomplete', { field, features: response.features })
                      return options.values;
                    }
                  }

                  /** @TODO check if deprecated */
                  const features        = [];
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

            /**
             * set 1:1 relation fields editable
             * 
             * Check if layer has relation 1:1 (type ONE) and if fields
             *
             * belongs to relation where child layer is editable
             *
             * @since g3w-client-plugin-editing@v3.7.0
             */
            const fatherId = layer.getId(); // father layer
            getCatalogLayerById(fatherId)
              .getRelations()
              .getArray()
              .filter(relation => 'ONE' === relation.getType() && fatherId === relation.getFather()) // 'ONE' == join 1:1 + father layerId is a father of relation
              .forEach(relation => {
                const isChildEditable = undefined !== this.getLayerById(relation.getChild());        // check if child layerId is editable (in editing)
                this
                  .getLayerById(relation.getFather())
                  .getEditingFields()
                  .filter(f => f.vectorjoin_id && f.vectorjoin_id === relation.getId())              // father layer fields (in editing)
                  .forEach(f => { f.editable = (f.editable && isChildEditable); });      // current editable boolean value + child editable layer
              });
            // Set editing layer color and toolbox style
            if (!editing_layer.getColor()) {
              editing_layer.setColor(editing_layer.isGeoLayer() ? [
                "#C43C39", "#d95f02", "#91522D", "#7F9801", "#0B2637",
                "#8D5A99", "#85B66F", "#8D2307", "#2B83BA", "#7D8B8F",
                "#E8718D", "#1E434C", "#9B4F07", '#1b9e77', "#FF9E17",
                "#7570b3", "#204B24", "#9795A3", "#C94F44", "#7B9F35",
                "#373276", "#882D61", "#AA9039", "#F38F3A", "#712333",
                "#3B3A73", "#9E5165", "#A51E22", "#261326", "#e4572e",
                "#29335c", "#f3a712", "#669bbc", "#eb6841", "#4f372d",
                "#cc2a36", "#00a0b0", "#00b159", "#f37735", "#ffc425",
              ][count++ % 40] : '#fff');
            }

            // create toolbox
            this.addToolBox(new ToolBox(editing_layer, [...editing_layer.getChildren(), ...editing_layer.getFathers()].filter(id => this.getLayerById(id))));

          } catch (e) {
            this.state.layers_in_error = true;
            console.warn(e);
          }
        })
    ));

    // after add layers to layerstore
    ApplicationState.layers['editing'].addLayers(this.getLayers());
  
    await GUI.isReady();

    // setup GUI

    // skip when:
    // 1 - plugin is not referred to the current project id
    // 2 - configuration of plugin, visible is set to false
    // 3 - There aren't editable layers or all are not visible
    if (!(!this.registerPlugin(this.config.gid) || false === this.config.visible || 0 === this.getLayers().filter(l => l.config.editing.visible).length)) {
      this.state.editFeatureKey = GUI.getService('queryresults').onafter('editFeature', this.#onQueryResultsEditFeature.bind(this)),
      this.config.name          = this.config.name || "plugins.editing.editing_data";
      this.addToolGroup({ position: 0, title: 'EDITING' });
      this.addTools({
        action:  this.showEditingPanel,
        offline: false,
        icon:    'pencil'
      }, { position: 0, title: 'EDITING' });
    }

    this.setHookLoading({ loading: false });
    this.setReady(true);
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
    return this.getToolBoxById(layerId).getActiveTool().getLayer().features[0];
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
    if (!this.state.subscribers[event]) { this.state.subscribers[event] = [] }
    if (!this.state.subscribers[event].find(subscribe => fnc === subscribe)) { this.state.subscribers[event].push(fnc)}
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
    this.state.subscribers[event] = this.state.subscribers[event].filter(sub => fnc !== sub);
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
  async fireEvent(event, options = {}) {
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
    const session      = this.state.toolboxselected.getSession();
    const layerId      = session.getId();
    const sessionItems = session.getLastHistoryState().items;

    //update unique values fields after undo
    this.undoRedoLayerUniqueFieldValues({
      layerId,
      sessionItems,
      action: 'undo'
    });

    const undoItems = session.undo();
    //update unique values of relations after undo
    this.undoRedoRelationUniqueFieldValues({
      relationSessionItems: undoItems,
      action:               'undo'
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
    const session      = this.state.toolboxselected.getSession();
    const layerId      = session.getId();
    const sessionItems = session.getLastHistoryState().items;
    //update unique values fields after redo
    this.undoRedoLayerUniqueFieldValues({
      layerId,
      sessionItems,
      action: 'redo'
    });
    const redoItems = session.redo();
    //update unique values of relations after redo
    this.undoRedoRelationUniqueFieldValues({
      relationSessionItems: redoItems,
      action:               'redo'
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
    return this.state.layers[id].getEditingLayer();
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
      mode:     "default", // default, autosave
      modal:    false,
      messages: undefined, // object to set a custom message
      cb: {
        done:  () => {}, // function Called after save
        error: () => {}, // function called affect commit error
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
    plugin    = true,
    toolboxes = true,
  } = {}) {
    if (toolboxes) { this.getToolBoxes().forEach(tb => tb.resetDefault()) }
    if (plugin) { this.resetDefault() }
  }

  /**
   * ORIGINAL SOURCE: g3w-client-plugin-editing/services/editingservice.js@v3.7.8
   * 
   * @returns { Array }
   * 
   * @since g3w-client-plugin-editing@v3.8.0
   */
  getLayers() {
    return Object.values(this.state.layers);
  }

  /**
   * ORIGINAL SOURCE: g3w-client-plugin-editing/services/editingservice.js@v3.7.8
   * 
   * @param { string } id
   *
   * @returns {*}
   * 
   * @since g3w-client-plugin-editing@v3.8.0
   */
  getLayerById(id) {
    return this.state.layers[id];
  }

  /**
   * ORIGINAL SOURCE: g3w-client-plugin-editing/services/editingservice.js@v3.7.8
   * 
   * @param { string } id
   *
   * @returns {*}
   * 
   * @since g3w-client-plugin-editing@v3.8.0
   */
  getToolBoxById(id) {
    return this.state._toolboxes.find(tb => id === tb.getId());
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
  setApplicationEditingConstraints(constraints = { showToolboxesExcluded: true, toolboxes : {} }) {
    this.state.constraints = {
      ...this.state.constraints,
      ...constraints
    };

    const { toolboxes, showToolboxesExcluded } = constraints;
    const toolboxIds = Object.keys(toolboxes);
    if (false === showToolboxesExcluded) {
      this.state.toolboxes.forEach(t => t.show = toolboxIds.includes(t.id));
    }
    toolboxIds.forEach(id => this.getToolBoxById(id).setEditingConstraints(toolboxes[id]))
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
    return this.state.layers;
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
    const commitpromises = this.state._toolboxes
      .filter(t => t.getSession().getHistory().state.commit) // check if temp changes are waiting to save on server
      .map( toolbox => this.commit({ toolbox, modal : true }))
    try {
      await Promise.allSettled(commitpromises);    
    } catch(e) {
      console.warn(e);
    }

    this.state._toolboxes.forEach(t => t.stop());

    this.state.toolboxselected     = null;
    this.state.message             =  null;

    //reset unique values
    Object.keys(this.state.uniqueFieldsValues).forEach(id => this.state.uniqueFieldsValues[id] = {});

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
      return this.commit({ modal: false }); // set to not show a modal ask window
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
  async commit({
    toolbox,
    commitItems,
    modal = true,
    close = false,
  } = {}) {
    const messages      = Object.assign({ success: { message: "plugins.editing.messages.saved", autoclose: true }, error: {} }, (this.state.saveConfig.messages || {}));
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

    // skip when there is nothing to save
    if (!has_changes) {
      GUI.showUserMessage({ type: 'info', message: 'Nothing to save', autoclose: true, closable: false });
      return toolbox;
    }

    try {

      // show commit modal window
      /** ORIGINAL SOURCE: g3w-client-plugin-editing/services/editingservice.js@v3.7.8 */
      if (modal) {
        workflow = new Workflow({
          type: 'commitfeatures',
          steps: [
            // confirm step
            new Step({
              run(inputs) {
                return new Promise((resolve, reject) => {
                  const dialog = GUI.dialog.dialog({
                    message: inputs.message,
                    title:   `${_("plugins.editing.messages.commit_feature")}: "${inputs.layer.getName()}"`,
                    buttons: {
                      SAVE:   { className: "btn-success", callback() { resolve(inputs); }, label: _("save"),   },
                      CANCEL: { className: "btn-danger",  callback() { reject({cancel : true });        }, label: _(inputs.close ? "exitnosave" : "annul") },
                      ...(inputs.close ? { CLOSEMODAL : { className: "btn-primary", callback() { dialog.modal('hide'); }, label:  _("annul") }} : {}),
                    }
                  });
                  if (inputs.features) {
                    setAndUnsetSelectedFeaturesStyle({ promise: promise(), inputs, style: this.selectStyle });
                  }
                })
              },
            }
            ),
          ]
        });
        //need to get to confirm or cancel choose from modal
        try {
          await workflow.start({
            inputs: {
              close,
              layer,
              message: (new (Vue.extend(require('./components/Changes.vue').default))({
                propsData: {
                  commits: commitItems,
                  layer
                }})).$mount().$el,
            }
          })
          
          await workflow.stop();
        } catch(e) {
          console.warn(e);
          // In the case of pressed cancel button to commit features modal
          if (e && e.cancel) {
            return Promise.reject(e);
          }
          //need to be set server Error
          serverError = true;
        }

        //in case of online application
        if (online) {
          dialog = GUI.dialog.dialog({
            message: `<h4 class="text-center">
                        <i style="margin-right: 5px;" class=${GUI.getFontClass('spinner')}></i>${_('plugins.editing.messages.saving')}
                      </h4>`,
            closeButton: false
          });
        }
      }

      let data      = !online && { [toolbox.getSession().getId()]: commitItems };
      //get current offline editing changes
      const changes = !online && JSON.parse(window.localStorage.getItem('EDITING_CHANGES') || null);

      // handle offline changes
      /** ORIGINAL SOURCE: g3w-client-plugin-editing/services/editingservice.js@v3.7.8 */
      Object.keys(changes || {})
        .forEach(layerId => {
          const currLayerId = Object.keys(data)[0];

          // check if previous changes are made in the same layer or in relationlayer of current
          let current = null;

          if (data[layerId]) { current = data; }
          else if (data[currLayerId].relations[layerId]) {
            current = data[currLayerId].relations;
          }

          // check if in the last changes
          const relationsIds   = !current && Object.keys(changes[layerId].relations || {});
          const has_relations  = !current && relationsIds.length > 0;
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
          type:      'success',
          message:   "plugins.editing.messages.saved_local",
          autoclose: true
        });
        //clear history because it saved on browser
        toolbox.getSession().clearHistory();

      }

      try {
        // check if the application is online
        const { commit, response } = online ? await toolbox.getSession().commit({ items: items || commitItems }) : {};

        //check if is online and there are some commit items
        const online2 = online && commit;

        const result = online2 && response.result;

        if (result && messages && messages.success) {
          // hide saving dialog
          if (dialog) { dialog.modal('hide') }

          //Show save user message
          GUI.showUserMessage({
            type:     'success',
            message:   messages.success.message || "plugins.editing.messages.saved",
            duration:  2000,
            autoclose: undefined === messages.success.autoclose ? true : messages.success.autoclose,
          });
        }

        // In the case of vector layer need to refresh map commit changes
        if (result && Layer.LayerTypes.VECTOR === layer.getType() ) {
          GUI.getService('map').refreshMap({ force: true });
        }

        if (online) {
          this.state.saveConfig.cb.done(toolbox);
        }

        // add items when close editing to result to show changes
        const layerId = result && toolbox.getId();

        if (layerId) {
          this.state.featuresOnClose[layerId] = this.state.featuresOnClose[layerId] || new Set();
          [
            ...response.response.new.map(n => n.id),
            ...commit.update.map(u => u.id)
          ].forEach(fid => this.state.featuresOnClose[layerId].add(fid));
        }

        // @since 3.7.2 - click on save all disk icon (editing form relation)
        if (result) { this.emit('commit', response.response) }

        // the result is false. It was done a commit, but an error occurs
        if (online2 && !result) {
          serverError = true;
          throw response;
        }
      } catch(e) {
        console.warn(e);
        if (online) {
          serverError = true;
          throw e;
        }
      }

    } catch (e) {
      console.warn(e);

      // hide saving dialog
      if (dialog) { dialog.modal('hide') }

      // rollback
      //@TODO check if it is usefull
      if (modal) {
        try { await this.#rollback(commitItems.relations); }
        catch (e) { console.warn(e); }
      }

      // parse server error
      if (serverError || modal) {
        const message = online
          ? (messages.error.message || (new serverErrorParser({ error: e.errors || e || {}})).parse({ type: 'String' }))
          : e;

        GUI.showUserMessage({
          type:        'alert',
          message,
          textMessage: online ? !messages.error.message : true,
          autoclose:   online ? (undefined !== messages.error.autoclose ? messages.error.autoclose : false) : false,
        });

        this.state.saveConfig.cb.error(toolbox, message);
      }

      return Promise.reject(toolbox);
    }
    return toolbox;
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
        .forEach(name => { //name is the name of field
          //check if change is an update [oldVal, newValue]
          const is_array = Array.isArray(item);
          let oldVal, newVal;
          if (is_array) {
            // 0 = old value feature, 1 = new value feature
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
    relationSessionItems = {},
    action,
  }) {
    Object
      .entries(relationSessionItems)
      .forEach(([layerId, { own: sessionItems, dependencies: relationSessionItems }]) => {
        //undo/redo unique field of layer
        this.undoRedoLayerUniqueFieldValues({
          layerId,
          sessionItems,
          action
        });
        //undo/redo unique field of relations
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
    return this.getToolBoxById(layerId).stop(options);
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
   * @param { string }  [options.title]
   * @param data
   *
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
    // skip if toolbox doesn't exist
    if (!toolbox) {
      return Promise.reject();
    }
    // set selected
    toolbox.setSelected(options.selected);
    // set seletcted toolbox
    if (options.selected) { this.state.toolboxselected = toolbox }

    //set toolbox title if provide
    if (options.title) { toolbox.setTitle(options.title) }

    // start editing toolbox (options contain also a filter type)
    data = await toolbox.start(options);
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
    if ([ feature, layerId ].includes(undefined)) {
      return Promise.reject();
    }
    return new Promise(async (resolve, reject) => {
      const layer = this.getLayerById(layerId);
      // get session
      const session = this.getSessionById(layerId);
      // exclude an eventual attribute pk (primary key) not editable (mean autoincrement)
      const attributes = layer
        .getEditingFields()
        .filter(attr => !(attr.pk && !attr.editable));
      // start session (get no features but set layer in editing)
      session.start({
        filter: {
          nofeatures:       true,                    // no feature
          nofeatures_field: attributes[0].name // get the first field in editing form
        },
        editing: true,
      })

      /** ORIGINAL SOURCE: g3w-client-plugin-editing/workflows/easyaddfeatureworkflow.js@v3.7.1 */
      // create workflow
      const workflow = new Workflow({
        type: 'addfeature',
        steps: [
          new OpenFormStep({
            push:       true,
            showgoback: false,
            saveAll:    false,
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

        try {
          //set feature as g3w feature
          feature = new Feature({ feature, properties: attributes.map(a => a.name) });
          //set new
          feature.setTemporaryId();

          // add to session and source as new feature
          session.pushAdd(layerId, feature, false);
          layer.getEditingLayer().getSource().addFeature(feature);
          //start workflow
          await workflow.start({
            inputs:  { layer, features: [feature] },
            context: { session },
          });

          session.save();

          try {
            await this.commit({ modal: false, toolbox: this.getToolBoxById(layerId) });
            stop(resolve);
          } catch(e) {
            console.warn(e);
            stop(reject)
          }
        } catch(e) {
          console.warn(e);
          stop(reject);
        }
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
    this.state.formComponents[layerId] = (this.state.formComponents[layerId] || []).concat(components);
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
      this.getToolBoxes().forEach(tb => tb.setShow(options.toolboxes.includes(tb.getId())));
    }
    this.showEditingPanel(options);
  }

  /**
   * Show editing panel toolbars
   * 
   * ORIGINAL SOURCE: g3w-client-plugin-editing/g3w-editing-components/editing.js.js@v3.6
   * ORIGINAL SOURCE: g3w-client-plugin-editing/g3w-editing-components/panel.js.js@v3.6
   */
  showEditingPanel(opts = {}) {
    //need to filter visible
    if (this.getLayers().filter(l => l.config.editing.visible).length > 0) {
      this.state.panel = new Panel({
        ...opts,
        id:            "editing-panel",
        title:         opts.title || "plugins.editing.editing_data",
        internalPanel: new (Vue.extend(require('./components/Editing.vue').default))({
          service:           this,
          resourcesurl:      opts.resourcesUrl || GUI.getResourcesUrl(),
          showcommitbar:     undefined === opts.showcommitbar || opts.showcommitbar,
        }),
      })

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

    if (this.config.visible) { this.removeTools() }

    this.state.unwatchLayout();

    delete ApplicationState.layers['editing'];

    ToolBox.clear();
    // turn off events
    GUI.getService('map').off('mapcontrol:toggled', this.state.onMapControlToggled);
    // unregister query result action
    GUI.getService('queryresults').un('editFeature', this.state.editFeatureKey);
  }
  
  /**
   * @since g3w-client-plugin-editing@v3.8.0
   */
  setCurrentLayout() {
    ApplicationState.gui.layout.__current = this.getName() ?? 'app';
  }

  /**
   * @since g3w-client-plugin-editing@v3.8.0
   */
  resetCurrentLayout() {
    ApplicationState.gui.layout.__current = this.state.currentLayout ?? 'app';
  }

  /**
   * @since g3w-client-plugin-editing@v3.8.1
   */
  getActiveTool() {
    return this.getToolBoxes().filter(t => t.getActiveTool())[0];
  }

  /**
   * @since g3w-client-plugin-editing@v4.1.0
   */
  editor(layerId) {
    return this.state.editors[layerId];
  }

  /**
   * ORIGINAL SOURCE: g3w-client-plugin-editing/g3wsdk/editing/editor.j@v4.0.0
   * 
   * Get features from server method.
   * Used when vector Layer's bbox is contained into an already requested bbox (so no a new request is done).
   *
   * @param { number[] } options.filter.bbox bounding box Array [xmin, ymin, xmax, ymax]
   *
   * @returns { boolean } whether can perform a server request
   * 
   * @since g3w-client-plugin-editing@v4.1.0
   */
  async __getFeatures(layerId, options = {}, params = {}) {
    const editor = this.editor(layerId);

    // skip is not onlien or all features of layers are already got
    if (!ApplicationState.online || editor._allfeatures) {
      return Promise.resolve();
    }

    let doRequest = true; // default --> perform request

    const { bbox } = options.filter || {};
    //check if bbox options filter (bbox of a current map) is passed and is a vector layer
    const is_vector = bbox && Layer.LayerTypes.VECTOR === editor.getLayer().getType();

    // first request --> need to perform request
    if (is_vector && null === editor._filter.bbox) {
      editor._filter.bbox = bbox;                                                      // store bbox
      doRequest         = true;
    }

    // subsequent requests --> check if bbox is contained into an already requested bbox
    else if (is_vector) {
      //Boolean - Check if features are already got inside bbox
      const is_cached = ol.extent.containsExtent(editor._filter.bbox, bbox);
      if (!is_cached) {
        editor._filter.bbox = ol.extent.extend(editor._filter.bbox, bbox);
      }
      doRequest = !is_cached;
    }

    if (!doRequest) {
      return;
    }

    const url = editor.urls.editing;
    try {
      let response;
      if (!options.filter) {
        response = await XHR.post({
          url,
          data:        JSON.stringify(params),
          contentType: 'application/json',
        });
      } else if (is_defined(options.filter.bbox)) { // bbox filter
        response = await XHR.post({
          url,
          data: JSON.stringify({
            ...params,
            in_bbox:     options.filter.bbox.join(','),
            filtertoken: editor.getLayer().getFilterToken(),
          }),
          contentType: 'application/json',
        })
      } else if (is_defined(options.filter.fid)) { // fid filter
        const { fid, relation } = options.filter.fid;
        response = await XHR.post({
          url: `${editor.urls.editing}?relationonetomany=${relation.id}|${fid}`,
          contentType: 'application/json',
          data:        JSON.stringify({ formatter: 1 }),
        });
      } else if (options.filter.field) {
        response = await XHR.post({
          url,
          data:        JSON.stringify({ 
            ...params,
            ...options.filter,
          }),
          contentType: 'application/json',
        })
      } else if (is_defined(options.filter.fids)) {
        response = await XHR.post({
          url,
          data:   JSON.stringify({
            ...params,
            ...options.filter,
          }),
          contentType: 'application/json',
        })
      } else if (is_defined(options.filter.nofeatures)) {
        response = await XHR.post({
          url,
          data: JSON.stringify({
            ...params,
            field: `${options.filter.nofeatures_field || 'id'}|eq|__G3W__NO_FEATURES__`
          }),
          contentType: 'application/json',
        })
      }

      // invalid response
      if (!response.result) {
        return;
      }

      const { data, count }       = response.vector;
      const { featurelocks = [] } = response;
      const lockIds               = featurelocks.map(lk => lk.featureid);
      const dataProjection = 'NoGeometry' === response.vector.geometrytype ? null : editor.getLayer().getCrs();
      let features   = [];

      try {

        features = (new ol.format.GeoJSON({
          geometryName:      'geometry',
          dataProjection,
          featureProjection: dataProjection,
        }))
        .readFeatures('string' === typeof data ? JSON.parse(data) : data)
        .filter(f => lockIds.includes(`${f.getId()}`))
        .map(feature => new Feature({ feature }));

        //if no features locks mean another user locks all feature requests
        if (0 === featurelocks.length || count > features.length) {
          //It means that another user locks these features
          editor.featuresLockedByOtherUser(features);
        }
        //get already loaded feature id locked by current user
        const fids = lockIds.map(({ featureid }) => featureid);
        featurelocks
          .filter(({ featureid }) => !fids.includes(featureid)) //exclude features already locked by current user
          .forEach(fl => this.state.lock_ids[layerId].push(fl)) //update lockIds based on a featurelocks array from response

        //store features locked by another user
        const lockFeatures = [];

        //Store features to add to layers source
        features = features.filter(f => {
          //get feature id
          const featureId = f.getId();
          //check if feature id is locked features
          //it means that is not locked by another user.
          if (featurelocks.find(({ featureid }) => featureId == featureid)) {
            //check if feature is not yet added for the current user
            if (!this.state.loaded_ids[layerId].includes(featureId)) {
              this.state.loaded_ids[layerId].push(featureId);
              return true;
            } else {
              return false; //feature locked by the current user
            }
          } else {
            lockFeatures.push(f);
            return false; //feature locked by another user
          }
        });

    } catch (e) {
      console.warn(e);
    }

    editor.readFeatures().push(...features); // add features to original features 
    
    // add features from server to editing features store (cloned from original)
    editor.getEditingSource().addFeatures((features || []).map(f => f.clone()));

    //set all features to true if no filter is set (e.g., Table layer)
    editor._allfeatures = !options.filter;

    return features;
    } catch(e) {
      console.warn(e);
      return Promise.reject({ message: _("info.server_error")});
    }

  }

  /**
   * ORIGINAL SOURCE: g3w-client/src/services/editing.js@v3.9.1
   * 
   * Apply changes to source features (undo/redo)
   * 
   * @param items
   * @param { boolean } reverse whether change to opposite
   * 
   * @since g3w-client-plugin-editing@v4.1.0
   */
  __setChanges(layerId, items = [], reverse = true) {
    const editor = this.editor(layerId);
    /** known actions */
    const Actions = {
      'add':    { fnc: 'addFeature',    opposite: 'delete' },
      'delete': { fnc: 'removeFeature', opposite: 'add'    },
      'update': { fnc: 'updateFeature', opposite: 'update' },
    };
    items.forEach(item => {
      if (reverse) {
        item.feature[Actions[item.feature.getState()].opposite]();
      }
      // get method from object
      //@since 3.9.1 need to clone it otherwise it replace
      editor.getEditingSource()[Actions[item.feature.getState()].fnc](item.feature.clone());
    });
  }

  /**
   * ORIGINAL SOURCE: g3w-client-plugin-editing/g3wsdk/editing/editor.j@v4.0.0
   * 
   * Run after server has applied changes to origin resource
   *
   * @param commit commit items
   *
   * @returns jQuery promise
   * 
   * @since g3w-client-plugin-editing@v4.1.0
   */
  async __commitToEditor(layerId, commit) {

    const editor = this.editor(layerId);
    
    let relations = [];

    // check if there are commit relations binded to new feature
    if (commit.add.length) {
      relations = Object
        .keys(commit.relations)
        .map(relationId => {
          const relation = editor.getLayer().getRelations().getRelationByFatherChildren(layerId, relationId);
          return {
            [relationId]: {
              ids: [                                                  // ids of "added" or "updated" relations
                ...commit.relations[relationId].add.map(r => r.id),   // added
                ...commit.relations[relationId].update.map(r => r.id) // updated
              ],
              fatherField: relation.getFatherField(), // father Fields <Array>
              childField:  relation.getChildField()    // child Fields <Array>
            }
          };
        });
    }

    // commit items
    let response;

    try {
      commit.lockids = this.state.lock_ids[layerId];
      response = await XHR.post({
        url:         editor.urls.commit,
        data:        JSON.stringify(commit),
        contentType: 'application/json',
      });
    } catch(e) {
      console.warn(e);
      response = Promise.reject();
    }

    // sync selection filter features
    if (response?.result) {
      try {
        const layer = getCatalogLayerById(layerId);
        //if layer has geometry
        if (layer.isGeoLayer()) {
          commit.update.forEach(({ id, geometry } = {}) => {
            if (layer.getOlSelectionFeature(id)) {
              const selected = layer.getOlSelectionFeature(id);
              if (selected) {
                selected.feature = geometry;
                GUI.getService('map').setSelectionFeatures('update', { feature: geometry });
              }
            }
          });
        }
        commit.delete.forEach(id => {
          if (layer.hasSelectionFid(id)) {
            layer.excludeSelectionFid(id);
          }
        })
      } catch(e) {
        console.warn(e);
      }
    }

    // skip when no response and response.result is false
    if (!(response && response.result)) {
      return response;
    }

    //Loop on new features saved on server
    // clientid - temporary id of new feature
    // id - id saved on server (autogenerate, next value) to subtituite to clientid feature id
    // properties - properties of feature returned by server
    response.response.new.forEach(({ clientid, id, properties } = {}) => {
      //get feature from current layer in editing
      const feature  = editor.getEditingSource().getFeatureById(clientid);
      // set new id
      feature.setId(id);
      //set properties
      feature.setProperties(properties);
      //Loop on eventual relation updated or created
      relations.forEach(r => {         // handle relations (if provided)
        Object
          .entries(r)
          .forEach(([ id, opts = {}]) => { // id - relation layer id, opts - Object contain relation properties
            //get the editing source of relation layer
            const source = ToolBox.get(id).getSession().getEditor().getEditingSource();
            // handle value to relation field saved on server
            (opts.ids || []).forEach(id => {
              const rFeature = source.getFeatureById(id);
              if (rFeature) {
                opts.fatherField.forEach((ff, i) => {// loop relation ids
                  rFeature.set(opts.childField[i], feature.get(ff))  // set father feature `value` and `name`
                })
              }
            })
          });
      });

    });

    //@since 3.9.0 take in account update properties returned by server (Useful in case of media input changes)
    (response.response.update || []).forEach(({ id, properties } = {}) => {
      //get feature from current layer in editing
      const feature  = editor.getEditingSource().getFeatureById(id);
      //set properties
      feature.setProperties(properties);
      //Loop on eventual relation updated or created
      relations.forEach(r => {         // handle relations (if provided)
        Object
          .entries(r)
          .forEach(([ id, opts = {}]) => { // id - relation layer id, opts - Object contain relation properties
            //get the editing source of relation layer
            const source = ToolBox.get(id).getSession().getEditor().getEditingSource();
            // handle value to relation field saved on server
            (opts.ids || []).forEach(id => {
              const rFeature = source.getFeatureById(id);
              if (rFeature) {
                opts.fatherField.forEach((ff, i) => {// loop relation ids
                  rFeature.set(opts.childField[i], feature.get(ff))  // set father feature `value` and `name`
                })
              }
            })
          });
      });

    });

    const features = editor.readEditingFeatures();

    features.forEach(f => f.clearState());          // reset state of the editing features (update, new etc..)

    editor.getLayer().setFeatures([...features]);         // substitute layer features with actual editing features ("cloned" to prevent layer actions duplicates, eg. addFeatures)

    // add lock ids
    this.state.lock_ids[layerId] = [...new Set(this.state.lock_ids[layerId].concat(...response.response.new_lockids))]
    this.state.lock_ids[layerId].forEach(({ featureid }) => this.state.loaded_ids[layerId].push(featureid));

    return response;
  }

  /**
   * ORIGINAL SOURCE: g3w-client-plugin-editing/g3wsdk/editing/editor.j@v4.0.0
   * 
   * start editing
   * 
   * @since g3w-client-plugin-editing@v4.1.0
   */
  async __startEditor(layerId, options = {}) {
    const editor   = this.editor(layerId)
    const features = await editor.getFeatures(options);     // load layer features based on filter type
    editor._started  = true;                                 // if all ok set to started
    return features;                                      // features are already inside featuresstore
  }

  /**
   * ORIGINAL SOURCE: g3w-client-plugin-editing/g3wsdk/editing/editor.j@v4.0.0
   * 
   * stop editor (unlock)
   * 
   * @since g3w-client-plugin-editing@v4.1.0
   */
  async __stopEditor(layerId) {
    const editor     = this.editor(layerId)
    const { result } = await XHR.post({ url: editor.urls.unlock });
    editor.clear();
    return result;
  }

  /**
   * ORIGINAL SOURCE: g3w-client-plugin-editing/g3wsdk/editing/editor.j@v4.0.0
   * 
   * @since g3w-client-plugin-editing@v4.1.0 
   */
  __clearEditor(layerId) {
    const editor = this.editor(layerId)

    editor._started     = false;
    editor._filter.bbox = null;
    editor._allfeatures = false;

    editor._features               = []; // clear features collection
    this.state.lock_ids[layerId]   = [];
    this.state.loaded_ids[layerId] = [];
    editor.getEditingSource().clear();

    // vector layer
    if (Layer.LayerTypes.VECTOR === editor.getLayer().getType()) {
      editor.getLayer().resetEditingSource(editor.getEditingSource().getFeaturesCollection());
    }
  }

  /**
   * ORIGINAL SOURCE: g3w-client-plugin/toolboxes/toolboxesfactory.js@v3.7.1
   *
   * Register query result action: edit selected feature from query results
   */
  async #onQueryResultsEditFeature({ layer, feature } = {}) {

    const fid = feature.attributes[G3W_FID] || feature.id;

    //In case of not unique id, skip
    if (undefined === fid) { return }

    this.getToolBoxes().forEach(tb => tb.setShow(layer.id === tb.getId()));
    this.showEditingPanel();

    this.state.showselectlayers = false;

    this.subscribe('closeeditingpanel', () => { this.state.showselectlayers = true; return { once: true } });

    const toolBox   = this.getToolBoxById(layer.id);
    toolBox.setSelected(true);

    const session   = toolBox.getSession();
    const { scale } = toolBox.getEditingConstraints(); // get scale constraint from setting layer

    let w;

    // start toolbox (filtered by feature id)
    try {
      // check map scale after zoom to feature
      // if currentScale is more that scale constraint set by layer editing
      // needs to go to scale setting by layer editing constraint
      if (scale) {
        const units        = GUI.getService('map').getMapUnits();
        const resolution   = GUI.getService('map').getMapUnits();
        const map          = GUI.getService('map').getMap();
        const currentScale = parseInt(getScaleFromResolution(resolution, units));
        if (currentScale > scale) {
          map.getView().setResolution(getResolutionFromScale(scale, units));
        }

      }

      await toolBox.start({ filter: { fids: fid } });

      const _layer    = toolBox.getLayer();
      const source    = _layer.getEditingLayer().getSource();
      const is_vector = Layer.LayerTypes.VECTOR === _layer.getType();

      // get feature from an Editing layer source (with styles)
      const features = is_vector ? source.getFeatures() : source.readFeatures();
      const feature  = features.find(f => fid == f.getId());

      // skip when not feature is get from server
      if (!feature) {
        return;
      }

      const geom = feature.getGeometry();

      // feature has geometry → zoom to geometry
      if (geom) {
        GUI.getService('map').zoomToGeometry(geom);
      }

      toolBox.setSelected(true);

      this.state.toolboxselected = toolBox;

      const addPartTool = is_vector && !geom && toolBox.getTools().find(t => 'addPart' === t.getId());

      // check if layer is single geometry. Need to show and change behaviour
      if (addPartTool && !Geometry.isMultiGeometry(_layer.getGeometryType())) {
        addPartTool.visible = true;
      }

      // add geometry when vector layer feature has no geometry
      if (addPartTool) {
        //get workflow
        const op = addPartTool.getOperator();
        const w = new Workflow({
          type: 'drawgeometry',
          helpMessage: 'editing.workflow.steps.draw_geometry',
          runOnce: true, // need to run once time
          steps: [
            new AddFeatureStep({
              add: false,
              steps: {
                addfeature: {
                  description: 'editing.workflow.steps.draw_geometry',
                }
              },
              onRun: ({inputs, context}) => {
                w.emit('settoolsoftool', [
                  {
                    type: 'snap',
                    options: {
                      layerId: inputs.layer.getId(),
                      source:  inputs.layer.getEditingLayer().getSource(),
                      active:  true
                    }
                  },
                  {
                    type: 'measure',
                    options: {
                      active: false
                    }
                  }
                ]);
                w.emit('active', ['snap']);
              },
              onStop: () => w.emit('deactive', ['snap', 'measure'])
            }),
            // add part to multi geometries
            new Step({ run: addPartToMultigeometries })
          ],
          registerEscKeyEvent: true
        })

        addPartTool.setOperator(w);

        this.subscribe('closeeditingpanel', () => {
          addPartTool.setOperator(op);
          addPartTool.visible = Geometry.isMultiGeometry(_layer.getGeometryType());
        })
      }

      /** ORIGINAL SOURCE: g3w-client-plugin-editing/workflows/editnopickmapfeatureattributesworkflow.js@v3.7.1 */
      w = (new Workflow({
        type:        'editnopickmapfeatureattributes',
        runOnce:     true,
        helpMessage: 'editing.tools.update_feature',
        steps:       [ new OpenFormStep() ]
      }));

      await w.start({
        inputs:  { layer: _layer, features: [feature] },
        context: { session }
      });

      await session.save();

      this.saveChange();

    } catch (e) {
      console.warn(e);
      session.rollback();
    } finally {
      w.stop();
    }
  }

  async #rollback(relations = {}) {
    return Promise.allSettled(
      Object
      .entries(relations)
      .flatMap(([ layerId, { add, delete: del, update, relations = {}}]) => {
        const source       = getEditingLayerById(layerId).getEditor().getEditingSource();
        const has_features = source.readFeatures().length > 0; // check if the relation layer has some features
        // get original values
        return [
          // add
          ...(has_features && add || []).map(async ({ id }) => {
            source.removeFeature(source.getFeatureById(id));
          }),
          // update
          ...(has_features && update || []).map(async ({ id }) => {
            try {
              const response = await XHR.get({
                url:    getCatalogLayerById(layerId).getUrl('data'),
                params: { fids: id },
              });
              const f        = (response.result && response.vector.data.features || []).at(0);
              const feature  = source.getFeatureById(id);
              feature.setProperties(f.properties);
              feature.setGeometry(f.geometry);
            } catch(e) {
              console.warn(e);
            }
          }),
          // delete
          ...del.map(async id => {
            try {
              const response = await XHR.get({
                url:    getCatalogLayerById(layerId).getUrl('data'),
                params: { fids: id },
              });
              const f = (response.result && response.vector.data.features || []).at(0);
              const feature = new ol.Feature({ geometry: f.geometry })
              feature.setProperties(f.properties);
              feature.setId(id);
              source.addFeature(new Feature({ feature })); // add it again to source because relation layer is locked
            } catch(e) {
              console.warn(e);
            }

          }),
          this.#rollback(relations),
        ];
      })
    );
  }

});

