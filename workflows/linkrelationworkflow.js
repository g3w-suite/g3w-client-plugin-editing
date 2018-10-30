var inherit = g3wsdk.core.utils.inherit;
var base =  g3wsdk.core.utils.base;
var EditingWorkflow = require('./editingworkflow');
var LinkRelationStep = require('./steps/linkrelationstep');

function LinkRelationWorflow(options) {
  options = options || {};
  options.steps = [new LinkRelationStep()];
  base(this, options);
}

inherit(LinkRelationWorflow, EditingWorkflow);

module.exports = LinkRelationWorflow;