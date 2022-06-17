const {base, inherit} = g3wsdk.core.utils;
const EditingWorkflow = require('./editingworkflow');
const LinkRelationStep = require('./steps/linkrelationstep');

function LinkRelationWorflow(options={}) {
  options.steps = [new LinkRelationStep()];
  base(this, options);
}

inherit(LinkRelationWorflow, EditingWorkflow);

module.exports = LinkRelationWorflow;
