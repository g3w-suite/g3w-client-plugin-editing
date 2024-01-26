import { EditingWorkflow } from '../g3wsdk/workflow/workflow';
import { cloneFeature }    from '../utils/cloneFeature';
import {
  OpenFormStep,
  AddTableFeatureStep,
}                          from '../workflows';

Object
  .entries({
    cloneFeature,
    EditingWorkflow,
    OpenFormStep,
    AddTableFeatureStep,
  })
  .forEach(([k, v]) => console.assert(undefined !== v, `${k} is undefined`));

const { base, inherit } = g3wsdk.core.utils;
const { G3WObject }     = g3wsdk.core;
const { GUI }           = g3wsdk.gui;
const t                 = g3wsdk.core.i18n.tPlugin;

/**
 *
 * @param options
 * @constructor
 */
const TableService = function(options = {}) {
  this._features = options.features || []; // original features
  this._promise = options.promise;
  this._context = options.context;
  this._inputs = options.inputs;
  this._layerId = options.inputs.layer.getId();
  this._fatherValue = options.fatherValue;
  this._foreignKey = options.foreignKey;
  this._workflow = null;
  this._deleteFeaturesIndexes = [];
  this._isrelation = options.isrelation || false;

  const {
    capabilities,
    headers=[],
    title='Link relation',
    push:isrelation
  } = options;

  this.state = {
    headers,
    features: [],
    title ,
    isrelation,
    capabilities
  };

  /**
   * Init function service
   *
   */
  this.init = function() {
    const EditingService = require('./editingservice');
    //filter the original feature based on if is a relation
    if (this._isrelation) {
      this._features.filter(feature => feature.get(this._foreignKey) !== this._fatherValue);
    }

    // set values
    if (this._features.length > 0) {
      const baseFeature = this._features[0];

      //get properties of the feature
      const properties = Object.keys(baseFeature.getProperties());

      //set headers of table
      this.state.headers = this.state.headers
        .filter(header => properties.indexOf(header.name) !== -1);

      //extract get headers name
      const headers = this.state.headers.map(header => header.name);
      const features = this._features;
      //check
      this.state.features = features.map(feature => {
        const orderedProperties = {};
        headers.forEach(header => {
          orderedProperties[header] = EditingService.getFeatureTableFieldValue({
            layerId: this._layerId,
            feature,
            property: header
          })
        });
        //set private attribute unique value
        orderedProperties.__gis3w_feature_uid = feature.getUid();
        return orderedProperties;
      });
    }
  };

  this.init();

  base(this);
};

inherit(TableService, G3WObject);

const proto = TableService.prototype;

/**
 *
 * @param name
 * @returns {boolean}
 */
proto.isMediaField = function(name) {
  let isMedia = false;
  for (let i=0; i < this.state.headers.length; i++) {
    const header = this.state.headers[i];
    if (header.name === name && header.input.type === 'media' ) {
      isMedia = true;
      break;
    }
  }
  return isMedia;
};

/**
 *
 */
proto.save = function() {
  this._promise.resolve();
};


/**
 *
 */
proto.cancel = function() {
  this._promise.reject();
};
/**
 *
 * @param uid feature uid
 * @returns {Promise<unknown>}
 */
proto.deleteFeature = function(uid) {
  const EditingService = require('./editingservice');
  const layer = this._inputs.layer;
  const layerId = layer.getId();
  const childRelations = layer.getChildren();
  const relationinediting = childRelations.length && EditingService._filterRelationsInEditing({
    layerId,
    relations: layer.getRelations().getArray()
  }).length > 0;

  return new Promise((resolve, reject) =>{
    GUI.dialog.confirm(
      `<h4>${t('editing.messages.delete_feature')}</h4>
      <div style="font-size:1.2em;">${ relationinediting ?t('editing.messages.delete_feature_relations') : ''}</div>`,
      (result) => {
        if (result) {
          const index   = this._features.findIndex(f => f.getUid() === uid);
          const session = this._context.session;
          const layerId = this._inputs.layer.getId();
          this._inputs.layer.getEditingSource().removeFeature(feature);
          session.pushDelete(layerId, feature);
          this.state.features.splice(index, 1);
          resolve()
        } else {
          reject()
        }
    });
  })
};

/**
 *Copy feature tool from another table feature
 * @param uid
 * @returns {Promise<unknown>}
 */
proto.copyFeature = function(uid) {
  const EditingService = require('./editingservice');
  return new Promise((resolve, reject) => {
    const feature = cloneFeature(
      this._features.find(f => f.getUid() === uid),
      this._inputs.layer.getEditingLayer()
    );
    /** ORIGINAL SOURCE: g3w-client-plugin-editing/workflows/addtablefeatureworkflow.js@v3.7.1 */
    this._workflow = new EditingWorkflow({
        ...options,
        type: 'addtablefeature',
        steps: [
          new AddTableFeatureStep(),
          new OpenFormStep(),
        ],
      });
    this._inputs.features.push(feature);
    this._workflow.start({
      context: this._context,
      inputs: this._inputs
    })
      .then(outputs => {
        const feature = outputs.features[outputs.features.length -1];
        const newFeature = {};
        Object.entries(this.state.features[0]).forEach(([key, value]) => {
          newFeature[key] = EditingService.getFeatureTableFieldValue({
            layerId: this._layerId,
            feature,
            property: key
          });
        });
        newFeature.__gis3w_feature_uid = feature.getUid();
        this.state.features.push(newFeature);
        resolve(newFeature)
      })
      .fail(reject)
      .always(() => {
        /** @TODO check input.features that grow in number */
        console.log('here we are')
      })

  })
};

/**
 *
 * @param uid
 */
proto.editFeature = function(uid) {

  const EditingService = require('./editingservice');

  const index = this._features.findIndex(f => f.getUid() === uid);

  const feature = this._features[index];

  /** ORIGINAL SOURCE: g3w-client-plugin-editing/workflows/edittablefeatureworkflow.js@v3.7.1 */
  this._workflow = new EditingWorkflow({ type: 'edittablefeature', steps: [ new OpenFormStep() ] });

  const inputs = this._inputs;

  inputs.features.push(feature);

  this._workflow
    .start({
      context: this._context,
      inputs
    })
    .then(outputs => {
      const feature = outputs.features[outputs.features.length -1];
      Object
        .entries(this.state.features[index])
        .forEach(([key, _]) => {
          this.state.features[index][key] = EditingService.getFeatureTableFieldValue({
            layerId: this._layerId,
            feature,
            property: key
          });
      });
    })
    .fail(console.warn)
    .always(() =>  this._workflow.stop())
};

/**
 * @param ids features indexes
 */
proto.linkFeatures = function(ids = []) {
  this._promise.resolve({ features: ids.map(index => this._features[index]) })
};

/**
 * @param index
 */
proto.linkFeature = function(index) {
  this._promise.resolve({ features: [this._features[index]] });
};

module.exports = TableService;
