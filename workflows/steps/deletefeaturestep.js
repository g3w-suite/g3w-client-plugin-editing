const {base, inherit}  = g3wsdk.core.utils;
const EditingStep = require('./editingstep');
const DeleteFeatureTask = require('./tasks/deletefeaturetask');

const DeleteFeatureStep = function(options={}) {
  options.task = new DeleteFeatureTask();
  options.help = "editing.steps.help.double_click_delete";
  base(this, options)
};

inherit(DeleteFeatureStep, EditingStep);

module.exports = DeleteFeatureStep;
