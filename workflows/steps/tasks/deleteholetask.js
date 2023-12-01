import { deleteHoleFromPolygonGeometry } from '../../../utils/deleteHoleFromPolygonGeometry';

const {base, inherit} =  g3wsdk.core.utils;

const EditingTask     = require('./editingtask');

function DeleteHoleTask(options={}) {
  /**
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
  inputs.features.forEach(fh => {
    const featureId    = fh.get('featureId'); //get id of the feature that has a hole
    const holeIndex    = fh.get('holeIndex');
    const polygonIndex = fh.get('polygonIndex');
    //get feature
    const feature = originalLayer.getEditingSource().getFeatureById(featureId);
    //cole original feature
    const originalFeature = feature.clone();
    //change geometry
    feature.setGeometry(deleteHoleFromPolygonGeometry({
      geometry: feature.getGeometry(),
      holeIndex,
      polygonIndex,
    }));

    session.pushUpdate(layerId, feature, originalFeature);
    d.resolve(inputs);
  })

  return d.resolve();
};

proto.stop = function() {
  return true;
};

module.exports = DeleteHoleTask;
