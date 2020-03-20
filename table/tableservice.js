const GUI = g3wsdk.gui.GUI;
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
  this._isrelation = options.isrelation  || false;
  this.state = {
    headers: options.headers || [],
    features: [],
    title: options.title || 'Link relation',
    isrelation: this._isrelation
  };

  this.init = function() {
    //filter the original feature based on if is a relation
    this._features = !this._isrelation ? this._features : this._features.filter(feature =>
      feature.get(this._foreignKey) !== this._fatherValue
    );
    // set values
    if (this._features.length) {
      const properties = Object.keys(this._features[0].getProperties());
      this.state.headers = this.state.headers.filter(header => properties.indexOf(header.name) !== -1);
      this.state.features = this._features.map(feature => feature.getProperties());
    }
  };

  this.init();
};

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

proto.deleteFeature = function(index) {
  GUI.dialog.confirm(t('editing.messages.delete_feature'), (result) => {
    if (result) {
      const feature = this._features[index];
      const session = this._context.session;
      const layerId = this._inputs.layer.getId();
      this._inputs.layer.getSource().removeFeature(feature);
      session.pushDelete(layerId, feature);
      this.state.features.splice(index, 1);
    }
  });
};

proto.editFeature = function(index) {
  const feature = this._features[index];
  const EditTableFeatureWorkflow = require('../workflows/edittablefeatureworkflow');
  this._workflow = new EditTableFeatureWorkflow();
  const inputs = this._inputs;
  inputs.features.push(feature);
  const options = {
    context: this._context,
    inputs: inputs
  };
  this._workflow.start(options)
    .then((outputs) => {
      const feature = outputs.features[0];
      Object.entries(this.state.features[index]).forEach(([key, value]) => {
        this.state.features[index][key] = feature.get(key);
      });
      const pk = feature.getPk();
      this.state.features[index][pk] = feature.getId();
    })
    .fail((err) => {})
};

proto.linkFeature = function(index) {
  const feature = this._features[index];
  this._promise.resolve({
      features: [feature]
    });
};

proto._setLayout = function() {
  const editing_table_content_height = $('#editing_table').height();
  return  (editing_table_content_height * 70) / 100;
};



module.exports = TableService;
