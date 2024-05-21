/**
 * @file
 * 
 * ORIGINAL SOURCE: g3w-client/src/core/editing/editor.js@v3.9.1
 * 
 * @since g3w-client-plugin-editing@v3.8.x
 */

import ChangesManager   from './changesmanager';
import { Session }      from './session';

const { ApplicationState, G3WObject }    = g3wsdk.core;
const { FeaturesStore, OlFeaturesStore } = g3wsdk.core.layer.features;
const { Layer }                          = g3wsdk.core.layer;

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
      save:          this._save,
      addFeature:    this._addFeature,
      updateFeature: this._updateFeature,
      deleteFeature: this._deleteFeature,
      setFeatures:   this._setFeatures,
      getFeatures:   this._getFeatures,
    };



    /**
     * Filter to getFeaturerequest
     */
    this._filter = {
      bbox: null
    };

    /**
     * @FIXME add description
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

    /**
     * Not editable fields
     */
    this._noteditablefileds = this._layer.getEditingNotEditableFields() || [];

  }

  /**
   * Used when vector Layer's bbox is contained into an already requested bbox (so no a new request is done).
   *
   * @param { number[] } options.filter.bbox bounding box Array [xmin, ymin, xmax, ymax]
   *
   * @returns { boolean } whether can perform a server request
   */
  _canDoGetFeaturesRequest(options = {}) {
    const { bbox } = options.filter || {};
    const is_vector = bbox && Layer.LayerTypes.VECTOR === this._layer.getType();

    // first request --> need to perform request
    if (is_vector && null === this._filter.bbox) {
      this._filter.bbox = bbox;                                                      // store bbox
      return true;
    }

    // subsequent requests --> check if bbox is contained into an already requested bbox
    if (is_vector) {
      const is_cached = ol.extent.containsExtent(this._filter.bbox, bbox);
      if (!is_cached) {
        this._filter.bbox = ol.extent.extend(this._filter.bbox, bbox);
      }
      return !is_cached;
    }

    // default --> perform request
    return true;
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
   * Apply changes to source features
   * 
   * @param items
   * @param reverse
   */
  _applyChanges(items = [], reverse = true) {
    ChangesManager.execute(this._featuresstore, items, reverse);
  }

  /**
   * @param items
   * @param reverse
   */
  setChanges(items, reverse) {
    this._applyChanges(items, reverse)
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

  removeNotEditablePropriertiesFromFeature(feature) {
    this._noteditablefileds.forEach(field => feature.unset([field]));
  }

  /**
   * @param features features to be cloned
   */
  _cloneFeatures(features = []) {
    return features.map(f => f.clone());
  }

  /**
   * @param features
   */
  _addFeaturesFromServer(features = []) {
    this._featuresstore.addFeatures(this._cloneFeatures(features));
  }

  /**
   * @param options
   * 
   * @returns { boolean }
   */
  _doGetFeaturesRequest(options={}) {
    if (ApplicationState.online && !this._allfeatures) {
      return this._canDoGetFeaturesRequest(options);
    }
    return false;
  }

  /**
   * get features from server method
   */
  _getFeatures(options={}) {
    const d         = $.Deferred();
    const doRequest = this._doGetFeaturesRequest(options);
    if (!doRequest) {
      d.resolve();
    } else {
      /** @TODO simplfy nested promises */
      this._layer
        .getFeatures(options)
        .then(p => {
          p
            .then(features => {
              this._addFeaturesFromServer(features);
              this._allfeatures = !options.filter;
              return d.resolve(features);
            })
            .fail(d.reject)
        })
        .fail(d.reject);
    }
    return d.promise();
  }

  /**
   * revert (cancel) all changes in history and clean session
   */
  revert() {
    const d = $.Deferred();
    this._featuresstore.setFeatures(this._cloneFeatures(this._layer.readFeatures()));
    d.resolve();
    return d.promise();
  }

  /**
   * Rollback changes
   * 
   * @param changes
   * 
   * @returns {*}
   */
  rollback(changes = []) {
    const d = $.Deferred();
    this._applyChanges(changes, true);
    d.resolve();
    return d.promise()
  }

  /**
   * @param relations relations response
   */
  applyChangesToNewRelationsAfterCommit(relations) {
    let layer, source, features;
    for (const id in relations) {
      layer    = this.getLayerById(id);
      source   = this.getEditingLayer(id).getEditingSource();
      features = source.readFeatures();
      features.forEach(f => f.clearState());
      layer.getSource().setFeatures(features);
      layer.applyCommitResponse({
        response: relations[id],
        result: true,
      });
      source.setFeatures(layer.getSource().readFeatures());
    }
  }

  /**
   * Handle relation feature saved on server
   * 
   * @param opts.layerId     - id of relation layer
   * @param opts.ids         - Array of changes (new feature id)
   * @param opts.field.name  - field name
   * @param opts.field.value - field value
   */
  setFieldValueToRelationField(
    {
      layerId,
      ids=[],
      field,
    } = {}
  ) {
    const source = Session.Registry              // get source of editing layer.
      .getSession(layerId)
      .getEditor()
      .getEditingSource();

    ids.forEach(id => {                          // loop relation ids
      const feature = source.getFeatureById(id);
      if (feature) {
        feature.set(field.name, field.value);    // set father feature `value` and `name`
      }
    })
  }

  /**
   * Apply response data from server in case of new inserted feature
   *
   * @param response
   * @param relations
   */
  applyCommitResponse(response = {}, relations = []) {

    // skip when no response and response.result is false
    if (!(response && response.result)) {
      return;
    }

    const ids     = response.response.new;         // get ids from new attribute of response
    const lockids = response.response.new_lockids; // get new lockId

    ids.forEach(({
      clientid,                                // temporary id created by client __new__
      id,                                      // the new id created and stored on server
      properties                               // properties of the feature saved on server
    } = {}) => {

      const feature = this._featuresstore.getFeatureById(clientid);

      feature.setId(id);                       // set new id
      feature.setProperties(properties);

      relations.forEach(relation => {                                              // handle relations (if provided)
        Object
          .entries(relation)
          .forEach(([ relationId, options = {}]) => {
            const is_pk = options.fatherField.find(d => this._layer.isPkField(d)); // check if parent field is a Primary Key
            if (is_pk) {
              this.setFieldValueToRelationField({                                  // for each field
                layerId: relationId,                                               // relation layer id
                ids:     options.ids,                                              // ids of features of relation layers to check
                field:   options.childField[options.fatherField.indexOf(is_pk)],   // relation field to overwrite
                values:  [clientid, id]                                            // [<old temporary id value>, <new id value>]
              });
            }
          });
      });

    });

    const features = this.readEditingFeatures();

    features.forEach(f => f.clearState());       // reset state of the editing features (update, new etc..)

    this._layer.setFeatures([...features]);      // substitute layer features with actual editing features ("cloned" to prevent layer actions duplicates, eg. addFeatures)

    this.addLockIds(lockids);                    // add lockIds
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

    const d = $.Deferred();

    let relations = [];

    // check if there are commit relations binded to new feature
    if (commit.add.length) {
      relations =
        Object
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
                childField: relation.getChildField()    // child Fields <Array>
              }
            };
          });
    }

    /** @TODO simplfy nested promises */
    this._layer
      .commit(commit)
      .then(p => {
        p
          .then(r => { this.applyCommitResponse(r, relations); d.resolve(r); })
          .fail(e => d.reject(e))
      })
      .fail(err => d.reject(err));

    return d.promise();
  }

  /**
   * start editing
   */
  start(options = {}) {
    const d = $.Deferred();

    /** @TODO simplfy nested promises */
    this
      .getFeatures(options)       // load layer features based on filter type
      .then(p => {
        p
          .then(features => {
            d.resolve(features);  // features are already inside featuresstore
            this._started = true; // if all ok set to started
          })
          .fail(d.reject)

      })
      .fail(d.reject);

    return d.promise()
  }

  /**
   * Add feature (action to layer)
   */
  _addFeature(feature) {
    this._featuresstore.addFeature(feature);
  };

  /**
   * Delete feature (action to layer)
   */
  _deleteFeature(feature) {
    this._featuresstore.deleteFeature(feature);
  }

  /**
   * Update feature (action to layer)
   */
  _updateFeature(feature) {
    this._featuresstore.updateFeature(feature);
  }

  /**
   * Set features (action to layer)
   */
  _setFeatures(features = []) {
    this._featuresstore.setFeatures(features);
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
    const d = $.Deferred();
    this._layer
      .unlock()
      .then(response => { this.clear(); d.resolve(response); })
      .fail(d.reject);
    return d.promise();
  }

  /**
   * run save layer
   */
  _save() {
    this._layer.save();
  }

  /**
   * @returns { boolean } whether has started editor 
   */
  isStarted() {
    return this._started;
  }

  /**
   * Method to clear all filled variable
   */
  clear() {
    this._started     = false;
    this._filter.bbox = null;
    this._allfeatures = false;

    this._featuresstore.clear();
    this._layer.getFeaturesStore().clear();

    // vector layer
    if (this._layer.getType() === Layer.LayerTypes.VECTOR) {
      this._layer.resetEditingSource(this._featuresstore.getFeaturesCollection());
    }
  }

}