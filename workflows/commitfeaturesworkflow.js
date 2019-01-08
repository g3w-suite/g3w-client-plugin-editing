var inherit = g3wsdk.core.utils.inherit;
var base =  g3wsdk.core.utils.base;
var EditingWorkflow = require('./editingworkflow');
var ConfirmStep = require('./steps/confirmstep');

function CommitFeatureWorflow(options={}) {
  options.steps = [new ConfirmStep(options)];
  base(this, options);
}

inherit(CommitFeatureWorflow, EditingWorkflow);

var proto = CommitFeatureWorflow.prototype;

module.exports = CommitFeatureWorflow;
