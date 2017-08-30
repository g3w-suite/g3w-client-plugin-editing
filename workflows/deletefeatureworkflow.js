var inherit = g3wsdk.core.utils.inherit;
var base =  g3wsdk.core.utils.base;
var Workflow = g3wsdk.core.workflow.Workflow;
var DeleteFeatureStep = require('./steps/deletefeaturestep');
var ConfirmStep = require('./steps/confirmstep');

function DeleteFeatureWorflow(options) {
  options = options || {};
  options.steps = [new DeleteFeatureStep(), new ConfirmStep({
    type: 'delete'}
    )];
  base(this, options);
}

inherit(DeleteFeatureWorflow, Workflow);

var proto = DeleteFeatureWorflow.prototype;

module.exports = DeleteFeatureWorflow;