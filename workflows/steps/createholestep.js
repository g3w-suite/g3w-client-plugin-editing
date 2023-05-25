const {base, inherit}  = g3wsdk.core.utils;
const EditingStep = require('./editingstep');
const CreateHoleTask = require('./tasks/createholetask');
const CreateHoleStep = function(options={}) {
  options.task = new CreateHoleTask(options);
  options.help = "editing.steps.help.create_hole";
  base(this, options)
};

inherit(CreateHoleStep, EditingStep);

module.exports = CreateHoleStep;
