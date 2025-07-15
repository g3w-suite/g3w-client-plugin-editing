/**
 * @file
 * 
 * ORIGINAL SOURCE: g3w-client-plugin-editing/g3wsdk/editing/editor.j@v4.0.0
 * 
 * @since g3w-client-plugin-editing@v4.1.0
 */

import { ToolBox }                       from './g3w-toolbox';
import { $promisify, promisify }         from './utils/promisify';

const { ApplicationState, G3WObject }    = g3wsdk.core;
const { CatalogLayersStoresRegistry }    = g3wsdk.core.catalog;
const { Layer }                          = g3wsdk.core.layer;
const { XHR, cloneDeep }                 = g3wsdk.core.utils;

/**
 * Editor Class: bind editor to layer to do main actions
 *
 * @param config
 *
 * @constructor
 */
class Editor extends G3WObject {

  constructor(options = {}) {

    super();

    /**
     * Setter hooks.
     */
    this.setters = [
      'save',
      'addFeature',
      'updateFeature',
      'deleteFeature',
      'setFeatures',
      'getFeatures',
    ];

    /**
     * Filter to getFeaturerequest
     */
    this._filter = {
      bbox: null
    };

    /**
     * { Boolean } true, mean all features of layer are get (e.g. Table layer)
     */
    this._allfeatures = false;

    /**
     * Referred layer
     */
    this._layer = options.layer;

    const IS_OL = Layer.LayerTypes.TABLE !== this._layer;

    /**
     * ORIGINAL SOURCE: g3w-client/src/map/layers/featuresstore.js@v4.0.0
     * ORIGINAL SOURE: g3w-client/src/app/core/layers/features/olfeaturesstore.js@v3.10.2
     * 
     * Store editing features
     * 
     * @type { FeaturesStore }
     */
    this._featuresstore = Object.assign(new G3WObject, {
      _features: IS_OL ? new ol.Collection([]) : [],
      _provider: null,
      _loadedIds: [], // store features id load by current user
      _lockIds: [], // store locked features
      setters: [
        'addFeature',
        'removeFeature',
        'updateFeature',
        'clear',
        'commit',
        'featuresLockedByOtherUser',
      ],
      addFeatures(features = []) { features.forEach(f => this._addFeature(f)) },
      addFeature(feature)        { this._addFeature(feature); },
      clone()                    { return cloneDeep(this); },
      getProvider()              { return this._provider; },
      unlock()                   { return $promisify(async () => await XHR.post({ url: this._provider._layer.getUrl('unlock') })); },
      getLockIds()               { return this._lockIds; },
      getFeatureById(id)         { return IS_OL ? this._features.getArray().find(f => id == f.getId()) : this._features.find(f => id == f.getId()); },
      readFeatures()             { return IS_OL ? this._features.getArray() : this._features; },
      getLength()                { return IS_OL ? this._features.getLength() : this._features.length; },
      getFeaturesCollection()    { return this._features; },
      featuresLockedByOtherUser(features = []) {},
      removeFeature(feature) {
        if(IS_OL) {
          const index = this._features.getArray().findIndex(f => feature.getUid() === f.getUid());
          if (index >= 0) {
            this._features.removeAt(index);
            this._features.dispatchEvent('change');
          }
        } else {
          this._features = this._features.filter(f => feature.getUid() !== f.getUid());
        }
        this._removeFeature(feature);
      },
      updateFeature(feature) {
        if (IS_OL) {
          const index = this._features.getArray().findIndex(f => feature.getUid() === f.getUid());
          if (index >= 0) {
            this._features.removeAt(index);
            this._features.insertAt(index, feature);
            this._features.dispatchEvent('change');
          }
        } else {
          this._features.find((feat, idx) => {
            if (feature.getUid() === feat.getUid() ) {
              this._features[idx] = feature;
              return true;
            }
          });
        }
      },
      clear() {
        if(IS_OL) {
          try {
            // Used remove single features instead use clear method
            // because some time trows an error
            for (let i = 0; i < this._features.getArray().length; i++) {
              this._features.removeAt(i);
            }
          } catch(e) {
            console.warn(e);
          }
          //Need to set a new Collection to avoid duplicate
          this._features = null; //@TODO is still usefully ????
          this._features = new ol.Collection([]);
        } else {
          this._features  = null;
          this._features  = [];
          this._lockIds   = [];
          this._loadedIds = [];
        }
      },
      getFeatures(opts = {}) {
        return $promisify(async () => {
          if (this._provider) {
            //call provider getFeatures to get features from server
            //get the feature base on response from server features, featurelockis etc ...
            const features = this._filterFeaturesResponse(await this._provider.getFeatures(opts));
            this.addFeatures(features);
            return features;
          }
          return this._features; // Get features stored. No call to server is done
        });
      },
      commit(commitItems, featurestore) {
        return $promisify(async () => {
          if (commitItems && this._provider) {
            commitItems.lockids = this._lockIds;
            return await XHR.post({
              url:         this._provider._layer.getUrl('commit'),
              data:        JSON.stringify(commitItems),
              contentType: 'application/json',
            });
          }
          return Promise.reject();
        });
      },
      _filterFeaturesResponse(options = {}) {
        /**
         * features uis array of feature returned from server and feature that are currently locked.
         * featurelocks is array of the feature that can be locker by current client request (not locked by another user)
         * featurelocks array item
         * {
         *   featureid: Is current id of feature locked
         *   lockid: Is a server unique lock id number
         * }
         * ex.
         * {featureid: "1", lockid: "6bbab1c1c03332fb39b8ffae35e557ba"}
         *
         * If featurelocks are less than features, it means that another user is editing these features
         *
         *
         * @type {*[]}
         */
        const { features = [], featurelocks = [] } = options;

        //if no features locks mean another user locks all feature requests
        if (0 === featurelocks.length) {
          //if there are features on response
          if (features.length > 0) {
            //It means that another user locks these features
            this.featuresLockedByOtherUser(features);
          }
          return [];
        }

        //get already loaded feature id locked by current user
        const fids = this._lockIds.map(({ featureid }) => featureid);
        featurelocks
          .filter(({ featureid }) => !fids.includes(featureid)) //exclude features already locked by current user
          .forEach(fl => this._lockIds.push(fl)) //update lockIds based on a featurelocks array from response

        //store features locked by another user
        const lockFeatures = [];

        //Store features to add to layers source
        const featuresToAdd = features.filter(f => {
          //get feature id
          const featureId = f.getId();
          //check if feature id is locked features
          //it means that is not locked by another user.
          if (featurelocks.find(({ featureid }) => featureId == featureid)) {
            //check if feature is not yet added for the current user
            if (this._loadedIds.indexOf(featureId) === -1) {
              this._loadedIds.push(featureId);
              return true;
            } else {
              return false; //feature locked by the current user
            }
          } else {
            lockFeatures.push(f);
            return false; //feature locked by another user
          }
        });

        //if features locks are less than features get from server,
        // it means that another user locks some features
        if (featurelocks.length < features.length) {
          this.featuresLockedByOtherUser(lockFeatures);
        }

        return featuresToAdd;
      },
      _addFeature(feature) {
        this._features.push(feature);
        // useful for ol.source.Vector
        if(IS_OL) {
          this._features.dispatchEvent('change');
        }
      },
      setFeatures(features = []) {
        if (IS_OL) {
          //remove features
          this._features.clear();
          //add new features
          this.addFeatures(features);
          this._features.dispatchEvent('change');
        } else {
          this._features = features;
        }
      },

    });
    
    // new FeaturesStore(Layer.LayerTypes.TABLE !== this._layer);

    /**
     * Whether editor is active or not
     *
     * @type { boolean }
     */
    this._started = false;

  }

  /**
   * @since g3w-client-plugin-editing@v4.1.0
   */
  save() {
    this._layer.save();
  }

  /**
   * @since g3w-client-plugin-editing@v4.1.0
   */
  addFeature(feature) {
    this._featuresstore.addFeature(feature);
  }

  /**
   * @since g3w-client-plugin-editing@v4.1.0
   */
  updateFeature(feature) {
    this._featuresstore.updateFeature(feature);
  }

  /**
   * @since g3w-client-plugin-editing@v4.1.0
   */
  deleteFeature(feature) {
    this._featuresstore.deleteFeature(feature);
  }

  /**
   * @since g3w-client-plugin-editing@v4.1.0
   */
  setFeatures(features = []) {
    this._featuresstore.setFeatures(features);
  }

  /**
   * Get features from server method.
   * Used when vector Layer's bbox is contained into an already requested bbox (so no a new request is done).
   *
   * @param { number[] } options.filter.bbox bounding box Array [xmin, ymin, xmax, ymax]
   *
   * @returns { boolean } whether can perform a server request
   * 
   * @since g3w-client-plugin-editing@v4.1.0
   */
  async getFeatures(options = {}) {
    // skip is not onlien or all features of layers are already got
    if (!ApplicationState.online || this._allfeatures) {
      return Promise.resolve();
    }

    let doRequest = true; // default --> perform request

    const { bbox } = options.filter || {};
    //check if bbox options filter (bbox of a current map) is passed and is a vector layer
    const is_vector = bbox && Layer.LayerTypes.VECTOR === this._layer.getType();

    // first request --> need to perform request
    if (is_vector && null === this._filter.bbox) {
      this._filter.bbox = bbox;                                                      // store bbox
      doRequest         = true;
    }

    // subsequent requests --> check if bbox is contained into an already requested bbox
    else if (is_vector) {
      //Boolean - Check if features are already got inside bbox
      const is_cached = ol.extent.containsExtent(this._filter.bbox, bbox);
      if (!is_cached) {
        this._filter.bbox = ol.extent.extend(this._filter.bbox, bbox);
      }
      doRequest = !is_cached;
    }

    if (!doRequest) {
      return;
    }

    // get features
    const store = this._layer.getFeaturesStore()
    
    // get features from server (TODO: remove "_filterFeaturesResponse" from core)
    if (store.getProvider()) {
      store.addFeatures(
        store._filterFeaturesResponse(await store.getProvider().getFeatures(options))
      );
    }

    const features = store.readFeatures();
    
    // add features from server to editing features store (cloned from original)
    this._featuresstore.addFeatures((features || []).map(f => f.clone()));

    //set all features to true if no filter is set (e.g., Table layer)
    this._allfeatures = !options.filter;

    return features;
  }

  /**
   * Get editing source layer feature
   * 
   * @returns { FeaturesStore }
   */
  getEditingSource() {
    return this._featuresstore;
  }

  /**
   * get Source
   */
  getSource() {
    this._layer.getSource();
  }

  /**
   * ORIGINAL SOURCE: g3w-client/src/services/editing.js@v3.9.1
   * 
   * Apply changes to source features (undo/redo)
   * 
   * @param items
   * @param { boolean } reverse whether change to opposite
   */
  setChanges(items = [], reverse = true) {
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
      this._featuresstore[Actions[item.feature.getState()].fnc](item.feature.clone());
    });
  }

  /**
   * @returns {*}
   */
  getLayer() {
    return this._layer;
  }

  /**
   * @param layer
   */
  setLayer(layer) {
    return this._layer = layer;
  }

  /**
   * Rollback changes
   * 
   * @param changes
   * 
   * @returns {*}
   */
  async rollback(changes = []) {
    return this.setChanges(changes, true);
  }

  /**
   * Apply response data from server in case of new inserted feature
   * @param { Object } response
   * @param response.response.new            array of new ids
   * @param response.response.new.clientid   temporary id created by client __new__
   * @param response.response.new.id         the new id created and stored on server
   * @param response.response.new.properties properties of the feature saved on server
   * @param response.response.new_lockids    array of new lockIds
   * 
   * @param relations
   */
  applyCommitResponse(response = {}, relations = []) {

    // skip when no response and response.result is false
    if (!(response && response.result)) { return }

    //Loop on new features saved on server
    // clientid - temporary id of new feature
    // id - id saved on server (autogenerate, next value) to subtituite to clientid feature id
    // properties - properties of feature returned by server
    response.response.new.forEach(({ clientid, id, properties } = {}) => {
      //get feature from current layer in editing
      const feature  = this.getEditingSource().getFeatureById(clientid);
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
      const feature  = this.getEditingSource().getFeatureById(id);
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

    const features = this.readEditingFeatures();

    features.forEach(f => f.clearState());          // reset state of the editing features (update, new etc..)

    this._layer.setFeatures([...features]);         // substitute layer features with actual editing features ("cloned" to prevent layer actions duplicates, eg. addFeatures)

    // add lock ids
    this._layer._featuresstore._lockIds = [...new Set(this._layer._featuresstore._lockIds.concat(...response.response.new_lockids))]
    this._layer._featuresstore._lockIds.forEach(({ featureid }) => this._layer._featuresstore._loadedIds.push(featureid));
  }

  /**
   * @returns {*}
   */
  getLockIds() {
    return this._layer.getSource().getLockIds();
  }

  /**
   * Run after server has applied changes to origin resource
   *
   * @param commit commit items
   *
   * @returns jQuery promise
   */
  async commit(commit) {
    
    let relations = [];

    // check if there are commit relations binded to new feature
    if (commit.add.length) {
      relations = Object
        .keys(commit.relations)
        .map(relationId => {
          const relation = this._layer.getRelations().getRelationByFatherChildren(this._layer.getId(), relationId);
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

    const store = this._layer.getFeaturesStore()

    if (store.getProvider()) {
      commit.lockids = store.getLockIds();
      response = await XHR.post({
        url:         store.getProvider().getLayer().getUrl('commit'),
        data:        JSON.stringify(commit),
        contentType: 'application/json',
      });
    } else {
      response = Promise.reject();
    }

    // sync selection filter features
    if (response?.result) {
      try {
        const layer = CatalogLayersStoresRegistry.getLayerById(this._layer.getId());
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

    /** @TODO simplfy nested promises */
    this.applyCommitResponse(response, relations);

    return response;
    
  }

  /**
   * start editing
   */
  async start(options = {}) {
    const features = await (await this.getFeatures(options)); // load layer features based on filter type
    this._started = true;                                 // if all ok set to started
    return features;                                      // features are already inside featuresstore
  }

  /**
   * Read features (action to layer)
   */
  readFeatures() {
    return this._layer.readFeatures();
  }

  /**
   * @returns features stored in editor featurestore
   */
  readEditingFeatures() {
    return this._featuresstore.readFeatures();
  }

  /**
   * stop editor (unlock)
   */
  async stop() {
    const { result } = await XHR.post({
      url: this._layer.getProvider('data').getLayer().getUrl('unlock')
    });
    this.clear();
    return result;
  }

  /**
   * @returns { boolean } whether has started editor 
   */
  isStarted() {
    return this._started;
  }

  /**
   * Method to clear all filled variables
   */
  clear() {
    this._started     = false;
    this._filter.bbox = null;
    this._allfeatures = false;

    this._featuresstore.clear();
    this._layer.getFeaturesStore().clear();

    // vector layer
    if (Layer.LayerTypes.VECTOR === this._layer.getType()) {
      this._layer.resetEditingSource(this._featuresstore.getFeaturesCollection());
    }
  }

}

/**
 * ORIGINAL SOURCE: g3w-client/src/map/layers/tablelayer.js@v4.0.0
 *
 * @param layer
 * @param force
 * @return {Promise<any|null>}
 */
Editor.getLayer = async function({
  layer,
  force = false,
} = {}) {

  if (!force && !layer.isEditable()) {
    return null;
  }
  
  // get layer editing config (from server)
  try {
    const {
    vector,
    constraints = {},
    capabilities,
  } = await promisify(layer.getProvider('data').getConfig());

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
      capabilities:                capabilities || window.g3wsdk.constant.DEFAULT_EDITING_CAPABILITIES, // default editing capabilities
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

  let editing_layer = layer;

  // set editing layer from IMAGE LAYER
  if (Layer.LayerTypes.IMAGE === layer.getType()) {
    try {
      editing_layer = new g3wsdk.core.layer.VectorLayer(layer.config, {
        vectorurl:    window.initConfig.plugins.editing.vectorurl,
        project_type: window.initConfig.plugins.editing.project_type,
        project:      ApplicationState.project,
      });
      layer.setEditingLayer(editing_layer);
    } catch(e) {
      console.warn(e);
      return Promise.reject(e);
    }
  }

  //set editor
  editing_layer._editor = new Editor({ layer: editing_layer }); // create an instance of editor

  // clone editable layer
  if (Layer.LayerTypes.VECTOR === editing_layer.getType()) {
    return editing_layer; 
  }

  // clone editable layer
  if (Layer.LayerTypes.TABLE === editing_layer.getType()) {
    return editing_layer.clone(); 
  }

}

export default Editor;