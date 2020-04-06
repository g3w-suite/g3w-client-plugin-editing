const inherit = g3wsdk.core.utils.inherit;
const base =  g3wsdk.core.utils.base;
const EditingTask = require('./editingtask');

function MoveFeatureTask(options){
  this.drawInteraction = null;
  base(this, options);
}

inherit(MoveFeatureTask, EditingTask);

const proto = MoveFeatureTask.prototype;

proto.run = function(inputs, context) {
  const d = $.Deferred();
  const originalLayer = inputs.layer;
  const session = context.session;
  const editingLayer = originalLayer.geteditingLayer();
  const feature = inputs.features[0];
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
  this._translateInteraction = new ol.interaction.Translate({
    features: features,
    hitTolerance: (isMobile && isMobile.any) ? 10 : 0
  });
  this.addInteraction(this._translateInteraction);

  this._translateInteraction.on('translatestart',function(e){
    const feature = e.features.getArray()[0];
    // repndo la feature di partenza
    originalFeature = feature.clone();
  });
  
  this._translateInteraction.on('translateend',function(e) {
    const feature = e.features.getArray()[0];
    const newFeature = feature.clone();
    session.pushUpdate(layerId, newFeature, originalFeature);
    // ritorno come output l'input layer che sarà modificato
    inputs.features.push(newFeature);
    feature.setStyle(originalStyle);
    d.resolve(inputs);
  });
  return d.promise()
};


proto.stop = function() {
  const d = $.Deferred();
  this.removeInteraction(this._translateInteraction);
  this._translateInteraction = null;
  d.resolve();
  return d.promise();
};



module.exports = MoveFeatureTask;
