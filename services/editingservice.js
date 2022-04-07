import API from '../api'
import SIGNALER_IIM_CONFIG from '../global_plugin_data';
import ExportFormats from '../vue/exportformats.vue';
import ChildSignalerComponent from '../vue/childsignalercomponent.vue';
import SignalerNotesComponent from '../vue/signalernotes.vue';
const {G3W_FID} = g3wsdk.constant;
const {DataRouterService} = g3wsdk.core.data;
const {ApplicationService, ApplicationState} = g3wsdk.core;
const {base, inherit, createSingleFieldParameter, downloadFile, resolve, XHR} = g3wsdk.core.utils;
const {getPointFeaturesfromGeometryVertex} = g3wsdk.core.geoutils;
const WorkflowsStack = g3wsdk.core.workflow.WorkflowsStack;
const PluginService = g3wsdk.core.plugin.PluginService;
const SessionsRegistry = g3wsdk.core.editing.SessionsRegistry;
const CatalogLayersStoresRegistry = g3wsdk.core.catalog.CatalogLayersStoresRegistry;
const MapLayersStoreRegistry = g3wsdk.core.map.MapLayersStoreRegistry;
const LayersStore = g3wsdk.core.layer.LayersStore;
const Layer = g3wsdk.core.layer.Layer;
const Feature = g3wsdk.core.layer.features.Feature;
const {ComponentsFactory, GUI} = g3wsdk.gui;
const serverErrorParser= g3wsdk.core.errors.parsers.Server;
const t = g3wsdk.core.i18n.tPlugin;
const ToolBoxesFactory = require('../toolboxes/toolboxesfactory');
const CommitFeaturesWorkflow = require('../workflows/commitfeaturesworkflow');
const MAPCONTROL_TOGGLED_EVENT_NAME = 'mapcontrol:toggled';
const OFFLINE_ITEMS = {
  CHANGES: 'EDITING_CHANGES'
};

function EditingService() {
  base(this);
  // contains alla sessions
  this._sessions = {};
  // constraints
  this.constraints = {};
  this._vectorUrl;
  this._projectType;
  // contain array of object setter(as key), key to unby (as value)
  this._unByKeys = [];
  // events
  this._events = {
    layer: {
      start_editing: {
        before: {},
        after: {}
      }
    }
  };

  this.saveConfig = {
    mode: "default", // default, autosave
    modal: false,
    messages: null, // object to set custom message
    cb: {
      done: null, // function after commit change done
      error: null // function after commit chenges error
    }
  };

  //application editing contraints
  //Usefult if some plgin or case we need to setup a editing contrains such as layer, filter to get features
  this.applicationEditingConstraints = {
    toolboxes: {},
    showToolboxesExcluded: true
  };

  // state of editing
  this.state = {
    open: false, // check if panel is open or not
    toolboxes: [],
    toolboxselected: null,
    toolboxidactivetool: null,
    message: null,
    relations: [],
    edit_single_layer: false,
  };

  this._layers_in_error = false;
  //mapservice
  this._mapService = GUI.getComponent('map').getService();
  //set mapcontrol toggle event
  this.mapControlToggleEventHandler = evt => {
    if (evt.target.isToggled() && evt.target.isClickMap()){
      let toolboxselected = this.state.toolboxselected;
      toolboxselected && toolboxselected.getActiveTool() && toolboxselected.stopActiveTool();
    }
  };

  this._mapService.on(MAPCONTROL_TOGGLED_EVENT_NAME, this.mapControlToggleEventHandler);
  //plugin components
  this._formComponents = {};
  this._subscribers = {};
  //eventually action layer when result is showed
  this.addActionKeys = [];
  this._editSingleReportFormTask = null;
  this.init = function(config={}) {
    this._mapService.addScaleLineUnits(['nautical']);
    this._vectorUrl = config.vectorurl;
    const {urls:{editing:editing_url, vector:vector_data_url}, signaler_layer_id,
      vertex_layer_id, geo_layer_id, signaler_field, ab_signal_fields, fields={},
      parent_signal_field="parent_signal_id",
      states, roles_editing_acl, state_field, every_fields_editing_states,
      relation_signal_types={},
      signal_type
    } = config;
    SIGNALER_IIM_CONFIG.signal_type = signal_type;
    SIGNALER_IIM_CONFIG.signaler_layer_id = signaler_layer_id;
    SIGNALER_IIM_CONFIG.signaler_field = signaler_field || 'signaled_fid';
    SIGNALER_IIM_CONFIG.vertex_layer_id = vertex_layer_id;
    SIGNALER_IIM_CONFIG.geo_layer_id = geo_layer_id;
    SIGNALER_IIM_CONFIG.fields = fields;
    SIGNALER_IIM_CONFIG.ab_signal_fields = ab_signal_fields;
    SIGNALER_IIM_CONFIG.parent_signal_field = parent_signal_field;
    SIGNALER_IIM_CONFIG.states = states;
    SIGNALER_IIM_CONFIG.roles_editing_acl = roles_editing_acl;
    SIGNALER_IIM_CONFIG.state_field = state_field;
    SIGNALER_IIM_CONFIG.every_fields_editing_states = every_fields_editing_states;
    SIGNALER_IIM_CONFIG.urls = config.urls;
    SIGNALER_IIM_CONFIG.relation_signal_types = relation_signal_types;
    CatalogLayersStoresRegistry.getLayers().forEach(layer => {
      if (layer.config.urls.data) layer.config.urls.data = layer.config.urls.data.replace('/vector/api/', vector_data_url);
    });
    // Object contain alla information about current report in editing
    this.currentReport = {
      id: null, // id of report
      ab_signal_fields: ab_signal_fields.reduce((accumulator, field) => {
        accumulator[field] = {
          label: null,
          value: null
        };
        return accumulator
      },{}),
      [signaler_field]: null, //report id for child report
      isNew: false, // is new report
      feature: null, // current feature
      vertex: null //current vertex
    };
    this._projectType = config.project_type;
    this._layersstore = new LayersStore({
      id: 'editing',
      queryable: false
    });
    //add edting layer store to mapstoreregistry
    MapLayersStoreRegistry.addLayersStore(this._layersstore);
    this.config = config;
    this._editableLayers = {
      [Symbol.for('layersarray')]: []
    };
    this._toolboxes = [];
    this.state.toolboxes = [];
    let layers = this._getEditableLayersFromCatalog();
    const EditableLayersPromises = [];
    for (const layer of layers) {
      if (layer.getId() === SIGNALER_IIM_CONFIG.signaler_layer_id){
        layer.getLayerEditingFormStructure()
      }
      // getLayerForEditing return a promise with layer usefult for editing
      EditableLayersPromises.push(layer.getLayerForEditing({
        vectorurl: this._vectorUrl,
        project_type: this._projectType
      }))
    }
    Promise.allSettled(EditableLayersPromises).then(editableLayers  => {
      editableLayers.forEach(promise => {
        const {status, value} = promise;
        if (status === "fulfilled") {
          const editableLayer = value;
          if (editableLayer.getId() === signaler_layer_id){
            editableLayer.getEditingFields().forEach(field => {
              if (this.currentReport.ab_signal_fields[field.name]) this.currentReport.ab_signal_fields[field.name].label = field.label;
            })
          }
          editableLayer.config.urls.commit = editableLayer.config.urls.commit.replace('/vector/api/', editing_url);
          editableLayer.config.urls.editing = editableLayer.config.urls.editing.replace('/vector/api/', editing_url);
          editableLayer.config.urls.unlock = editableLayer.config.urls.unlock.replace('/vector/api/', editing_url);
          editableLayer.config.urls.data = editableLayer.config.urls.data.replace('/vector/api/', vector_data_url);
          const layerId = editableLayer.getId();
          this._editableLayers[layerId] = editableLayer;
          this._editableLayers[Symbol.for('layersarray')].push(editableLayer);
          this._attachLayerWidgetsEvent(this._editableLayers[layerId]);
          this._sessions[layerId] = null;
        } else this._layers_in_error = true;
      });
      Promise.resolve().then(()=> this._ready());
    })
  };
  this._ready = function() {
    // set toolbox colors
    this.setLayersColor();
    // after add layers to layerstore
    this._layersstore.addLayers(this.getLayers());
    // create toolboxes
    this._buildToolBoxes();
    // create a dependencies tree
    this._createToolBoxDependencies();
    //setApi
    this.setApi({
      api: new API({
        service:this
      })
    });
    //this.registerCustomComponentsResult();
    this.registerResultEditingAction();
    // check if need start a child report
    this.getUrlParameters();
    this.emit('ready');
  }
}

inherit(EditingService, PluginService);

const proto = EditingService.prototype;

//api methods

proto.getAppState = function(){
  return ApplicationState;
};

proto.getFormComponentsById = function(layerId) {
  return this._formComponents[layerId] || [];
};

proto.getFormComponents = function() {
  return this._formComponents;
};

proto.addFormComponents = function({layerId, components= []} = {}) {
  if (!this._formComponents[layerId]) this._formComponents[layerId] = [];
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

proto.subscribe = function(event, fnc) {
  if (!this._subscribers[event]) this._subscribers[event] = [];
  return this._subscribers[event].push(fnc);
};

proto.unsubscribe = function(event, fnc) {
  this._subscribers[event] = this._subscribers[event].filter(cb => cb !== fnc);
};

// END API

/**
 * Register action on after show result
 */

proto.isEditingSingleLayer = function(){
  return this.state.edit_single_layer;
};

proto.setEditingSingleLayer = function(bool=false){
  this.state.edit_single_layer = bool;
};

proto.showEditingResultIcon = function({feature}={}){
  let canEdit = ApplicationState.user.is_superuser;
  if (canEdit) return true;
  const {states, roles_editing_acl, state_field} = SIGNALER_IIM_CONFIG;
  /*
  * SIIM-CCP-REPORTERS:
    SIIM-CCP-SUPERVISORS:
     SIIM-IIM-EXAMINERS
  * */
  Object.keys(roles_editing_acl).find(role => {
    if (ApplicationState.user.groups.indexOf(role) !== -1) {
      const role_editing_rules_state_values = roles_editing_acl[role];
      const state_field_feature_value = Object.entries(states).find(([value, label]) => feature.attributes[state_field] === label)
      if (state_field_feature_value){
        const value = state_field_feature_value[0];
        canEdit = role_editing_rules_state_values.find(rule_state_value => rule_state_value === value) ? true: false;
        return canEdit
      }
    }
  });
  return canEdit;
};

proto.registerCustomComponentsResult = function(){
  const queryResultsService = GUI.getService('queryresults');
  queryResultsService.registerCustomComponent({
    layerId: SIGNALER_IIM_CONFIG.signaler_layer_id,
    type: 'feature',
    component: ChildSignalerComponent
  });
};

proto.registerResultEditingAction = function(){
  const queryResultsService = GUI.getService('queryresults');
  this.addActionKeys.push(queryResultsService.onafter('addActionsForLayers', (actions, layers) => {
    Object.keys(actions).forEach(layerId => {
      if ([SIGNALER_IIM_CONFIG.geo_layer_id,SIGNALER_IIM_CONFIG.vertex_layer_id].indexOf(layerId) !== -1) actions[layerId] = actions[layerId].filter(action => action.id !== 'editing');
      if ([SIGNALER_IIM_CONFIG.geo_layer_id, SIGNALER_IIM_CONFIG.signaler_layer_id].indexOf(layerId) !== -1)
        actions[layerId] = actions[layerId].filter(action => ['gotogeometry', 'show-query-relations', 'printatlas'].indexOf(action.id) !== -1 || action.id.indexOf('download') !== -1);
      if (!this.state.open && layerId === SIGNALER_IIM_CONFIG.signaler_layer_id && this.getLayerById(layerId)) {
        actions[layerId].push({
          id: 'editing',
          class: GUI.getFontClass('pencil'),
          hint: 'plugins.signaler_iim.toolbox.title',
          condition: ({feature} = {}) => {
            return this.showEditingResultIcon({
              feature
            })
          },
          cbk: (layer, feature) => {
            SIGNALER_IIM_CONFIG.result = true;
            this.currentReport.id = feature.attributes[G3W_FID];
            this.getPlugin().showEditingPanel({
              toolboxes: [this.getToolBoxById(layerId)]
            });
            this.editingReport({
              filter: {
                fids: feature.attributes[G3W_FID]
              },
              openForm: true
            });
          }
        });
      }
      if (layerId === SIGNALER_IIM_CONFIG.geo_layer_id && this.getLayerById(layerId))
        actions[layerId].push({
          id: 'show_signaler',
          class: GUI.getFontClass('signaler'),
          hint: 'plugins.signaler_iim.signaler.show_father_signaler',
          cbk: (layer, feature, action, index) => {
            const signaler_id = feature.attributes[SIGNALER_IIM_CONFIG.signaler_field];
            this.showSignalerOnResultContent({
              fid: signaler_id,
              getGeoFeatures: false,
              push: true
            });
          }
        });
      if (layerId === SIGNALER_IIM_CONFIG.signaler_layer_id && this.getLayerById(layerId)) {
        actions[layerId].push({
          id: 'delete_signaler',
          class: GUI.getFontClass('trash'),
          hint: 'Cancella segnalazione',
          style: {
            color: 'red'
          },
          condition: ({feature} = {}) => {
            return this.showEditingResultIcon({
              feature
            })
          },
          cbk: async (layer, feature, action, index) => {
            const signaler_id = feature.attributes[G3W_FID];
            return new Promise((resolve, reject) => {
              GUI.dialog.confirm(`
                        <h4>Vuoi cancellare la segnalazione?</h4>
                        <div style="font-size:1.2em;">Se cancelli la segnalazione verranno cancellate tutte le eventuali features associate</div>`,
                result => {
                  if (result) {
                    const reportToolBox = this.getToolBoxById(SIGNALER_IIM_CONFIG.signaler_layer_id);
                    const session = reportToolBox.getSession();
                    session.start({
                      editing: true,
                      filter: {
                        fids: signaler_id
                      }
                    }).then(promise =>
                      promise
                        .then(features => {
                          const feature = features[0];
                          reportToolBox.getEditingLayerSource().removeFeature(feature);
                          session.pushDelete(SIGNALER_IIM_CONFIG.signaler_layer_id, feature);
                          session.save();
                          session.commit();
                          SIGNALER_IIM_CONFIG.geo_layer_id && this._mapService.refreshMap();
                          GUI.closeContent();
                          resolve()
                        })
                    )
                  } else reject()
                });
            })
          }
        });
        SIGNALER_IIM_CONFIG.geo_layer_id && actions[layerId].push({
          id: 'zoom',
          class: GUI.getFontClass('marker'),
          hint: 'Zoom to geo features',
          cbk: async (layer, feature, action, index) => {
            GUI.setLoadingContent(true);
            const signaler_id = feature.attributes[G3W_FID];
            try {
              const {data} = await DataRouterService.getData('search:features', {
                  inputs: {
                    layer: CatalogLayersStoresRegistry.getLayerById(SIGNALER_IIM_CONFIG.geo_layer_id),
                    filter: `${SIGNALER_IIM_CONFIG.signaler_field}|eq|${signaler_id}`,
                    formatter: 1, // set formatter to 1
                    search_endpoint: 'api'
                  },
                  outputs: null
                });
              const features = data && data[0] && data[0].features || [];
              features.length && this._mapService.zoomToFeatures(features, {
                highlight: true
              })
            } catch (err) {
              GUI.showUserMessage({
                type: 'alert',
                message: err,
                textMessage: true
              })
            }
            GUI.setLoadingContent(false);
          }
        });
        const layer = layers.find(layer => layer.id === SIGNALER_IIM_CONFIG.signaler_layer_id);
        const state = queryResultsService.createActionState({
          layer
        });
        const export_formats = [];
        this.config.urls.export.forEach(urlLabel => {
          export_formats.push({
            id: `export_${urlLabel.label}_signal`,
            config: urlLabel,
            cbk: async (layer, feature, action, index) => {
              const url = `${action.config.url}${feature.attributes.id}/`;
              const ext_mime_type = url.indexOf('/png/') !== -1 ? {
                ext:'.png',
                mime_type: 'image/png'
              } :
                {
                  ext: '.zip',
                  mime_type:'application/zip'
              };
              await queryResultsService.downloadApplicationWrapper(downloadFile, {
                url,
                filename: `${action.config.label}_${feature.attributes.id}${ext_mime_type.ext}`,
                mime_type: ext_mime_type.mime_type
              });
              const exportsaction = queryResultsService.getActionLayerById({
                layer,
                id: 'exports'
              });
              exportsaction.cbk(layer, feature, exportsaction, index);
            }
          })
        });
        const export_format_id = ExportFormats.name;
        queryResultsService.addCurrentActionToolsLayer({
          id: export_format_id,
          layer,
          config: {
            export_formats
          }
        });
        actions[layerId].push({
          id: `exports`,
          download: true,
          class: GUI.getFontClass('export_signaler'),
          state,
          toggleable: true,
          hint: `Export`,
          change({features}) {
            features.forEach((feature, index) =>{
              if (this.state.toggled[index] === undefined) VM.$set(this.state.toggled, index, false);
              else this.state.toggled[index] = false;
            });
          },
          cbk: (layer, feature, action, index) => {
            action.state.toggled[index] = !action.state.toggled[index];
            queryResultsService.setCurrentActionLayerFeatureTool({
              layer,
              action,
              index,
              component: action.state.toggled[index] ? ExportFormats : null
            });
          }
        });
        actions[layerId].push({
          id: 'signale_iim_notes',
          class: GUI.getFontClass('signaler_iim_notes'),
          hint: 'plugins.signaler_iim.signaler.notes',
          cbk: async (layer, feature, action, index) => {
            const signaler_id = feature.attributes[G3W_FID];
            this.showSignalerNotes({
              signaler_id
            });
          }
        });
      }
    })
  }))
};

proto.unregisterResultEditingAction = function(){
  const queryResultsService = GUI.getComponent('queryresults').getService();
  this.addActionKeys.forEach(addActionKey => queryResultsService.un('addActionsForLayers', addActionKey));
};

proto.showSignalerNotes = async function({signaler_id=this.getCurrentReportData().id, back=false}={}){
  GUI.setLoadingContent(true);
  let notes = [];
  try {
    const response = await XHR.get({
      url: `${SIGNALER_IIM_CONFIG.urls.note}${SIGNALER_IIM_CONFIG.signal_type}/${signaler_id}/`
    });
    notes = response ? response.results : [];
  } catch(err){}
  GUI.pushContent({
    content: ComponentsFactory.build({
      vueComponentObject: SignalerNotesComponent,
      propsData: {
        notes,
        back
      }
    }),
    closable: false
  });
  GUI.setLoadingContent(false);
};

/**
 *
 * get init url parameter
 * @returns {Promise<void>}
 */
proto.getUrlParameters = async function(){
  const {signaler_field, signaler_parent_field} = SIGNALER_IIM_CONFIG;
  const searchParams = new URLSearchParams(location.search);
  const child_signaler_value = searchParams.get(signaler_field);
  const show_signaler_on_result = searchParams.get('sid') || false;
  const sid_edit = searchParams.get('sid_edit') || null;
  if (show_signaler_on_result) {
    if (show_signaler_on_result === 'new') {
      SIGNALER_IIM_CONFIG[signaler_parent_field] = searchParams.get(signaler_parent_field);
      this.config.visible = false; // set config to false to avoid to show editing tool on sidebar
      SIGNALER_IIM_CONFIG.create_new_signaler = true;
      this.getPlugin().showEditingPanel({
        toolboxes: [this.getToolBoxById(SIGNALER_IIM_CONFIG.signaler_layer_id)]
      });
      this.editingReport({
        filter: {
          nofeatures: true
        },
        toolId: 'addfeature'
      })
    } else this.showSignalerOnResultContent({
        fid: show_signaler_on_result,
        getGeoFeatures: true
      });
  }
  else if (sid_edit) {
    SIGNALER_IIM_CONFIG.edit_signaler = true;
    SIGNALER_IIM_CONFIG.result = true;
    this.getPlugin().showEditingPanel({
      toolboxes: [this.getToolBoxById(SIGNALER_IIM_CONFIG.signaler_layer_id)]
    });
    this.editingReport({
      filter: {
        fids: sid_edit
      },
      openForm: true
    })
  } else if (child_signaler_value) this.checkChildReportIdParam(child_signaler_value);
};

proto.exitEditingAfterCreateNewSignalerFeature = function(){
  const {id:fid, isNew} = this.currentReport;
  this.getPlugin().hideEditingPanel();
  !isNew && this.showSignalerOnResultContent({
    fid
  });
};

proto.showSignalerOnResultContent = async function({fid, getGeoFeatures=false}={}){
  const layer = CatalogLayersStoresRegistry.getLayerById(SIGNALER_IIM_CONFIG.signaler_layer_id);
  try {
    const {data=[]} = await DataRouterService.getData('search:features', {
      inputs:{
        layer,
        filter:`id|eq|${fid}`,
        formatter: 1, // set formatter to 1
        feature_count: 1,
        search_endpoint: 'api'
      },
      outputs:  {
        title: layer.getName(),
        show: {
          loading: false,
          condition({data=[]}={}){
            return data.length && data[0].features.length;
          }
        }
      }
    });
    const features = data && data[0] && data[0].features || [];
    if (features.length && getGeoFeatures) {
      try {
        const {data} = await DataRouterService.getData('search:features', {
          inputs:{
            layer: CatalogLayersStoresRegistry.getLayerById(SIGNALER_IIM_CONFIG.geo_layer_id),
            filter:`${SIGNALER_IIM_CONFIG.signaler_field}|eq|${fid}`,
            formatter: 1, // set formatter to 1
            search_endpoint: 'api'
          },
          outputs: false // need to specify no output
        });
        const features = data && data[0] && data[0].features || [];
        features.length && this._mapService.zoomToFeatures(features, {
          highlight: true
        });
      } catch(err){}
    }
  } catch(err){}
};

/**
 *
 * Check if called from parent report
 */
proto.checkChildReportIdParam = async function(value) {
  this.getPlugin().showEditingPanel();
  const {signaler_field} = SIGNALER_IIM_CONFIG;
  const {toolbox, features} = await this.editingReport(value ? {
    filter: {
      field: `${signaler_field}|eq|${value}`,
    }
  }: undefined);
  if (value){
    let tool = toolbox.getToolById('edittable');
    if (features.length === 0) {
      this.currentReport[signaler_field] = 1*value;
      tool = toolbox.getToolById('addfeature');
    }
    toolbox.setActiveTool(tool);
  }
};

/**
 *
 */
proto.disableMapControlsConflict = function(bool=true) {
  this._mapService.disableClickMapControls(bool);
};

/**
 * Used on commit if no toolbox is passed as parameter
 * @param toolbox
 */
proto.setSelectedToolbox = function(toolbox){
  this.state.toolboxselected = toolbox;
};

/**
 * 
 */
proto.getToolboxSelected = function(){
  return this.state.toolboxselected;
};

/**
 * 
 */

// create a new feature
proto.addNewFeature = function(layerId, options={}){
  const {geometry, properties} = options;
  const feature = new Feature();
  geometry && feature.setGeometry(new ol.geom[geometry.type](geometry.coordinates));
  feature.setProperties(properties);
  feature.setTemporaryId();
  const toolbox = this.getToolBoxById(layerId);
  const editingLayer = toolbox.getLayer().getEditingLayer();
  const session = toolbox.getSession();
  editingLayer.getSource().addFeature(feature);
  session.pushAdd(layerId, feature);
  return feature;
};

proto.getLayersInError = function() {
  return this._layers_in_error;
};

proto.getMapService = function() {
  return this._mapService;
};

proto._initOffLineItems = function() {
  for (const id in OFFLINE_ITEMS) {
    !this.getOfflineItem(OFFLINE_ITEMS[id]) && ApplicationService.setOfflineItem(OFFLINE_ITEMS[id]);
  }
};

proto._handleOfflineChangesBeforeSave = function(data) {
  const changes = ApplicationService.getOfflineItem(OFFLINE_ITEMS.CHANGES);
  const applyChanges = ({layerId, current, previous})=> {
    current[layerId].add = [...previous[layerId].add, ...current[layerId].add];
    current[layerId].delete = [...previous[layerId].delete, ...current[layerId].delete];
    previous[layerId].update.forEach(updateItem => {
      const {id} = updateItem;
      const find = current[layerId].update.find(updateItem => updateItem.id === id);
      !find && current[layerId].update.unshift(updateItem);
    });
    const lockids = previous[layerId].lockids|| [];
    lockids.forEach(lockidItem => {
      const {featureid} = lockidItem;
      const find = current[layerId].lockids.find(lockidItem => lockidItem.featureid === featureid);
      !find && current[layerId].update.unshift(lockidItem);
    })
  };
  for (const layerId in changes) {
    // check if previous changes are made in the same layer or in relationlayer of current
    const current = data[layerId] ? data :
      data[Object.keys(data)[0]].relations[layerId] ?
        data[Object.keys(data)[0]].relations : null;
    if (current)
      applyChanges({
        layerId,
        current,
        previous: changes
      });
    else {
      // check if in the last changes
      const currentLayerId = Object.keys(data)[0];
      const relationsIds = Object.keys(changes[layerId].relations);
      if (relationsIds.length) {
        if (relationsIds.indexOf(currentLayerId) !== -1) {
          applyChanges({
            layerId: currentLayerId,
            current: data,
            previous: changes[layerId].relations
          });
          changes[layerId].relations[currentLayerId] = data[currentLayerId];
          data = changes;
        }
      } else data[layerId] = changes[layerId];
    }
  }
  return data;
};

proto.saveOfflineItem = function({id, data}={}) {
  if (id === OFFLINE_ITEMS.CHANGES) data = this._handleOfflineChangesBeforeSave(data);
  return ApplicationService.setOfflineItem(id, data);
};

proto.setOfflineItem = function(id, data){
  ApplicationService.setOfflineItem(id, data);
};

proto.getOfflineItem = function(id){
  return ApplicationService.getOfflineItem(id);
};

/**
 * Check if alread have off lines changes
 * @param modal
 * @returns {Promise<unknown>}
 */
proto.checkOfflineChanges = function({modal=true, unlock=false}={}) {
  return new Promise((resolve, reject) => {
    const changes = ApplicationService.getOfflineItem(OFFLINE_ITEMS.CHANGES);
    // if find changes offline previously
    if (changes) {
      const promises = [];
      const layerIds = [];
      for (const layerId in changes) {
        layerIds.push(layerId);
        const toolbox = this.getToolBoxById(layerId);
        const commitItems = changes[layerId];
        promises.push(this.commit({
          toolbox,
          commitItems,
          modal
        }))
      }
      $.when.apply(this, promises)
        .then(() =>resolve())
        .fail(error=>reject(error))
        .always(() =>{
          unlock && layerIds.forEach(layerId => {
            this.getLayerById(layerId).unlock()
          });
          // always reset items to null
          this.setOfflineItem(OFFLINE_ITEMS.CHANGES);
        })
    }
  })
};

/**
 * called by Editng Panel on creation time
 */
proto.registerOnLineOffLineEvent = function() {
  // in case of starting panel editing check if there arae some chenging pending
  // if true i have to commit chanhes on server and ulock all layers features temporary locked
  if (ApplicationState.online) this.checkOfflineChanges({
    unlock: true
  });
  const offlineKey =  ApplicationService.onafter('offline', ()=>{});
  const onlineKey = ApplicationService.onafter('online', () =>{
    this.checkOfflineChanges({
      modal:false
    }).then(()=>{
    }).catch(error =>GUI.notify.error(error))
  });

  this._unByKeys.push({
    owner : ApplicationService,
    setter: 'offline',
    key: offlineKey
  });

  this._unByKeys.push({
    owner : ApplicationService,
    setter: 'online',
    key: onlineKey
  });

};

proto.unregisterOnLineOffLineEvent = function() {
  this.unregisterSettersEvents(['online', 'offline'])
};

proto.unregisterSettersEvents = function(setters=[]) {
  this._unByKeys.forEach(registered => {
    const {owner, setter, key} = registered;
    owner.un(setter, key);
  })
};

proto.fireEvent = function(event, options={}) {
  return new Promise(resolve => {
    this._subscribers[event] && this._subscribers[event].forEach(fnc => fnc(options));
    resolve();
  });
};


proto.activeQueryInfo = function() {
  this._mapService.activeMapControl('query');
};

proto.setLayersColor = function() {

  const LAYERS_COLOR = [
    "#C43C39",
    '#d95f02',
    "#91522D",
    "#7F9801",
    "#0B2637",
    "#8D5A99",
    "#85B66F",
    "#8D2307",
    "#2B83BA",
    "#7D8B8F",
    "#E8718D",
    "#1E434C",
    "#9B4F07",
    '#1b9e77',
    "#FF9E17",
    '#7570b3',
    "#204B24",
    "#9795A3",
    "#C94F44",
    "#7B9F35",
    "#373276",
    "#882D61",
    "#AA9039",
    "#F38F3A",
    "#712333",
    "#3B3A73",
    "#9E5165",
    "#A51E22",
    "#261326",
    "#e4572e",
    "#29335c",
    "#f3a712",
    "#669bbc",
    "#eb6841",
    "#4f372d",
    "#cc2a36",
    "#00a0b0",
    "#00b159",
    "#f37735",
    "#ffc425",
  ];

  for (const layer of this.getLayers()) {
    !layer.getColor() ? layer.setColor(LAYERS_COLOR.splice(0,1)[0]): null;
  }
};

proto._layerChildrenRelationInEditing = function(layer) {
  let relations = layer.getChildren();
  const childrenrealtioninediting = relations.filter(relation => this.getLayerById(relation));
  return childrenrealtioninediting;
};

// undo relations
proto.undoRelations = function(undoItems) {
  Object.entries(undoItems).forEach(([toolboxId, items]) => {
    const toolbox = this.getToolBoxById(toolboxId);
    const session = toolbox.getSession();
    session.undo(items);
  })
};

// undo relations
proto.rollbackRelations = function(rollbackItems) {
  Object.entries(rollbackItems).forEach(([toolboxId, items]) => {
    const toolbox = this.getToolBoxById(toolboxId);
    const session = toolbox.getSession();
    session.rollback(items);
  })
};

// redo relations
proto.redoRelations = function(redoItems) {
  Object.entries(redoItems).forEach(([toolboxId, items]) => {
    const toolbox = this.getToolBoxById(toolboxId);
    const session = toolbox.getSession();
    session.redo(items);
  })
};

proto.getEditingLayer = function(id) {
  return this._editableLayers[id].getEditingLayer();
};

/**
 * options contain eventually editing type (create/update/delete)
 * @param options
 * @private
 */
proto._buildToolBoxes = function(options={}) {
  // add id of toolbot to show at beginning
  options.show = [SIGNALER_IIM_CONFIG.signaler_layer_id];
  for (const layer of this.getLayers()) {
    const toolbox = ToolBoxesFactory.build(layer, options);
    this.addToolBox(toolbox);
  }
};

proto.addToolBox = function(toolbox) {
  this._toolboxes.push(toolbox);
  // add session
  this._sessions[toolbox.getId()] = toolbox.getSession();
  this.state.toolboxes.push(toolbox.state);
};

/*
* Add event
* @param {String} type - Event Type
* @param
* */
proto.addEvent = function({type, id, fnc}={}) {
  if (!this._events[type]) this._events[type] = {};
  if (!this._events[type][id]) this._events[type][id] = [];
  this._events[type][id].push(fnc);
};

proto.runEventHandler = function({type, id} = {}) {
  this._events[type] && this._events[type][id] && this._events[type][id].forEach(fnc => fnc());
};

/**
 *
 * @param mode -  default or autosave
 * @param cb object contain done/error two functions§
 *
 * @param modal - Boolean true or false to show to ask
 * @param messages - object success or error
 */
proto.setSaveConfig = function({mode = 'default', cb={}, modal=false, messages={success: false, error: false}}={}){
  const {success=false, error=false} = messages;
  this.saveConfig.mode = mode;
  this.saveConfig.modal = modal;
  this.saveConfig.messages = {
    success,
    error
  };
  this.saveConfig.cb = {
    ...this.saveConfig.cb,
    ...cb
  }
};

//return save mode
proto.getSaveConfig = function(){
  return this.saveConfig;
};

proto.resetDefaultSaveConfig = function(){
  this.saveConfig = {
    mode: "default", // default, autosave
    modal: false,
    messages: null, // object to set custom message
    cb: {
      done: null, // function Called after save
      error: null, // function called affte commit error
    }
  };
};

/**
 * Reset default values
 */
proto.resetDefault = function(){
  this.resetDefaultSaveConfig();
  this.disableMapControlsConflict(false);
};

proto.filterReportFieldsFormValues = async function({fields=[]}={}){
  const promises = [];
  const {fields:dynamic_fields} = this.config;
  for (const field of fields) {
    if (dynamic_fields[SIGNALER_IIM_CONFIG.signaler_layer_id].indexOf(field.name) !== -1 && field.name !== 'note'){
      const {key, value, layer_id, loading={state: null}} = field.input.options;
      const promise = new Promise((resolve, reject) =>{
        loading.state = 'loading';
        const relationLayer = CatalogLayersStoresRegistry.getLayerById(layer_id);
        relationLayer.getDataTable({
          ordering: key,
          custom_params: {
            [SIGNALER_IIM_CONFIG.signaler_field]: this.currentReport.isNew ? '_new_' : this.currentReport.id
          }
        }).then(response =>{
          if (response && response.features) {
            const features = response.features;
            field.input.options.values = [];
            for (let i = 0; i < features.length; i++) {
              field.input.options.values.push({
                key: features[i].properties[key],
                value: features[i].properties[value]
              })
            }
            loading.state = 'ready';
          } else loading.state = 'error';
          resolve()
        }).fail(()=>{
          loading.state = 'error';
          reject();
        });
        promises.push(promise);
      });
    }
  }
  await Promise.allSettled(promises)
};

proto._attachLayerWidgetsEvent = function(layer) {
  const fields = layer.getEditingFields();
  for (let i=0; i < fields.length; i++) {
    const field = fields[i];
    if (field.input) {
      if (field.input.type === 'select_autocomplete') {
        const {options} = field.input;
        let {key, value, usecompleter, layer_id, loading} = options;
        const self = this;
        if (!usecompleter) {
          this.addEvent({
            type: 'start-editing',
            id: layer.getId(),
            fnc() {
              const {create_new_signaler, result, state_field } = SIGNALER_IIM_CONFIG;
              if ((create_new_signaler || result) && field.name === state_field) return;
              // remove all values
              loading.state = 'loading';
              field.input.options.values = [];
              const relationLayer = CatalogLayersStoresRegistry.getLayerById(layer_id);
              if (relationLayer) {
                if (relationLayer) {
                  relationLayer.getDataTable({
                    ordering: key
                  }).then(response => {
                    if (response && response.features) {
                      const features = response.features;
                      self.fireEvent('autocomplete', {
                        field,
                        features
                      });
                      for (let i = 0; i < features.length; i++) {
                        field.input.options.values.push({
                          key: features[i].properties[key],
                          value: features[i].properties[value],
                          color: features[i].properties['color']
                        })
                      }
                      loading.state = 'ready';
                    } else loading.state = 'error';
                  }).fail(error => {
                    loading.state = 'error'
                  });
                } else {
                  loading.state = 'error'
                }
              } else {
                self.fireEvent('autocomplete', {
                  field,
                  features: []
                });
                loading.state = 'ready';
              }
            }
          })
        }
      }
    }
  }
};

proto._createToolBoxDependencies = function() {
  this._toolboxes.forEach(toolbox => {
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

/**
 * Check if field of layer is required
 * @param layerId
 * @param fieldName
 * @returns {*}
 */
proto.isFieldRequired = function(layerId, fieldName) {
  return this.getLayerById(layerId).isFieldRequired(fieldName);
};

proto._getToolBoxEditingDependencies = function(layer) {
  let relationLayers = [...layer.getChildren(), ...layer.getFathers()];
  return relationLayers.filter((layerName) => {
    return !!this.getLayerById(layerName);
  });
};

proto._hasEditingDependencies = function(layer) {
  let toolboxesIds = this._getToolBoxEditingDependencies(layer);
  return !!toolboxesIds.length;
};

proto.handleToolboxDependencies = function(toolbox) {
  let dependecyToolBox;
  if (toolbox.isFather()) this.getLayersDependencyFeatures(toolbox.getId());
  toolbox.getDependencies().forEach(toolboxId => {
    dependecyToolBox = this.getToolBoxById(toolboxId);
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
  return this._editableLayers[Symbol.for('layersarray')];
};

proto.stopCurrentWorkFlow = function(){
  const currentWorkflow = this.getCurrentWorkflow();
  currentWorkflow.stop();
};

proto.stopAllWorkflowsStack = function(){
  WorkflowsStack.clear();
  GUI.setModal(false);
  GUI.disableSideBar(false);
  GUI.closeContent();
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

proto.getRelationsAttributesByFeature = function({layerId, relation, feature}={}) {
  const layer = this.getToolBoxById(layerId).getLayer();
  const relations = this.getRelationsByFeature({layerId, relation, feature});
  return relations.map(relation => {
    return {
      fields: layer.getFieldsWithValues(relation, {
        relation: true
      }),
      id: relation.getId()
    };
  });
};

proto._getRelationLayerId = function({layerId, relation}={}){
  return relation.getChild() === layerId ? relation.getFather() : relation.getChild();
};

proto.getRelationsByFeature = function({layerId, relation, feature, layerType}={}) {
  const {ownField, relationField} = this._getRelationFieldsFromRelation({
    layerId,
    relation
  });
  const featureValue = feature.get(relationField);
  const features = this._getFeaturesByLayerId(layerId);
  return features.filter(feature => feature.get(ownField) == featureValue);
};

proto.registerLeavePage = function(bool){
  ApplicationService.registerLeavePage({
    bool
  });
};

proto.loadPlugin = function() {
  return this._load = !!this._getEditableLayersFromCatalog().length;
};

proto.getLayerById = function(layerId) {
  return this._editableLayers[layerId];
};

proto.beforeEditingStart = function({layer} = {}) {
  this._checkLayerWidgets(layer);
};

proto.afterEditingStart = function({layer}= {}) {
  //TODO
};

proto.getToolBoxById = function(toolboxId) {
  return this._toolboxes.find(toolbox => toolbox.getId() === toolboxId);
};

/**
 * Method to apply filter editing constraints to toolbox editing 
 * @param constraints
 */
proto.setApplicationEditingConstraints = function(constraints={showToolboxesExcluded: true, toolboxes:{}}){
  this.applicationEditingConstraints = {
    ...this.applicationEditingConstraints,
    ...constraints
  };
  
  const {toolboxes, showToolboxesExcluded} = constraints;
  const toolboxIds = Object.keys(toolboxes);
  !showToolboxesExcluded && this.state.toolboxes.forEach(toolbox => toolbox.show =  toolboxIds.indexOf(toolbox.id) !== -1);
  toolboxIds.forEach(toolboxId => {
    const toolbox = this.getToolBoxById(toolboxId);
    toolbox.setEditingConstraints(toolboxes[toolboxId]);
  });
};

/**
 * Get application editing contraints if applied
 */

proto.getApplicationEditingConstraints = function(){
  return this.applicationEditingConstraints;
};

/**
 *
 */

proto.getApplicationEditingConstraintById = function(toolboxId){
  return this.applicationEditingConstraints.toolboxes[toolboxId];
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
  const {mode, modal=true} = this.saveConfig;
  return new Promise((resolve, reject) => {
    const commitpromises = [];
    mode !== 'autosave' && this._toolboxes.forEach(toolbox => {
      // check if temp changes are waiting to save on server
      if (toolbox.getSession().getHistory().state.commit) {
        // ask to commit before exit
        commitpromises.push(this.commit({
          toolbox,
          modal
        }));
      }
    });
    $.when.apply(this, commitpromises)
      .fail(() => {})
      .always(() => {
        this._toolboxes.forEach(toolbox => toolbox.stop());
        this.clearState();
        this._mapService.refreshMap();
        resolve();
      });
  })
};

// remove Editing LayersStore
proto.clear = function() {
  MapLayersStoreRegistry.removeLayersStore(this._layersstore);
  SessionsRegistry.clear();
  //turn off events
  this._mapService.off(MAPCONTROL_TOGGLED_EVENT_NAME, this.mapControlToggleEventHandler);
  this.unregisterResultEditingAction();
};

proto.clearState = function() {
  this.state.toolboxselected = null;
  this.state.toolboxidactivetool =  null;
  this.state.message =  null;
  this.resetReportData();
  this.initEditingState();
};

proto.getRelationsInEditing = function({layerId, relations, feature}={}) {
  let relationsinediting = [];
  let relationinediting;
  relations.forEach(relation => {
    const relationLayerId = this._getRelationLayerId({layerId, relation});
    if (this.getLayerById(relationLayerId)) {
      relationinediting = {
        relation: relation.getState(),
        relations: this.getRelationsAttributesByFeature({
          layerId: relationLayerId,
          relation,
          feature
        })
      };
      relationinediting.validate = {
        valid:true
      };
      relationsinediting.push(relationinediting);
    }
  });
  return relationsinediting;
};

proto._filterRelationsInEditing = function({layerId, relations=[]}) {
  return relations.filter(relation => {
    const relationId = this._getRelationId({
      layerId,
      relation
    });
    return this.getLayerById(relationId)
  })
};

proto.stopSessionChildren = function(layerId) {
  const layer = this.getLayerById(layerId);
  const relations = this._filterRelationsInEditing({
    relations: layer.getRelations() ? layer.getRelations().getArray() : [],
    layerId
  });
  relations.forEach(relation => {
    const relationId = this._getRelationId({
      layerId,
      relation
    });
    !this.getToolBoxById(relationId).inEditing() && this._sessions[relationId].stop();
  })
};

proto.fatherInEditing = function(layerId) {
  let inEditing = false;
  let toolbox;
  let relationLayerFathers = this.getLayerById(layerId).getFathers();
  relationLayerFathers.forEach(id => {
    toolbox = this.getToolBoxById(id);
    if (toolbox && toolbox.inEditing()) {
      inEditing = true;
      return false;
    }
  });
  return inEditing;
};

proto._getRelationFieldsFromRelation = function({layerId, relation} = {}) {
  const childId = relation.getChild ? relation.getChild() : relation.child;
  const isChild = childId !== layerId;
  const _fatherField = relation.getFatherField ? relation.getFatherField() : relation.fatherField;
  const _childField = relation.getChildField ? relation.getChildField() : relation.childField;
  const ownField = isChild ? _fatherField : _childField;
  const relationField = isChild ? _childField : _fatherField;
  return {
    ownField,
    relationField
  }
};

proto.createEditingDataOptions = function(filterType='all', options={}) {
  const {feature, relation, field, layerId, operator} = options;
  let filter;
  switch (filterType) {
    //case all leave filter undefined
    case 'all':
    break;
    case 'bbox':
      filter = {
        bbox: this._mapService.getMapBBOX()
      };
      break;
    case 'field': // case of field
      filter = {
        field: {
          field,
          type: 'editing'
        }
      };
      break;
    case 'fid':
      if (operator !== 'not')
        filter = {
          fid: {
            fid: feature.getId(),
            layer: {
              id: layerId
            },
            type: 'editing',
            relation: relation.state
          }
        };
      break;
  }
  return {
    registerEvents: true, // usefult to get register vent on toolbox example mapmoveend
    editing: true,
    filter
  }
};

proto._getFeaturesByLayerId = function(layerId) {
  return this.getLayerById(layerId).readEditingFeatures()
};

proto.getLayersDependencyFeaturesFromSource = function({layerId, relation, feature, operator='eq'}={}){
  return new Promise(resolve => {
    const features = this._getFeaturesByLayerId(layerId);
    const {ownField, relationField} = this._getRelationFieldsFromRelation({
      layerId,
      relation
    });
    const featureValue = feature.get(relationField);
    const find = operator === 'eq' ? features.find(featureSource => {
      const featureSourceValue = featureSource.get(ownField) ;
      return featureSourceValue == featureValue;
    }): false;
    resolve(find);
  })
};

proto._getRelationId = function({layerId, relation}={}) {
  const fatherId = relation.getFather ? relation.getFather() : relation.father;
  const childId = relation.getChild ? relation.getChild() : relation.child;
  return fatherId === layerId ? childId: fatherId;
};

proto.getLayersDependencyFeatures = function(layerId, opts={}) {
  const promises = [];
  const layer = this.getLayerById(layerId);
  const relations = opts.relations ? opts.relations : layer.getChildren().length && layer.getRelations() ? this._filterRelationsInEditing({
    relations: layer.getRelations().getArray(),
    layerId
  }) : [];
  const online = ApplicationState.online;
  relations.forEach(relation => {
    const id = this._getRelationId({
      layerId,
      relation
    });
    const promise = new Promise(resolve => {
      const filterType = opts.filterType || 'fid';
      opts.relation = relation;
      opts.layerId = layerId;
      const options = this.createEditingDataOptions(filterType, opts);
      const session = this._sessions[id];
      const toolbox = this.getToolBoxById(id);
      if (online && session) {
        toolbox.startLoading();
        if (!session.isStarted())
          session.start(options)
            .always((promise) => {
              promise.always(()=>{
                toolbox.stopLoading();
                resolve(id);
              })
            });
        else {
          this.getLayersDependencyFeaturesFromSource({
            layerId: id,
            relation,
            feature: opts.feature,
            operator: opts.operator
          }).then(find =>{
            if (find) {
              resolve(id);
              toolbox.stopLoading();
            } else {
              session.getFeatures(options).always(promise => {
                promise.always(()=>{
                  toolbox.stopLoading();
                  resolve(id);
                });
              });
            }
          })
        }
      } else {
        this.getLayersDependencyFeaturesFromSource({
          layerId: id,
          relation,
          feature: opts.feature,
          operator: opts.operator
        }).then(()=>resolve(id))
      }
    });
    promises.push(promise);
  });
  return Promise.all(promises);
};

proto.commitDirtyToolBoxes = function(layerId) {
  return new Promise(resolve => {
    const toolbox = this.getToolBoxById(layerId);
    const children = this.getLayerById(layerId).getChildren();
    if (toolbox.isDirty() && toolbox.hasDependencies()) {
      this.commit(toolbox)
        .fail(() => {
          toolbox.revert()
            .then(() => {
              toolbox.getDependencies().forEach((layerId) => {
                children.indexOf(layerId) !== -1 && this.getToolBoxById(layerId).revert();
              })
            })
        })
        .always(() => resolve(toolbox))
    } else
      resolve(toolbox);
  });
};

proto._createCommitMessage = function(commitItems) {
  function create_changes_list_dom_element(add, update, del) {
    const changeIds = {};
    changeIds[`${t('signaler_iim.messages.commit.add')}`] = add.length;
    changeIds[`${t('signaler_iim.messages.commit.update')}`] = `[${update.map((item)=> item.id).join(', ')}]`;
    changeIds[`${t('signaler_iim.messages.commit.delete')}`] = `[${del.join(', ')}]`;
    let dom = `<h4>${t('signaler_iim.messages.commit.header')}</h4>`;
    dom+=`<h5>${t('signaler_iim.messages.commit.header_add')}</h5>`;
    dom+=`<h5>${t('signaler_iim.messages.commit.header_update_delete')}</h5>`;
    dom+= `<ul style='border-bottom-color: #f4f4f4;'>`;
    Object.entries(changeIds).forEach(([action, ids]) => {
      dom += `<li>${action} : ${ids} </li>`;
    });
    dom += `</ul>`;
    return dom;
  }

  let message = "";
  message += create_changes_list_dom_element(commitItems.add, commitItems.update, commitItems.delete);
  if (!_.isEmpty(commitItems.relations)) {
    message += "<div style='height:1px; background:#f4f4f4;border-bottom:1px solid #f4f4f4;'></div>";
    message += "<div style='margin-left: 40%'><h4>"+ t('signaler_iim.relations') +"</h4></div>";
    Object.entries(commitItems.relations).forEach(([ relationName, commits]) => {
      message +=  "<div><span style='font-weight: bold'>" + relationName + "</span></div>";
      message += create_changes_list_dom_element(commits.add, commits.update, commits.delete);
    })
  }
  return message;
};

proto.showCommitModalWindow = function({layer, commitItems, close, commitPromise}) {
  // messages set to commit
  const messages = {
    success: {
      message: "plugins.signaler_iim.messages.saved",
      autoclose: true
    },
    error: {}
  };

  return new Promise((resolve, reject) =>{
    const workflow = new CommitFeaturesWorkflow({
      type: 'commit'
    });
    workflow.start({
      inputs: {
        layer,
        message: this._createCommitMessage(commitItems),
        close
      }
    })
      .then(() => {
        const dialog = GUI.dialog.dialog({
          message: `<h4 class="text-center"><i style="margin-right: 5px;" class=${GUI.getFontClass('spinner')}></i>${t('signaler_iim.messages.saving')}</h4>`,
          closeButton: false
        });
        resolve(messages);
        commitPromise.always(()=>dialog.modal('hide')) // hide saving dialog
      })
      .fail(error => reject(error))
      .always(()=> workflow.stop())
  })
};

/**
 * Functioncalled very single change saved temporary
 */
proto.saveChange = function() {
  switch (this.saveConfig.mode) {
    case 'autosave':
      return this.commit({
        modal: false // set to not show modal ask window
      });
    default:
      return resolve();
  }
};

/**
 * Metyhod to commit and save changes on server persistently
 *
 * @param toolbox
 * @param commitItems
 * @param messages
 * @param done
 * @param modal
 * @param close
 * @returns {*}
 */
proto.commit = function({toolbox, commitItems, modal=true, close=false}={}) {
  const d = $.Deferred();
  const commitPromise = d.promise();
  const { cb={}, messages={success:{}, error:{}} } = this.saveConfig;
  toolbox = toolbox || this.state.toolboxselected;
  let session = toolbox.getSession();
  let layer = toolbox.getLayer();
  const layerType = layer.getType();
  const items = commitItems;
  commitItems = commitItems || session.getCommitItems();
  const promise = modal ? this.showCommitModalWindow({
    layer,
    commitItems,
    close,
    commitPromise // add a commit promise
  }) : Promise.resolve(messages);
  promise.then(messages => {
    if (ApplicationState.online) {
      session.commit({items: items || commitItems})
        .then((commitItems, response) => {
          if (ApplicationState.online) {
            if (response.result) {
              const {autoclose=true, message="plugins.signaler_iim.messages.saved"} = messages.success;
              if (messages && messages.success) GUI.showUserMessage({
                type: 'success',
                message,
                duration: 3000,
                autoclose
              });
              layerType === Layer.LayerTypes.VECTOR && this._mapService.refreshMap({force: true});
              cb.done && cb.done instanceof Function && cb.done(toolbox);
            } else {
              const parser = new serverErrorParser({
                error: response.errors
              });
              const errorMessage = parser.parse({
                type: 'String'
              });
              const {autoclose=false, message} = messages.error || {};
              GUI.showUserMessage({
                type: 'alert',
                message: message || errorMessage,
                textMessage: !message,
                autoclose
              });
              cb.error && cb.error instanceof Function && cb.error(toolbox, message || errorMessage);
            }
            d.resolve(toolbox);
          }
        })
        .fail(error => {
          const parser = new serverErrorParser({
            error
          });
          const errorMessage = parser.parse();
          const {autoclose = false, message} = messages.error;
          GUI.showUserMessage({
            type: 'alert',
            message: message || errorMessage,
            textMessage: !message,
            autoclose
          });
          d.reject(toolbox);
          cb.error && cb.error instanceof Function && cb.error(toolbox, message || errorMessage);
        });
      //case offline
    } else this.saveOfflineItem({
            data: {
              [session.getId()]: commitItems
            },
            id: OFFLINE_ITEMS.CHANGES
          }).then(() =>{
            GUI.showUserMessage({
              type: 'success',
              message: "plugins.signaler_iim.messages.saved_local",
              autoclose: true
            });
            session.clearHistory();
            d.resolve(toolbox);
          }).catch(error=>{
            GUI.showUserMessage({
              type: 'alert',
              message: error,
              textMessage: true,
            });
            d.reject(toolbox);
          })
    }).catch(() => d.reject(toolbox));
  return commitPromise;
};

proto.setCurrentReportData = function({feature, valid}={}){
  this.currentReport.id = feature.getId();
  this.currentReport.isNew = feature.isNew();
  this.currentReport.valid = valid;
  this.currentReport.feature = feature;
  const properties = feature.getProperties();
  Object.keys(this.currentReport.ab_signal_fields).forEach(field => this.currentReport.ab_signal_fields[field].value = properties[field]);
  return this.currentReport.id;
};

proto.getCurrentReportData = function(){
  return this.currentReport;
};

proto.setCurrentFeatureReport = function({feature}={}){
  this.currentReport.feature = feature;
};

proto.getCurrentFeatureReport = function(){
  return this.currentReport.feature;
};

proto.setCurrentFeatureReportVertex = function(vertex){
  this.currentReport.vertex = feature;
};

proto.getCurrentFeatureReportVertex = function(){
  const {vertex} = this.getCurrentFeatureReportData();
  return vertex;
};
/**
 * Reset report Data
 *
 */
proto.resetReportData = function(){
  this.currentReport = {
    id: null,
    result: false,
    ab_signal_fields: Object.keys(this.currentReport.ab_signal_fields).reduce((accumulator, field) => {
      accumulator[field] = {
        label: null,
        value: null
      };
      return accumulator
    },{}),
    isNew: true,
    valid: false,
    feature: {
      id: null,
      isNew: true,
      valid: false
    }
  }
};

/**
 * Methods to get editing layer
 */

proto.getReportEditingLayer = function(){};

proto.getFeatureReportEditingLayer = function(){};


proto.getVertexEditingLayer = function(){};

proto.getPointFeaturesfromGeometryVertex = function(geometry){
  return getPointFeaturesfromGeometryVertex(geometry);
};

proto.removeVertexFeatureFromReportFeature = function(vertex){
  const featureSession = this.getToolBoxById(SIGNALER_IIM_CONFIG.geo_layer_id).getSession();
  const vertexToolBox = this.getToolBoxById(SIGNALER_IIM_CONFIG.vertex_layer_id);
  const vertexLayerSource = vertexToolBox.getEditingLayerSource();
  vertexLayerSource.removeFeature(vertex);
  featureSession.pushDelete(SIGNALER_IIM_CONFIG.vertex_layer_id, vertex)
};

proto.getRelationFieldByLayerId = function(layerId){
  const layer = this.getLayerById(layerId);
};

proto.addNewVertexFeatureFromReportFeature = function({reportFeature, vertexOlFeature} = {}){
  const value = reportFeature.getId();
  const featureSession = this.getToolBoxById(SIGNALER_IIM_CONFIG.geo_layer_id).getSession();
  const vertexToolBox = this.getToolBoxById(SIGNALER_IIM_CONFIG.vertex_layer_id);
  const vertexLayerAttributes = vertexToolBox.getLayer().getEditingFields();
  const vertexLayerSource = vertexToolBox.getEditingLayerSource();
  vertexLayerAttributes.forEach(({name}) => {
    name === 'feature_id' ? vertexOlFeature.set('feature_id', value) : vertexOlFeature.set(name, null)
  });
  const feature = new Feature({
    feature: vertexOlFeature
  });
  feature.setTemporaryId();
  vertexLayerSource.addFeature(feature);
  featureSession.pushAdd(SIGNALER_IIM_CONFIG.vertex_layer_id, feature)
};

/**
 * Method create vertex from report feature
 */
proto.createVertexfromReportFeatures = function(features=[]){
  return new Promise((resolve, reject) =>{
    features.forEach(feature => {
      const featureIsNew = feature.isNew();
      const value = featureIsNew ? feature.getId() : feature.get('id'); // get value of related vertex feature field
      const options = featureIsNew ? {
        filter: {
          nofeatures: true
        }
      } : {
        filter: {
          field: `feature_id|eq|${value}`,
        }
      };
      const vertexToolBox = this.getToolBoxById(SIGNALER_IIM_CONFIG.vertex_layer_id);
      vertexToolBox.start(options)
        .then(()=>{
          const pointFeatures = this.getPointFeaturesfromGeometryVertex(feature.getGeometry());
          pointFeatures.forEach(vertexOlFeature => {
            this.addNewVertexFeatureFromReportFeature({
              reportFeature: feature,
              vertexOlFeature
            })
          });
          resolve();
        })
        .fail(err => reject(err))
    })
  })
};

/**
 * Method to return relation between geo layer (feature) and vertex
 * @returns Relation
 */
proto.getGeoLayerVertexRelation = function(){
  const {geo_layer_id, vertex_layer_id} = SIGNALER_IIM_CONFIG;
  return this.getLayerById(geo_layer_id).getRelations().getRelationByFatherChildren(geo_layer_id, vertex_layer_id);
};

proto.getFeatureAndRelatedVertexReportByReportId = function(filter){
  const {signaler_field} = SIGNALER_IIM_CONFIG;
  const {id:reportId, isNew}= this.getCurrentReportData();
  const featuresToolbox = this.getToolBoxById(SIGNALER_IIM_CONFIG.geo_layer_id);
  return new Promise((resolve, reject) => {
    const options = {
      filter: filter || {
        field: `${signaler_field}|eq|${reportId}`,
      }
    };
    featuresToolbox.start(options)
      .then(({features=[]}) => {
        const featureLength = features.length;
        if (featureLength) {
          if (SIGNALER_IIM_CONFIG.vertex_layer_id){
            const childField = this.getGeoLayerVertexRelation().getChildField();
            const vertexToolbox = this.getToolBoxById(SIGNALER_IIM_CONFIG.vertex_layer_id);
            const value = features.map(feature => feature.getId());
            const field = createSingleFieldParameter({
              field: childField,
              value,
              operator:'eq',
              logicop: 'OR'
            });
            const options = {
              filter: {
                field
              }
            };
            vertexToolbox.start(options);
          }
        }
        resolve(features);
      })
      .fail(err => reject(err))
  });
};

proto.getVertexFromFeatureReport = function(feature){
  const id = feature.getId();
  const vertexLayerToolBox = this.getToolBoxById(SIGNALER_IIM_CONFIG.vertex_layer_id);
  return vertexLayerToolBox.getEditingLayerSource().getFeatures().filter(feature => feature.get('feature_id') == id);
};

proto.initEditingState = function(){
  const reportToolbox = this.getToolBoxById(SIGNALER_IIM_CONFIG.signaler_layer_id);
  reportToolbox.setShow(true);
  reportToolbox.setSelected(true);
  if (SIGNALER_IIM_CONFIG.geo_layer_id) {
    const featuresToolbox = this.getToolBoxById(SIGNALER_IIM_CONFIG.geo_layer_id);
    featuresToolbox.setShow(false);
  }
  this.setSelectedToolbox(reportToolbox);
};

/**
 * Editing Report
 */
proto.editingReport = function({filter, feature, toolId, openForm=false, currentFid=null}={}){
  return new Promise((resolve, reject) => {
    const {signaler_layer_id, geo_layer_id, vertex_layer_id} = SIGNALER_IIM_CONFIG;
    const reportToolbox = this.getToolBoxById(signaler_layer_id);
    let promise;
    if (feature) {
      const d = $.Deferred();
      promise = d.promise();
      d.resolve({features:[feature]})
    } else promise = reportToolbox.start({filter});
    promise.then(async ({features})=>{
      /**
       * check if geolayer and vertex layer is loaded in editing
       */
      if (geo_layer_id) {
        const featuresToolbox = this.getToolBoxById(geo_layer_id);
        featuresToolbox.stop();
        featuresToolbox.setShow(false);
      }
      if (vertex_layer_id) {
        const vertexToolbox =  this.getToolBoxById(vertex_layer_id);
        vertexToolbox.stop();
      }
      /*
        end check
       */
      reportToolbox.setShow(true);
      reportToolbox.setSelected(true);
      this.setSelectedToolbox(reportToolbox);
      const tool = toolId && reportToolbox.getToolById(toolId);
      tool && reportToolbox.setActiveTool(tool);
      // in case editing is started from result content
      if (openForm) {
        const openFormTaskClass = require('../workflows/steps/tasks/openformtask');
        const options = {
          context: {
            session: reportToolbox.getSession()
          },
          inputs: {
            layer: reportToolbox.getLayer(),
            features
          }
        };
        this._editSingleReportFormTask = new openFormTaskClass();
        const promise = new Promise((resolve, reject)=>{
          this._editSingleReportFormTask.run(options.inputs, options.context)
            .then(() => {
              reportToolbox.getSession().save();
              reportToolbox.getSession().commit().always(resolve);
            })
            .fail(resolve)
            .always(()=>{
              this._editSingleReportFormTask.stop();
              GUI.disableSideBar(false);
            })
        });
        const fid = this.currentReport.id; // signaler id (in case of new is not setted)
        await promise;
        this.getPlugin().hideEditingPanel(); // moved here because i need to unlock afet commit
        //at the end show signal to result
        this.showSignalerOnResultContent({
          fid
        });
      }
      resolve({
        features,
        toolbox: reportToolbox
      });
    }).fail(reject)
  })
};

/**
 * Editing Feature Report
 */
proto.editingFeaturesReport = function({toolId, filter}={}){
  const reportToolbox = this.getToolBoxById(SIGNALER_IIM_CONFIG.signaler_layer_id);
  const promise = reportToolbox.isStarted() ? reportToolbox.stop() : Promise.resolve();
  promise.then(async ()=>{
    this._editSingleReportFormTask && this._editSingleReportFormTask.stop();
    this._editSingleReportFormTask = null;
    if (SIGNALER_IIM_CONFIG.geo_layer_id){
      const featuresToolbox = this.getToolBoxById(SIGNALER_IIM_CONFIG.geo_layer_id);
      try {
        const features = await this.getFeatureAndRelatedVertexReportByReportId(filter);
        this._mapService.zoomToFeatures(features);
        GUI.setModal(false);
        GUI.disableSideBar(false);
        reportToolbox.setShow(false);
        featuresToolbox.setShow(true);
        featuresToolbox.setSelected(true);
        this.setSelectedToolbox(featuresToolbox);
        if (toolId){
          const tool = featuresToolbox.getToolById(toolId);
          featuresToolbox.setActiveTool(tool);
        }
      } catch(err){}
    }
  })
};

proto.getDeltaXY = function({x,y, coordinates}={}){
  const getCoordinates = coordinates => {
    if (Array.isArray(coordinates[0])){
      return getCoordinates(coordinates[0])
    } else return {
      x: coordinates[0],
      y: coordinates[1]
    };
  };
  const xy = getCoordinates(coordinates);
  return {
    x: x - xy.x,
    y: y - xy.y
  }
};

EditingService.EDITING_FIELDS_TYPE = ['unique'];

module.exports = new EditingService;
