/**
 * @file
 * 
 * ORIGINAL SOURCE: g3w-client-plugin-editing/g3wsdk/editing/editor.j@v4.0.0
 * 
 * @since g3w-client-plugin-editing@v4.1.0
 */

import { ToolBox }                       from './g3w-toolbox';

const { ApplicationState, G3WObject }    = g3wsdk.core;
const { CatalogLayersStoresRegistry }    = g3wsdk.core.catalog;
const { Layer }                          = g3wsdk.core.layer;
const { Feature}                         = g3wsdk.core.layer.features;
const { XHR, cloneDeep }                 = g3wsdk.core.utils;

const is_defined = d => undefined !== d;

class FeaturesStore extends G3WObject {
  constructor(opts = {}) {
    super({
      setters: {
        addFeatures(features = []) { features.forEach(f => this._addFeature(f)) },
        removeFeature(feature) {
          if(this.IS_OL) {
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
          if (this.IS_OL) {
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
        }
      }
    })
    this.IS_OL     = opts.IS_OL;
    this._features = this.IS_OL ? new ol.Collection([]) : []; 
  }
  clear() {
    if(this.IS_OL) {
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
   
    }
  }  
  addFeature(feature)        { this._addFeature(feature); }
  clone()                    { return cloneDeep(this); }
  getFeatureById(id)         { return this.IS_OL ? this._features.getArray().find(f => id == f.getId()) : this._features.find(f => id == f.getId()); }
  readFeatures()             { return this.IS_OL ? this._features.getArray() : this._features; }
  getLength()                { return this.IS_OL ? this._features.getLength() : this._features.length; }
  getFeaturesCollection()    { return this._features; }
  _addFeature(feature) {
    this._features.push(feature);
    // useful for ol.source.Vector
    if(this.IS_OL) {
      this._features.dispatchEvent('change');
    }
  }
  setFeatures(features = []) {
    if (this.IS_OL) {
      //remove features
      this._features.clear();
      //add new features
      this.addFeatures(features);
      this._features.dispatchEvent('change');
    } else {
      this._features = features;
    }
  }

}

/**
 * @since 4.1.0 Create a Editing Layer
 */
class EditingLayer {
  constructor(opts = {}, config = {}) {
    const { layer }                                   = opts;
    const  { vector, constraints = {}, capabilities } = config;
    this.config = {
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

    this.state  =  {
      id:       layer.getId(),
      geolayer: layer.isGeoLayer(),
      color:    vector?.style?.color ?? null,
      started:  false,
      modified: false,
      ready:    true,
    };

    this.mapLayer = layer.getMapLayer();

    const IS_OL = Layer.LayerTypes.TABLE !== layer;
    /**
     * ORIGINAL SOURCE: g3w-client/src/map/layers/featuresstore.js@v4.0.0
     * ORIGINAL SOURE: g3w-client/src/app/core/layers/features/olfeaturesstore.js@v3.10.2
     * 
     * Store editing features
     * 
     * @type { FeaturesStore }
     */
    this._featuresstore = new FeaturesStore({ IS_OL });

    this.type = IS_OL ? 'vector' : 'table';

    //set editor
    this._editor = new Editor({ layer: this }); // create an instance of editor

  }

  getId() {
    return this.state.id;
  }

  getColor() {
    return this.state.color;
  }

  setColor(color) {
    this.state.color = color;
  }

  getSource() {
    return this._featuresstore;
  }

  getType() {
    return this.type;
  }

  isGeoLayer() {
    return this.state.geolayer;
  }

  getMapLayer() {
    return this.mapLayer;
  }

  /**
   * 
   * @param { Boolean }  editable In case we want only editable fields
   * 
   * @returns { Array } layer fields
  */
  getEditingFields() {
    return this.config.fields;
  }
}

/**  
 * ORIGINAL SOURCE: g3w-client/src/g3w-globals.js@v4.0.0
 * Vector Layer Class 
 * 
 * */
class VectorLayer extends Layer { 
  constructor(config = {}, opts = {}) {
    super(config, Object.assign(opts, { _TYPE: Layer.LayerTypes.VECTOR })) 
  } 
}

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
      'featuresLockedByOtherUser',
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
    this._layer     = options.layer;

    const IS_OL     = Layer.LayerTypes.TABLE !== this._layer.getType();

    this._features  = []; // features collection original from server

    this._loadedIds = []; // store features id load by current user
    this._lockIds   = []; // store locked features

    /**
     * ORIGINAL SOURCE: g3w-client/src/map/layers/featuresstore.js@v4.0.0
     * ORIGINAL SOURE: g3w-client/src/app/core/layers/features/olfeaturesstore.js@v3.10.2
     * 
     * Store editing features
     * 
     * @type { FeaturesStore }
     */
 
    this._featuresstore = new FeaturesStore({ IS_OL });
    
    /**
     * Whether editor is active or not
     *
     * @type { boolean }
     */
    this._started = false;

  }

  featuresLockedByOtherUser(features) {}

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
  async getFeatures(options = {}, params = {}) {
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

    try {
      let response;
      if (!options.filter) {
        response = await XHR.post({
          url:         this._layer.getUrl('editing'),
          data:        JSON.stringify(params),
          contentType: 'application/json',
        });
      } else if (is_defined(options.filter.bbox)) { // bbox filter
        response = await XHR.post({
          url:  this._layer.getUrl('editing'),
          data: JSON.stringify({
            ...params,
            in_bbox:     options.filter.bbox.join(','),
            filtertoken: this._layer.getFilterToken(),
          }),
          contentType: 'application/json',
        })
      } else if (is_defined(options.filter.fid)) { // fid filter
        response = await XHR.post({
          url:         createRelationsUrl(options.filter.fid),
          contentType: 'application/json',
          data:        JSON.stringify({ formatter: 1 }),
        });
      } else if (options.filter.field) {
        response = await XHR.post({
          url:         this._layer.getUrl('editing'),
          data:        JSON.stringify({ 
            ...params,
            ...options.filter,
          }),
          contentType: 'application/json',
        })
      } else if (is_defined(options.filter.fids)) {
        response = await XHR.post({
          url:    this._layer.getUrl('editing'),
          data:   JSON.stringify({
            ...params,
            ...options.filter,
          }),
          contentType: 'application/json',
        })
      } else if (is_defined(options.filter.nofeatures)) {
        response = await XHR.post({
          url:  this._layer.getUrl('editing'),
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
      const dataProjection = 'NoGeometry' === response.vector.geometrytype ? null : this._layer.getCrs();
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
          this.featuresLockedByOtherUser(features);
        }
        //get already loaded feature id locked by current user
        const fids = lockIds.map(({ featureid }) => featureid);
        featurelocks
          .filter(({ featureid }) => !fids.includes(featureid)) //exclude features already locked by current user
          .forEach(fl => this._lockIds.push(fl)) //update lockIds based on a featurelocks array from response

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
            if (!this._loadedIds.includes(featureId)) {
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

    } catch (e) {
      console.warn(e);
    }

    this._features.push(...features); // add features to original features 
    
    // add features from server to editing features store (cloned from original)
    this._featuresstore.addFeatures((features || []).map(f => f.clone()));

    //set all features to true if no filter is set (e.g., Table layer)
    this._allfeatures = !options.filter;

    return features;
    } catch(e) {
      console.warn(e);
      return Promise.reject({ message: _("info.server_error")});
    }

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
    return this._lockIds;
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

    try {
      commit.lockids = this._lockIds;
      response = await XHR.post({
        url:         this._layer.getUrl('commit'),
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
   * Read features (action to layer)
   */
  readFeatures() {
    return this._features;
  }

  /**
   * @returns features stored in editor featurestore
   */
  readEditingFeatures() {
    return this._featuresstore.readFeatures();
  }

  /**
   * start editing
   */
  async start(options = {}) {
    const features = await this.getFeatures(options); // load layer features based on filter type
    this._started = true;                                 // if all ok set to started
    return features;                                      // features are already inside featuresstore
  }

  /**
   * stop editor (unlock)
   */
  async stop() {
    const { result } = await XHR.post({
      url: this._layer.getUrl('unlock')
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

    this._features    = []; // clear features collection
    this._lockIds     = [];
    this._loadedIds   = [];
    this._featuresstore.clear();

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
      editing_layer = new VectorLayer(layer.config, {
        vectorurl:    window.initConfig.plugins.editing.vectorurl,
        project_type: window.initConfig.plugins.editing.project_type,
        project:      ApplicationState.project,
      });
    } catch(e) {
      console.warn(e);
      return Promise.reject(e);
    }
  }

  //set editor
  editing_layer._editor = new Editor({ layer: editing_layer }); // create an instance of editor

  // clone editable layer
  if (Layer.LayerTypes.TABLE === editing_layer.getType()) {
    editing_layer = editing_layer.clone(); 
  }

  return editing_layer;

}
