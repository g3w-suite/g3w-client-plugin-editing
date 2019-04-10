const inherit = g3wsdk.core.utils.inherit;
const base =  g3wsdk.core.utils.base;
const EditingTask = require('./editingtask');

function MoveElementsTask(options={}){
  base(this,options);
}

inherit(MoveElementsTask, EditingTask);


const proto = MoveElementsTask.prototype;

proto.run = function(inputs, context) {
  const d = $.Deferred();
  const branchLayerId = this.getBranchLayerId();
  const branchFeatures = inputs[branchLayerId];
  if (branchFeatures) {
    const source = this.getBranchLayerSource();
    const session = this.getSessionByLayerId(branchLayerId);
    this._snapIteraction = new ol.interaction.Snap({
      source,
      edge: false
    });

    this._drawInteraction = new ol.interaction.Draw({
      type: 'Point',
      features: new ol.Collection()
    });

    this._drawInteraction.on('drawend', (evt)=> {
      const [x, y] = evt.feature.getGeometry().getCoordinates();
      const deltaXY = {};
      for (let i =0; i < branchFeatures.length; i++) {
        const feature = branchFeatures[i];
        if (!deltaXY.x) {
          const featureCoordinates = feature.getGeometry().getCoordinates();
          const [featureCoordinateX, featurecoordinateY] = featureCoordinates[0];
          deltaXY.x = x - featureCoordinateX;
          deltaXY.y = y - featurecoordinateY;
          if (deltaXY.x === 0 && deltaXY.y === 0 ) {
            const [featureCoordinateX, featurecoordinateY] = featureCoordinates[1];
            deltaXY.x = x - featureCoordinateX;
            deltaXY.y = y - featurecoordinateY;
          }
        } else
          break;
      }
      cloneAndAddFeatures({
        layerId: branchLayerId,
        features: branchFeatures,
        source
      });

      delete inputs[branchLayerId];

      for (let layerId in inputs) {
        const source = this.getLayerSource(layerId);
        const features = inputs[layerId];
        cloneAndAddFeatures({
          layerId,
          features,
          source
        })
      }

      function cloneAndAddFeatures ({layerId, features, source}) {
        for (let i =0; i < features.length; i++) {
          feature = features[i].clone();
          feature.setTemporaryId();
          feature.getGeometry().translate(deltaXY.x, deltaXY.y);
          source.addFeature(feature);
          session.pushAdd(layerId, feature);
        }
      }

      this.checkOrphanNodes();
      d.resolve()
    });
    this.addInteraction(this._drawInteraction);
    this.addInteraction(this._snapIteraction);
  } else {
    d.reject()
  }
  return d.promise();
};
proto.stop = function(){
  this.removeInteraction(this._drawInteraction);
  this.removeInteraction(this._snapIteraction);
  this._drawInteraction = null;
  this._snapIteraction = null;
  return true;
};


module.exports = MoveElementsTask;
