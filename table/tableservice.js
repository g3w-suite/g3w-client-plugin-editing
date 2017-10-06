var EditTableFeatureWorkflow = require('../workflows/edittablefeatureworkflow');
var TableService = function(options) {
  options = options || {};
  this._Features = options.features || []; // sono el features originali
  this._promise = options.promise;
  this._context = options.context;
  this._inputs = options.inputs;
  this.state = {
    features: []
  };
  this.addFeatures(this._Features);

};

var proto = TableService.prototype;

proto.addFeatures = function(features) {
  var self = this;
  _.forEach(features, function(feature) {
    self.state.features.push(feature.getProperties())
  })
};

proto.addFeature = function(feature) {
  this.state.features.push(feature);
};

proto.save = function() {
  this._promise.resolve();
};

proto.cancel = function() {
  this._promise.reject();
};

proto.deleteFeature = function(index) {
  var feature = this._Features[index];
  var session = this._context.session;
  var layerId = this._inputs.layer.getId();
  session.pushDelete(layerId, feature);
  this.state.features.splice(index, 1);
};

proto.editFeature = function(index) {
  var feature = this._Features[index];
  var workflow = new EditTableFeatureWorkflow();
  var inputs = this._inputs;
  inputs.features.push(feature);
  var options = {
    context: this._context,
    inputs: inputs
  };
  workflow.start(options)
  
};

module.exports = TableService;