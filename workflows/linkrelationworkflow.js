const inherit = g3wsdk.core.utils.inherit;
const base =  g3wsdk.core.utils.base;
const EditingWorkflow = require('./editingworkflow');
const LinkRelationStep = require('./steps/linkrelationstep');

function LinkRelationWorflow(options={}) {
  options.steps = [new LinkRelationStep()];
  base(this, options);
}

inherit(LinkRelationWorflow, EditingWorkflow);

module.exports = LinkRelationWorflow;
