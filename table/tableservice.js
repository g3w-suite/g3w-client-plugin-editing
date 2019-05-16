const GUI = g3wsdk.gui.GUI;
const t = g3wsdk.core.i18n.tPlugin;

const TableService = function(options = {}) {
  this._features = options.features || []; // original features
  this._promise = options.promise;
  this._context = options.context;
  this._inputs = options.inputs;
  this._headers = options.headers;
  this._fatherValue = options.fatherValue;
  this._foreignKey = options.foreignKey;
  this._workflow = null;
  this.state = {
    features: [],
    isrelation: options.isrelation || false, //
    title: options.title || 'Link relation'
  };
  this.init = function() {
    //filter the original feature based on if is a relation
    this._features = !this.state.isrelation ? this._features : this._features.filter((feature) => {
      return feature.get(this._foreignKey) != this._fatherValue
    });
    // set values
    this._features.forEach((feature) => {
      const properties = feature.getProperties();
      this.state.features.push(properties);
    });
  };

  this.init();
};

const proto = TableService.prototype;

proto.isMediaField = function(name) {
  let isMedia = false;
  for (let i=0; i < this._headers.length; i++) {
    const header = this._headers[i];
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
      session.pushDelete(layerId, feature);
      this.state.features.splice(index, 1);
      this._features.splice(index, 1);
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
  return (editing_table_content_height * 70) / 100;
};



module.exports = TableService;
