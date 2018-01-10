const GUI = g3wsdk.gui.GUI;

const TableService = function(options) {
  options = options || {};
  this._Features = options.features || []; // sono le features originali
  this._promise = options.promise;
  this._context = options.context;
  this._inputs = options.inputs;
  this._fatherValue = options.fatherValue;
  this._foreignKey = options.foreignKey;
  this.state = {
    features: [],
    isrelation: options.isrelation, // parametro che veine settato per visualizzare  o meno l'ambiente relzione o feature a se
    title: options.title
  };
  //vado a scrivere le feature (oggetti)
  this._addFeatures(this._Features);
};

const proto = TableService.prototype;

proto._addFeatures = function(features) {
  features = !this.state.isrelation ? features : _.filter(features, function(feature) {
    return feature.get(self._foreignKey) != self._fatherValue
  });
  features.forEach((feature) => {
    this.state.features.push(feature.getProperties());
  })
};

proto.save = function() {
  this._promise.resolve();
};

proto.cancel = function() {
  this._promise.reject();
};

proto.deleteFeature = function(index) {
  GUI.dialog.confirm("Vuoi eliminare l'elemento selezionato?", (result) => {
    if (result) {
      const feature = this._Features[index];
      const session = this._context.session;
      const layerId = this._inputs.layer.getId();
      session.pushDelete(layerId, feature);
      this.state.features.splice(index, 1);
      this._Features.splice(index, 1);
    }
  });
};

proto.editFeature = function(index) {
  const feature = this._Features[index];
  const EditTableFeatureWorkflow = require('../workflows/edittablefeatureworkflow');
  const workflow = new EditTableFeatureWorkflow();
  const inputs = this._inputs;
  inputs.features.push(feature);
  const options = {
    context: this._context,
    inputs: inputs
  };
  workflow.start(options)
    .then((outputs) => {
      const feature = outputs.features[0];
      Object.entries(self.state.features[index]).forEach(([key, value]) => {
        this.state.features[index][key] = feature.get(key);
      });
      const pk = feature.getPk();
      this.state.features[index][pk] = feature.getId();
    })
    .fail((err) => {})
};

proto.linkFeature = function(index) {
  const feature = this._Features[index];
  this._promise.resolve({
      features: [feature]
    });
};

proto._setLayout = function() {
  const editing_table_content_height = $('#editing_table').height();
  const height_85 = (editing_table_content_height * 85) / 100;
  const table_editing_height = $('#editing_table table').height();
  if (table_editing_height > editing_table_content_height) {
    $("#editing_table .nano").height(height_85);
  }
  $("#editing_table .nano").nanoScroller();
};



module.exports = TableService;
