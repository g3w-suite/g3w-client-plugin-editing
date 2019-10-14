const inherit = g3wsdk.core.utils.inherit;
const base =  g3wsdk.core.utils.base;
const EditingStep = require('./editingstep');
const SwitchLineDirectionTask = require('./tasks/switchlinedirectiontask');

//creato uno step per permettere di fare il pickfeature
const PickFeatureStep = function(options={}) {
  const task = new SwitchLineDirectionTask(options);
  options.task = task ;
  base(this, options)
};

inherit(PickFeatureStep, EditingStep);

module.exports = PickFeatureStep;
