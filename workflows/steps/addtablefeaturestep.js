const {base, inherit}  = g3wsdk.core.utils;
const { Step }  = g3wsdk.core.workflow;
const AddFeatureTableTask = require('./tasks/addfeaturetabletask');

//creato uno step per apriore il form
var AddTableFeatureStep = function(options={}) {
  options.task = new AddFeatureTableTask();
  options.help = "editing.steps.help.new";
  base(this, options)
};

inherit(AddTableFeatureStep, Step);

module.exports = AddTableFeatureStep;
