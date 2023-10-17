const {GUI} = g3wsdk.gui;
const {base, inherit} =  g3wsdk.core.utils;

const EditingTask = require('./editingtask');

function DeleteHoleTask(options={}) {
  /**
   *
   * @param event
   * @returns {boolean|void}
   * @private
   */
  base(this, options);
}

inherit(DeleteHoleTask, EditingTask);

const proto = DeleteHoleTask.prototype;

proto.run = function(inputs, context) {
  const d = $.Deferred();
  const originalLayer = inputs.layer;
  const session = context.session;
  const layerId = originalLayer.getId();
  const originalGeometryType = originalLayer.getEditingGeometryType();
  console.log(inputs.features)
  promise.resolve()

  return d.promise();
};

proto.stop = function() {
  return true;
};

module.exports = DeleteHoleTask;
