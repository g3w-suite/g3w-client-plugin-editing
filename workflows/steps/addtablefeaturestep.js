const {base, inherit} = g3wsdk.core.utils;
const Step = g3wsdk.core.workflow.Step;
const AddFeatureTableTask = require('./tasks/addfeaturetabletask');

const AddTableFeatureStep = function(options={}) {
  options.task = new AddFeatureTableTask(options);
  options.help = "editing.steps.help.new";
  base(this, options)
};

inherit(AddTableFeatureStep, Step);

module.exports = AddTableFeatureStep;
