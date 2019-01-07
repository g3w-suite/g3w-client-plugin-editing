const inherit = g3wsdk.core.utils.inherit;
const base =  g3wsdk.core.utils.base;
const EditingTask = require('./editingtask');

function ModifyGeometryVertexTask(options={}){
  this.drawInteraction = null;
  this._originalStyle = null;
  this._features = null;
  this._deleteCondition = options.deleteCondition || undefined;
  this._snap = options.snap === false ? false : true;
  this._snapInteraction = null;
  this._dependency = options.dependency;
  base(this, options);
}

inherit(ModifyGeometryVertexTask, EditingTask);

const proto = ModifyGeometryVertexTask.prototype;

proto.run = function(inputs, context) {
  const self = this;
  const d = $.Deferred();
  const editingLayer = inputs.layer;
  this._features = inputs.features;
  const session = context.session;
  const originalLayer = context.layer;
  const layerId = originalLayer.getId();
  const dependencySession = context.dependency.session;
  const originalFeatures = [];
  let dependencyOriginalFeature;
  let dependencyFeature;
  let startKey;
  this._originalStyle = editingLayer.getStyle();
  const style = [
    new ol.style.Style({
      stroke : new ol.style.Stroke({
        color : "grey",
        width: 3
      })
    }),
    new ol.style.Style({
      image: new ol.style.Circle({
        radius: 5,
        fill: new ol.style.Fill({
          color: 'orange'
        })
      }),
      geometry: function(feature) {
        // return the coordinates of the first ring of the polygon
        var coordinates = feature.getGeometry().getCoordinates()[0];
        return new ol.geom.MultiPoint(coordinates);
      }
    })
  ];
  this._features.forEach((feature) => {
    feature.setStyle(style)
  });
  const features = new ol.Collection(inputs.features);
  const dependencyFeatures = this._dependency.getSource().getFeatures();
  this._modifyInteraction = new ol.interaction.Modify({
    features,
    insertVertexCondition: () => false,
    deleteCondition: this._deleteCondition
  });

  this.addInteraction(this._modifyInteraction);

  this._modifyInteraction.on('modifystart', function(evt) {
    const pixel = evt.mapBrowserEvent.pixel;
    const features = evt.features.getArray();
    if (dependencyFeatures.length) {
      const map = this.getMap();
      dependencyFeature = map.forEachFeatureAtPixel(pixel, (feature) => {
        return feature;
      }, {
        layerFilter: (layer) => {
          return layer === self._dependency
        }
      });
      if (dependencyFeature) {
        dependencyOriginalFeature = dependencyFeature.clone();
        startKey = map.on('pointerdrag', (evt) => {
          dependencyFeature.getGeometry().setCoordinates(evt.coordinate)
        })
      }
    }
    features.forEach((feature) => {
      originalFeatures.push(feature.clone())
    })
  });

  this._modifyInteraction.on('modifyend',function(e) {
    const features = e.features.getArray();
    const featuresLength = features.length;
    for (let i = 0; i < featuresLength; i++) {
      const feature = features[i];
      const originalFeature = originalFeatures[i];
      if (feature.getGeometry().getExtent() !== originalFeature.getGeometry().getExtent()) {
        const newFeature = feature.clone();
        session.pushUpdate(layerId, newFeature, originalFeature);
        inputs.features.push(newFeature);
      }
    }
    dependencyFeature && dependencySession.pushUpdate(dependencySession.getId(), dependencyFeature, dependencyOriginalFeature);
    ol.Observable.unByKey(startKey);
    d.resolve(inputs);
  });

  /*if (this._snap) {
    this._snapInteraction = new ol.interaction.Snap({
      source: editingLayer.getSource()
    });
    this.addInteraction(this._snapInteraction);
  }*/

  return d.promise();
};



proto.stop = function(){
  if (this._snapInteraction) {
     this.removeInteraction(this._snapInteraction);
     this._snapInteraction = null;
  }
  this._features.forEach((feature) => {
    feature.setStyle(this._originalStyle);
  });
  this.removeInteraction(this._modifyInteraction);
  this._modifyInteraction = null;
  return true;
};

proto.removePoint = function(coordinate){
  if (this._modifyInteraction) {
    // provo a rimuovere l'ultimo punto. Nel caso non esista la geometria gestisco silenziosamente l'errore
    try{
      this._modifyInteraction.removePoint();
    }
    catch (e){
      console.log(e);
    }
  }
};

proto._isNew = function(feature){
  return (!_.isNil(this.editingLayer.getSource().getFeatureById(feature.getId())));
};

module.exports = ModifyGeometryVertexTask;
