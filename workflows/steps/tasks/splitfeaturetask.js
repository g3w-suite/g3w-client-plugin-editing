const inherit = g3wsdk.core.utils.inherit;
const base =  g3wsdk.core.utils.base;
const splitFeature = g3wsdk.core.geoutils.splitFeature;
const EditingTask = require('./editingtask');

function SplitFeatureTask(options={}){
  base(this, options);
}

inherit(SplitFeatureTask, EditingTask);

const proto = SplitFeatureTask.prototype;

proto.run = function({inputs, context}={}) {
  const d = $.Deferred();
  const { layer, features } = inputs;
  const source = layer.getEditingLayer().getSource();
  const layerId = layer.getId();
  const session = context.session;
  this._snapIteraction = new ol.interaction.Snap({
    source,
    edge: false
  });

  this._drawInteraction = new ol.interaction.Draw({
    type: 'LineString',
    features: new ol.Collection(),
  });

  this._drawInteraction.on('drawend', (evt)=> {
    const splitgeometry = evt.feature.getGeometry();
    const intersectGeometry = splitFeature({
      type: 'line',
      geometries: {
        split: splitgeometry,
        feature: features[0].getGeometry()
      }
    })
    const _feature = new ol.Feature({
      geometry: intersectGeometry
    })

    this.getMap().addLayer(new ol.layer.Vector({
      source: new ol.source.Vector({
        features: [_feature]
      })
    }))

    d.resolve(inputs)
  });
  this.addInteraction(this._drawInteraction);
  this.addInteraction(this._snapIteraction);
  return d.promise();
};
proto.stop = function(){
  this.removeInteraction(this._drawInteraction);
  this.removeInteraction(this._snapIteraction);
  this._drawInteraction = null;
  this._snapIteraction = null;
  return true;
};


module.exports = SplitFeatureTask;
