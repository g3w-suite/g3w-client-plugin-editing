const inherit = g3wsdk.core.utils.inherit;
const base =  g3wsdk.core.utils.base;
const  Step = g3wsdk.core.workflow.Step;

const EditingStep = function(options={}) {
  base(this, options);
};

inherit(EditingStep, Step);

module.exports = EditingStep;
