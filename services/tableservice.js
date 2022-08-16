const {base, inherit} = g3wsdk.core.utils;
const {G3WObject} = g3wsdk.core;
const {GUI} = g3wsdk.gui;
const t = g3wsdk.core.i18n.tPlugin;

const TableService = function(options = {}) {
  this._features = options.features || []; // original features
  this._promise = options.promise;
  this._context = options.context;
  this._inputs = options.inputs;
  this._fatherValue = options.fatherValue;
  this._foreignKey = options.foreignKey;
  this._workflow = null;
  this._deleteFeaturesIndexes = [];
  this._isrelation = options.isrelation || false;
  const { capabilities, headers=[], title='Link relation', push:isrelation } = options;
  this.state = {
    headers,
    features: [],
    title ,
    isrelation,
    capabilities
  };

  this.init = function() {
    //filter the original feature based on if is a relation
    this._features = !this._isrelation ? this._features : this._features.filter(feature =>
      feature.get(this._foreignKey) !== this._fatherValue
    );
    // set values
    if (this._features.length) {
      const baseFeature = this._features[0];
      const properties = Object.keys(baseFeature.getProperties());
      this.state.headers = this.state.headers.filter(header => properties.indexOf(header.name) !== -1);
      const headers = this.state.headers.map(header => header.name);
      this.state.features = this._features.map(feature => {
        const properties = feature.getProperties();
        const orderedProperties = {};
        headers.forEach(header => {
          orderedProperties[header] = properties[header]
        });
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

proto.save = function() {
  this._promise.resolve();
};

proto.cancel = function() {
  this._promise.reject();
};

proto.deleteFeature = function(uid) {
  const EditingService = require('./editingservice');
  const layer = this._inputs.layer;
  const layerId = layer.getId();
  const childRelations = layer.getChildren();
  const relationinediting = childRelations.length &&  EditingService._filterRelationsInEditing({
    layerId,
    relations: layer.getRelations().getArray()
  }).length > 0;
  return new Promise((resolve, reject) =>{
    GUI.dialog.confirm(`<h4>${t('editing.messages.delete_feature')}</h4>
                        <div style="font-size:1.2em;">${ relationinediting ?t('editing.messages.delete_feature_relations') : ''}</div>`, (result) => {
      if (result) {
        let index;
        const feature = this._features.find((feature, featureIdx) => {
          if (feature.getUid() === uid) {
            index = featureIdx;
            return true;
          }
        });
        const session = this._context.session;
        const layerId = this._inputs.layer.getId();
        this._inputs.layer.getEditingSource().removeFeature(feature);
        session.pushDelete(layerId, feature);
        this.state.features.splice(index, 1);
        resolve()
      } else reject()
    });
  })
};

proto.copyFeature = function(uid){
  return new Promise((resolve, reject) =>{
    const feature = this._features.find(feature => feature.getUid() === uid).cloneNew();
    const addTableFeatureWorflow = require('../workflows/addtablefeatureworkflow');
    this._workflow = new addTableFeatureWorflow();
    const inputs = this._inputs;
    inputs.features.push(feature);
    const options = {
      context: this._context,
      inputs
    };
    this._workflow.start(options)
      .then(outputs => {
        const feature = outputs.features[outputs.features.length -1];
        const newFeature = {};
        Object.entries(this.state.features[0]).forEach(([key, value]) => {
          newFeature[key] = feature.get(key);
        });
        newFeature.__gis3w_feature_uid = feature.getUid();
        this.state.features.push(newFeature);
        resolve(newFeature)
      })
      .fail(err => reject(err));
  })
};

proto.editFeature = function(uid) {
  let index;
  const feature = this._features.find((feature, featureIndex) => {
    if (feature.getUid() === uid) {
      index = featureIndex;
      return true;
    }
  });
  const EditTableFeatureWorkflow = require('../workflows/edittablefeatureworkflow');
  this._workflow = new EditTableFeatureWorkflow();
  const inputs = this._inputs;
  inputs.features.push(feature);
  const options = {
    context: this._context,
    inputs
  };
  this._workflow.start(options)
    .then(outputs => {
      const feature = outputs.features[outputs.features.length -1];
      Object.entries(this.state.features[index]).forEach(([key, value]) => {
        this.state.features[index][key] = feature.get(key);
      });
    })
    .fail((err) => {})
};

proto.linkFeatures = function(featuresIndex=[]){
  const features = featuresIndex.map(index => this._features[index]);
  this._promise.resolve({
    features
  })
};

proto.linkFeature = function(index) {
  const feature = this._features[index];
  this._promise.resolve({
      features: [feature]
    });
};

module.exports = TableService;
