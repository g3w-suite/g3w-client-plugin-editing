var inherit = g3wsdk.core.utils.inherit;
var base =  g3wsdk.core.utils.base;
var EditingTask = require('./editingtask');

function MoveFeatureTask(options){
  this._layer = null;
  this.drawInteraction = null;
  base(this, options);
}

inherit(MoveFeatureTask, EditingTask);

var proto = MoveFeatureTask.prototype;

proto.run = function(inputs, context) {
  var d = $.Deferred();
  var session = context.session;
  var originalFeature = null;
  var originalStyle = inputs.layer.getStyle();
  var style = new ol.style.Style({
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
  var features = new ol.Collection(inputs.features);
  var feature = inputs.features[0];
  var layer = context.layer;
  var layerId = layer.getId();
  feature.setStyle(style);
  this._translateInteraction = new ol.interaction.Translate({
    features: features,
    hitTolerance: (isMobile && isMobile.any) ? 10 : 0
  });
  this.addInteraction(this._translateInteraction);

  this._translateInteraction.on('translatestart',function(e){
    var feature = e.features.getArray()[0];
    // repndo la feature di partenza
    originalFeature = feature.clone();
  });
  
  this._translateInteraction.on('translateend',function(e) {
    var feature = e.features.getArray()[0];
    var newFeature = feature.clone();
    session.pushUpdate(layerId, newFeature, originalFeature);
    // ritorno come output l'input layer che sarà modificato
    inputs.features.push(newFeature);
    feature.setStyle(originalStyle);
    d.resolve(inputs);
  });
  return d.promise()
};


proto.stop = function() {
  var d = $.Deferred();
  this.removeInteraction(this._translateInteraction);
  this._translateInteraction = null;
  d.resolve();
  return d.promise();
};



module.exports = MoveFeatureTask;