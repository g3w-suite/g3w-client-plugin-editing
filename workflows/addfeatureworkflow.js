var inherit = g3wsdk.core.utils.inherit;
var base =  g3wsdk.core.utils.base;
var EditingWorkflow = require('./editingworkflow');
var AddFeatureStep = require('./steps/addfeaturestep');
var OpenFormStep = require('./steps/openformstep');

function AddFeatureWorflow(options) {
  options = options || {};
  options.steps = [new AddFeatureStep(), new OpenFormStep()];
  base(this, options);
}

inherit(AddFeatureWorflow, EditingWorkflow);

var proto = AddFeatureWorflow.prototype;

module.exports = AddFeatureWorflow;