var inherit = g3wsdk.core.utils.inherit;
var base =  g3wsdk.core.utils.base;
var EditingStep = require('./editingstep');
var DeleteFeatureTask = require('./tasks/deletefeaturetask');

var DeleteFeatureStep = function(options) {
  options = options || {};
  options.task = new DeleteFeatureTask();
  base(this, options)
};

inherit(DeleteFeatureStep, EditingStep);

module.exports = DeleteFeatureStep;
