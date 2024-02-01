const {base, inherit}  = g3wsdk.core.utils;
const EditingStep = require('./editingstep');
const AddHoleTask = require('./tasks/addholetask');
const AddHoleStep = function(options={}) {
  options.task = new AddHoleTask(options);
  options.help = "editing.steps.help.create_hole";
  base(this, options)
};

inherit(AddHoleStep, EditingStep);

module.exports = AddHoleStep;
