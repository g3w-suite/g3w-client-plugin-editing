var inherit = g3wsdk.core.utils.inherit;
var base =  g3wsdk.core.utils.base;
var Workflow = g3wsdk.core.workflow.Workflow;
var ConfirmStep = require('./steps/confirmstep');

function CommitFeatureWorflow(options) {
  options = options || {};
  options.steps = [new ConfirmStep(options)];
  base(this, options);
}

inherit(CommitFeatureWorflow, Workflow);

var proto = CommitFeatureWorflow.prototype;

module.exports = CommitFeatureWorflow;