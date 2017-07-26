var inherit = g3wsdk.core.utils.inherit;
var base =  g3wsdk.core.utils.base;
var Step = g3wsdk.core.workflow.Step;

var EditingStep = function(options) {
  base(this, options)
};

inherit(EditingStep, Step);

module.exports = EditingStep;
