const {base, inherit}  = g3wsdk.core.utils;
const EditingStep = require('./editingstep');
const ConfirmTask = require('./tasks/confirmtask');

const ConfirmStep = function(options={}) {
  options.task = new ConfirmTask(options);
  base(this, options)
};

inherit(ConfirmStep, EditingStep);

module.exports = ConfirmStep;
