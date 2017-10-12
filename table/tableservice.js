var GUI = g3wsdk.gui.GUI;
var EditTableFeatureWorkflow = require('../workflows/edittablefeatureworkflow');

var TableService = function(options) {
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

var proto = TableService.prototype;

proto._addFeatures = function(features) {
  var self = this;
  var features = !this.state.isrelation ? features : _.filter(features, function(feature) {
    return feature.get(self._foreignKey) != self._fatherValue
  });
  _.forEach(features, function(feature) {
    self.state.features.push(feature.getProperties());
  })
};

proto.save = function() {
  this._promise.resolve();
};

proto.cancel = function() {
  this._promise.reject();
};

proto.deleteFeature = function(index) {
  var self = this;
  GUI.dialog.confirm("Vuoi eliminare l'elemento selezionato?", function(result) {
    if (result) {
      var feature = self._Features[index];
      var session = self._context.session;
      var layerId = self._inputs.layer.getId();
      session.pushDelete(layerId, feature);
      self.state.features.splice(index, 1);
      self._Features.splice(index, 1);
    }
  });
};

proto.editFeature = function(index) {
  var self = this;
  var feature = this._Features[index];
  var workflow = new EditTableFeatureWorkflow();
  var inputs = this._inputs;
  inputs.features.push(feature);
  var options = {
    context: this._context,
    inputs: inputs
  };
  workflow.start(options)
    .then(function(outputs) {
      var feature = outputs.features[0];
      _.forEach(self.state.features[index], function(value, key) {
        self.state.features[index][key] = feature.get(key);
      });
      var pk = feature.getPk();
      self.state.features[index][pk] = feature.getId();
    })
    .fail(function() {
      
    })
};

proto.linkFeature = function(index) {
  var feature = this._Features[index];
  this._promise.resolve({
      features: [feature]
    });
};


module.exports = TableService;