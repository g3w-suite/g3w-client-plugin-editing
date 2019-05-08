const inherit = g3wsdk.core.utils.inherit;
const base =  g3wsdk.core.utils.base;
const EditingTask = require('./editingtask');

function MoveElementsTask(options={}){
  base(this,options);
}

inherit(MoveElementsTask, EditingTask);


const proto = MoveElementsTask.prototype;

proto.run = function(inputs) {
  const d = $.Deferred();
  const {layersFeaturesSelected, coordinates} = inputs;
  const branchLayerId = this.getBranchLayerId();
  const branchFeatures = layersFeaturesSelected[branchLayerId];
  if (branchFeatures) {
    const source = this.getBranchLayerSource();
    const session = this.getSessionByLayerId(branchLayerId);
    this._snapIteraction = new ol.interaction.Snap({
      source,
      edge: false
    });

    this._drawInteraction = new ol.interaction.Draw({
      type: 'Point',
      features: new ol.Collection(),
      condition: function(evt) {
        const coordinates = evt.coordinate;
        return !!source.getFeatures().find((feature) => {
          const featureCoordinates = feature.getGeometry().getCoordinates();
          return (featureCoordinates[0].toString() === coordinates.toString() || featureCoordinates[1].toString() === coordinates.toString())
        })
      }
    });

    this._drawInteraction.on('drawend', (evt)=> {
      const [x, y] = evt.feature.getGeometry().getCoordinates();
      const deltaXY = {
        x: x - coordinates[0],
        y: y - coordinates[1]
      };
      const oldIdNewIdBranch = {};
      let LayerIds = Object.keys(layersFeaturesSelected);
      // necessito di avere come primo id qeullo dei branches
      if (LayerIds[0] !== branchLayerId) {
        LayerIds = LayerIds.filter((id) => !id !== branchLayerId);
        LayerIds.unshift(branchLayerId)
      }
      for (let i= 0, len=LayerIds.length; i < len; i++) {
        const layerId = LayerIds[i];
        const source = this.getLayerSource(layerId);
        const features = layersFeaturesSelected[layerId];
        for (let i =0; i < features.length; i++) {
          const feature = features[i].clone();
          if (layerId === branchLayerId) {
            const oldId = feature.getId();
            oldIdNewIdBranch[oldId] = null;
            feature.setTemporaryId();
            oldIdNewIdBranch[oldId] = feature.getId();
            this.setBranchProfileData({
              feature,
              update: false
            });
          }  else {
            feature.setTemporaryId();
            this.updateFeatureBranchId({
              feature,
              branchIds: oldIdNewIdBranch
            });
          }
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
