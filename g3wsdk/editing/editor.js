/**
 * @file
 * 
 * ORIGINAL SOURCE: g3w-client/src/core/editing/editor.js@v3.9.1
 * 
 * @since g3w-client-plugin-editing@v3.8.x
 */

import { ToolBox }               from '../../toolboxes/toolbox';
import { promisify, $promisify } from '../../utils/promisify';

const { ApplicationState, G3WObject }    = g3wsdk.core;
const { FeaturesStore }                  = g3wsdk.core.layer.features;
const { Layer }                          = g3wsdk.core.layer;

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
      this._features.dispatchEvent('change')
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
    this.setters = {
      save()                     { this._layer.save(); },
      addFeature(feature)        { this._featuresstore.addFeature(feature); },
      updateFeature(feature)     { this._featuresstore.updateFeature(feature); },
      deleteFeature(feature)     { this._featuresstore.deleteFeature(feature); },
      setFeatures(features = []) { this._featuresstore.setFeatures(features); },
      /**
       * Get features from server method.
       * Used when vector Layer's bbox is contained into an already requested bbox (so no a new request is done).
       *
       * @param { number[] } options.filter.bbox bounding box Array [xmin, ymin, xmax, ymax]
       *
       * @returns { boolean } whether can perform a server request
       */
      getFeatures(options = {}) {
        // skip is not onlien or all features of layers are already got
        if (!ApplicationState.online || this._allfeatures) {
          return $promisify(Promise.resolve());
        }

        return $promisify(async () => {

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

          /** @TODO simplfy nested promises */
          if (doRequest) {
            const features = await promisify(this._layer.getFeatures(options));
            // add features from server to editing features store (cloned from original)
            this._featuresstore.addFeatures((features || []).map(f => f.clone()));
            //set all features to true if no filter is set (e.g., Table layer)
            this._allfeatures = !options.filter;
            return features;
          }
        });
      },
    };

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
      this._featuresstore[Actions[item.feature.getState()].fnc](item.feature);
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
  rollback(changes = []) {
    return $promisify(() => this.setChanges(changes, true));
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
      const feature = this._featuresstore.getFeatureById(clientid);
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
  commit(commit) {
    return $promisify(async () => {
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

      /** @TODO simplfy nested promises */
      const r = await promisify(this._layer.commit(commit));
      this.applyCommitResponse(r, relations);
      return r;
    });
  }

  /**
   * start editing
   */
  start(options = {}) {
    /** @TODO simplfy nested promises */
    return $promisify(async () => {
      const features = await promisify(this.getFeatures(options)); // load layer features based on filter type
      this._started = true;                                 // if all ok set to started
      return features;                                      // features are already inside featuresstore
    });
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
   * stop editor
   */
  stop() {
    return $promisify(async () => {
      const response = await promisify(this._layer.unlock());
      this.clear();
      return response;
    });
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