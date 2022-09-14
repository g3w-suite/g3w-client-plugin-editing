const {base, inherit}  = g3wsdk.core.utils;
const { Step }  = g3wsdk.core.workflow;

const EditingStep = function(options={}) {
  base(this, options);
};

inherit(EditingStep, Step);

module.exports = EditingStep;
