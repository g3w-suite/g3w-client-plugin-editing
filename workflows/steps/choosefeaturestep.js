const {base, inherit}  = g3wsdk.core.utils;
const { Step }  = g3wsdk.core.workflow;
const ChooseFeatureTask = require('./tasks/choosefeaturetask');

//creato uno step per apriore il form
const ChooseFeatureStep = function(options={}) {
  options.task = new ChooseFeatureTask(options);
  base(this, options)
};

inherit(ChooseFeatureStep, Step);

module.exports = ChooseFeatureStep;
