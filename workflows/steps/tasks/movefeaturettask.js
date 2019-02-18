const inherit = g3wsdk.core.utils.inherit;
const base =  g3wsdk.core.utils.base;
const EditingTask = require('./editingtask');

function MoveFeatureTask(options){
  this._modifyInteraction = null;
  this._snapingInteraction = null;
  this._dependency = options.dependency;
  base(this, options);
}

inherit(MoveFeatureTask, EditingTask);

const proto = MoveFeatureTask.prototype;

proto.run = function(inputs, context) {
  const self = this;
  const d = $.Deferred();
  const session = context.session;
  const editingLayer = inputs.layer;
  const feature = inputs.features[0];
  const originalLayer = context.layer;
  const layerId = originalLayer.getId();
  const originalStyle = editingLayer.getStyle();
  const style = new ol.style.Style({
    fill: new ol.style.Fill({
      color: 'rgba(255, 255, 255, 0.2)'
    }),
    stroke: new ol.style.Stroke({
      color: '#ffcc33',
      width: 3
    }),
    image: new ol.style.Circle({
      radius: 7,
      fill: new ol.style.Fill({
        color: '#ffcc33'
      })
    })
  });
  const features = new ol.Collection(inputs.features);
  let originalFeature = null;
  feature.setStyle(style);
  this._modifyInteraction = new ol.interaction.Modify({
    features,
  });

  this.addInteraction(this._modifyInteraction);
  this._snapingInteraction = this.createSnapInteraction({
    dependency: this._dependency
  });

  this.addInteraction(this._snapingInteraction);
  this._modifyInteraction.on('modifystart',function(e){
    const feature = e.features.getArray()[0];
    // repndo la feature di partenza
    originalFeature = feature.clone();
  });

  this._modifyInteraction.on('modifyend',function(evt) {
    const pixel = evt.mapBrowserEvent.pixel;
    const feature = evt.features.getArray()[0];
    const map = this.getMap();
    const dependencyFeature = map.forEachFeatureAtPixel(pixel, (feature) => {
      return feature;
      }, {
      layerFilter: (layer) => {
        return !!self._dependency.find((dependency) => layer === dependency)
      }
    });
    if (dependencyFeature) {
      const newFeature = feature.clone();
      session.pushUpdate(layerId, newFeature, originalFeature);
      inputs.features.push(newFeature);
      feature.setStyle(originalStyle);
      self.removeFromOrphanNodes({
        layerId,
        id:originalFeature.getId()
      })
    } else {
      feature.setGeometry(originalFeature.getGeometry());
    }
    //self.checkOrphanNodes(self._dependency, editingLayer);
    d.resolve(inputs);
  });
  return d.promise()
};


proto.stop = function() {
  const d = $.Deferred();
  this.removeInteraction(this._snapingInteraction);
  this.removeInteraction(this._modifyInteraction);
  this._modifyInteraction = null;
  d.resolve();
  return d.promise();
};



module.exports = MoveFeatureTask;
