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
          if(this.isvector) {
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
          if (this.isvector) {
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
    this.isvector  = 'vector' === opts.type;
    this._features = this.isvector ? new ol.Collection([]) : []; 
  }
  clear() {
    if(this.isvector) {
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
  getFeatureById(id)         { return this.isvector ? this._features.getArray().find(f => id == f.getId()) : this._features.find(f => id == f.getId()); }
  readFeatures()             { return this.isvector ? this._features.getArray() : this._features; }
  getLength()                { return this.isvector ? this._features.getLength() : this._features.length; }
  getFeaturesCollection()    { return this._features; }
  _addFeature(feature) {
    this._features.push(feature);
    // useful for ol.source.Vector
    if(this.isvector) {
      this._features.dispatchEvent('change');
    }
  }
  setFeatures(features = []) {
    if (this.isvector) {
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
 * Editor Class: bind editor to layer to do main actions
 *
 * @param config
 *
 * @constructor
 */
class EditingLayer extends G3WObject {

  constructor(opts = {}, config = {}) {

    super();

    this.type = Layer.LayerTypes.TABLE !== opts.layer.getType() ? Layer.LayerTypes.VECTOR : Layer.LayerTypes.TABLE;
    /**
     * ORIGINAL SOURCE: g3w-client/src/map/layers/featuresstore.js@v4.0.0
     * ORIGINAL SOURE: g3w-client/src/app/core/layers/features/olfeaturesstore.js@v3.10.2
     * 
     * Store editing features
     * 
     * @type { FeaturesStore }
     */
    this._featuresstore = new FeaturesStore({ type: this.type });


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
      id:        layer.getId(),
      geolayer:  layer.isGeoLayer(),
      color:     vector?.style?.color ?? null,
      started:   false,
      modified:  false,
      ready:     true,
      inediting: false,
    };

    /**
     * Setter hooks.
     */
    this.setters = [
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
    this._filter = { bbox: null };

    /**
     * { Boolean } true, mean all features of layer are get (e.g. Table layer)
     */
    this._allfeatures = false;

    this._features  = []; // features collection original from server

    this._loadedIds = []; // store features id load by current user
    this._lockIds   = []; // store locked features

    const suffixUrl = `${ApplicationState.project.getType()}/${ApplicationState.project.getId()}/${this.state.id}/`;
    const vectorUrl =  ApplicationState.project.state.vectorurl;

    this.urls = {
      editing:     `${vectorUrl}editing/${suffixUrl}`,
      commit:      `${vectorUrl}commit/${suffixUrl}`,
      config:      `${vectorUrl}config/${suffixUrl}`,
      unlock:      `${vectorUrl}unlock/${suffixUrl}`,
    }
    
    /**
     * Whether editor is active or not
     *
     * @type { boolean }
     */
    this._started = false;

  }

  /**
   * 
   * METHOS GET FROM CATALOG LAYER
   */

  getChildren() {
    return CatalogLayersStoresRegistry.getLayerById(this.state.id).getChildren();
  }

  getFathers() {
    return CatalogLayersStoresRegistry.getLayerById(this.state.id).getFathers();
  } 

  isFather() {
    return CatalogLayersStoresRegistry.getLayerById(this.state.id).isFather();
  }

  getFatherField() {
    return CatalogLayersStoresRegistry.getLayerById(this.state.id).getFatherField();
  }

  getChildField() {
    return CatalogLayersStoresRegistry.getLayerById(this.state.id).getChildField();
  }  

  getRelations() {
     return CatalogLayersStoresRegistry.getLayerById(this.state.id).getRelations();
  }

   getGeometryType() {
    return CatalogLayersStoresRegistry.getLayerById(this.state.id).getGeometryType();
  }

  getTitle() {
    return CatalogLayersStoresRegistry.getLayerById(this.state.id).getTitle();
  }

  getName() {
    return CatalogLayersStoresRegistry.getLayerById(this.state.id).getName();
  }

  getProvider(type) {
    return CatalogLayersStoresRegistry.getLayerById(this.state.id).getProvider(type);
  }

  getFilterToken() {
    return CatalogLayersStoresRegistry.getLayerById(this.state.id).getFilterToken();
  }

  getCrs() {
    return CatalogLayersStoresRegistry.getLayerById(this.state.id).getCrs();
  }


  /** END METHODS */

  getType() {
    return this.type;
  }

  featuresLockedByOtherUser(features) {}

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
    const is_vector = bbox && Layer.LayerTypes.VECTOR === this.type;

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

    const url = this.urls.editing;
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
            filtertoken: this.getFilterToken(),
          }),
          contentType: 'application/json',
        })
      } else if (is_defined(options.filter.fid)) { // fid filter
        const { fid, relation } = options.filter.fid;
        response = await XHR.post({
          url: `${this.urls.editing}?relationonetomany=${relation.id}|${fid}`,
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
      const dataProjection = 'NoGeometry' === response.vector.geometrytype ? null : this.getCrs();
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
    console.log(features)

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
          const relation = this.getRelations().getRelationByFatherChildren(this.state.id, relationId);
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
        url:         this.urls.commit,
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
        const layer = CatalogLayersStoresRegistry.getLayerById(this.state.id);
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
    const features = await this.getFeatures(options);     // load layer features based on filter type
    this._started = true;                                 // if all ok set to started
    return features;                                      // features are already inside featuresstore
  }

  /**
   * stop editor (unlock)
   */
  async stop() {
    const { result } = await XHR.post({ url: this.urls.unlock });
    this.clear();
    return result;
  }

  /**
   * @returns { boolean } whether has started editor 
   */
  isStarted() {
    return this._started;
  }

  setInEditing(bool) {
    this.state.inediting = bool;
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
    if (Layer.LayerTypes.VECTOR === this.type) {
      this._layer.resetEditingSource(this._featuresstore.getFeaturesCollection());
    }
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
   * @TODO Move it on  https://github.com/g3w-suite/g3w-client-plugin-editing
   * 
   * @param { Boolean }  editable In case we want only editable fields
   * 
   * @returns { Array } layer fields
   */
  getEditingFields(editable = false) {
    if (Layer.LayerTypes.TABLE === this.type) {
      return editable ? (this.config.fields || []).filter(f => f.editable) : (this.config.fields || []);
    }
    return this.config.fields;
  }
}


export default EditingLayer;