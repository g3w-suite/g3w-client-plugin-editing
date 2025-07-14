/**
 * @file
 * 
 * ORIGINAL SOURCE: g3w-client-plugin-editing/g3wsdk/editing/editor.j@v4.0.0
 * 
 * @since g3w-client-plugin-editing@v4.1.0
 */

import { ToolBox }    from './g3w-toolbox';
import { $promisify } from './utils/promisify';

const { ApplicationState, G3WObject }    = g3wsdk.core;
const { CatalogLayersStoresRegistry }    = g3wsdk.core.catalog;
const { Layer }                          = g3wsdk.core.layer;
const { XHR }                            = g3wsdk.core.utils;

/**
 * ORIGINAL SOURCE: g3w-client@v4.0.0
 */
class FeaturesStore extends G3WObject {

  constructor(opts = {}) {
    super();
    this._features  = opts.features || [];
    this._provider  = opts.provider || null;
    this._loadedIds = []; // store features id load by current user
    this._lockIds   = []; // store locked features

    this.setters    = [
      'addFeatures',
      'addFeature',
      'removeFeature',
      'updateFeature',
      'clear',
      'getFeatures',
      'commit',
      'featuresLockedByOtherUser',
    ];

  }

  /**
   * Add an array of features
   * 
   * @param { Array } features
   * 
   * @since 4.0.0
   */
  addFeatures(features = []) {
    features.forEach(f => this._addFeature(f))
  }

  /**
   * Add single feature
   * 
   * @param feature
   * 
   * @since 4.0.0
   */
  addFeature(feature) {
    this._addFeature(feature);
  }

  /**
   * Remove a feature
   * 
   * @param feature
   * 
   * @since 4.0.0
   */
  removeFeature(feature) {
    this._removeFeature(feature);
  }

  /**
   * Update (substitute) a feature
   * 
   * @param feature
   * 
   * @since 4.0.0
   */
  updateFeature(feature) {
    this._updateFeature(feature);
  }

  /**
   * Remove all feature
   * 
   * @since 4.0.0
   */
  clear() {
    this._clearFeatures();
  }

  /**
   * Get features from server
   * 
   * @param opts
   * 
   * @return { Promise }
   * 
   * @since 4.0.0
   */
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
  }

  /**
   * Commit changes (add, update, delete) to server
   * 
   * @param commitItems
   * @param featurestore Its is used????
   * 
   * @return {*}
   * 
   * @since 4.0.0
   */
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
  }

  /**
   * setter to know when some features are locked
   * 
   * @since 4.0.0
   */
  featuresLockedByOtherUser(features = []) {}

  clone() {
    g3wsdk.core.layer.features.FeaturesStore.prototype.clone.apply(this);
  }

  setProvider(provider) {
    this._provider = provider;
  }

  getProvider() {
    return this._provider;
  }

  /**
   *  Unlock features. Other users can edit these features
   */
  unlock() {
    return $promisify(async () => await XHR.post({ url: this._provider._layer.getUrl('unlock') }));
  }

  /**
   * Filter features to add
   * @param options
   * @private
   * @return Array of features to add
   */
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
  }

  getLockIds() {
    return this._lockIds;
  }

  /**
   * Add new lockid
   */
  addLockIds(lockIds) {
    this._lockIds = [...new Set(this._lockIds.concat(...lockIds))]
    this._lockIds.forEach(({ featureid }) => this._loadedIds.push(featureid));
  }

  /**
   * Get feature
   * @param id
   * @return { Feature }
   */
  getFeatureById(id) {
    return this._features.find(f => id == f.getId());
  }

  getFeatureByUid(uid) {
    return this._features.find(f => uid === f.getUid());
  }

  _addFeature(feature) {
    this._features.push(feature);
  }

  /**
   * Substitute (update) feature after update
   */
  _updateFeature(feature) {
    this._features.find((feat, idx) => {
      if (feature.getUid() === feat.getUid() ) {
        this._features[idx] = feature;
        return true;
      }
    });
  }

  setFeatures(features = []) {
    this._features = features;
  }

  _removeFeature(feature) {
    this._features = this._features.filter(f => feature.getUid() !== f.getUid());
  }

  _clearFeatures() {
    this._features  = null;
    this._features  = [];
    this._lockIds   = [];
    this._loadedIds = [];
  }

  getDataProvider() {
    return this._provider;
  }

// only read downloaded features
  readFeatures() {
    return this._features;
  }

}

/**
 * ORIGINAL SOURE: g3w-client/src/app/core/layers/features/olfeaturesstore.js@v3.10.2
 */
class OlFeaturesStore extends FeaturesStore {
  constructor(opts = {}) {
    super(opts);
    this._features = opts.features || new ol.Collection([]);
  }

  /**
   * Get number of features stored
   * @return { Number }
   */
  getLength() {
    return this._features.getLength();
  }

  /**
   * Store features
   * @param { Array } features
   */
  setFeatures(features = []) {
    //remove features
    this._features.clear();
    //add new features
    this.addFeatures(features);
    this._features.dispatchEvent('change');
  };

  /**
   * @returns {*[]}
   */
  readFeatures() {
    return this._features.getArray();
  };

  /**
   * @return {*|ol.Collection}
   */
  getFeaturesCollection() {
    return this._features;
  }

  /**
   * @param id
   * @returns {*}
   */
  getFeatureById(id) {
    return this._features.getArray().find(f => id == f.getId());
  }

  getFeatureByUid(uid) {
    return this._features.getArray().find(f => uid === f.getUid());
  }

  /**
   *
   * @param feature
   * @private
   */
  _addFeature(feature) {
    this._features.push(feature);
    // useful for ol.source.Vector
    this._features.dispatchEvent('change');
  }

  /**
   * Substitute the feature after modifying
   * @param feature
   * @private
   */
  _updateFeature(feature) {
    const index = this._features.getArray().findIndex(f => feature.getUid() === f.getUid());
    if (index >= 0) {
      this._features.removeAt(index);
      this._features.insertAt(index, feature);
      this._features.dispatchEvent('change');
    }
  }

  /**
   * Remove feature from store
   * @param feature
   * @private
   */
  _removeFeature(feature) {
    const index = this._features.getArray().findIndex(f => feature.getUid() === f.getUid());
    if (index >= 0) {
      this._features.removeAt(index);
      this._features.dispatchEvent('change');
    }
  }

  /**
   * @private
   */
  _clearFeatures() {
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
  }

}


/**
 * Editor Class: bind editor to layer to do main actions
 *
 * @param config
 *
 * @constructor
 */
export default class Editor extends G3WObject {

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

    /**
     * Store editing features
     * 
     * @type { FeaturesStore | OlFeaturesStore }
     */
    this._featuresstore = Layer.LayerTypes.TABLE === this._layer.getType() ? new FeaturesStore() : new OlFeaturesStore();

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
   * @returns { FeaturesStore | OlFeaturesStore }
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

    this.addLockIds(response.response.new_lockids); // add lock ids
  }

  /**
   * @param lockids locks be added to current layer
   *
   * @since 3.9.0
   */
  addLockIds(lockids) {
    this._layer.getSource().addLockIds(lockids);
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