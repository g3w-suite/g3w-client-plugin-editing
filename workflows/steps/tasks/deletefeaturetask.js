var inherit = g3wsdk.core.utils.inherit;
var base =  g3wsdk.core.utils.base;
var DeleteInteraction = g3wsdk.ol3.interactions.DeleteFeatureInteraction;
var EditingTask = require('./editingtask');

function DeleteFeatureTask(options) {
  this.drawInteraction = null;
  this._selectInteraction = null;
  this._layer = null;
  this.setters = {
    deleteFeature: proto._deleteFeature
  };
  base(this, options);
}

inherit(DeleteFeatureTask, EditingTask);


var proto = DeleteFeatureTask.prototype;

/* BRUTTISSIMO! Tocca ridefinire tutte le parti internet di OL3 non esposte dalle API */

ol.geom.GeometryType = {
  POINT: 'Point',
  LINE_STRING: 'LineString',
  LINEAR_RING: 'LinearRing',
  POLYGON: 'Polygon',
  MULTI_POINT: 'MultiPoint',
  MULTI_LINE_STRING: 'MultiLineString',
  MULTI_POLYGON: 'MultiPolygon',
  GEOMETRY_COLLECTION: 'GeometryCollection',
  CIRCLE: 'Circle'
};


var white = [255, 255, 255, 1];
var blue = [0, 153, 255, 1];
var red = [255, 0, 0, 1];
var width = 3;

//vado a definre lo stile della feature selezionata per essere cancellata
var styles = {};
styles[ol.geom.GeometryType.POLYGON] = [
  new ol.style.Style({
    stroke: new ol.style.Stroke({
      color: 'red',
      width: 3
    }),
    fill: new ol.style.Fill({
      color: 'rgba(255, 0, 0, 0.1)'
    })
  })
];
styles[ol.geom.GeometryType.MULTI_POLYGON] = styles[ol.geom.GeometryType.POLYGON];

styles[ol.geom.GeometryType.LINE_STRING] = [
  new ol.style.Style({
    stroke: new ol.style.Stroke({
      color: white,
      width: width + 2
    })
  }),
  new ol.style.Style({
    stroke: new ol.style.Stroke({
      color: red,
      width: width
    })
  })
];

styles[ol.geom.GeometryType.MULTI_LINE_STRING] = styles[ol.geom.GeometryType.LINE_STRING];

styles[ol.geom.GeometryType.CIRCLE] = styles[ol.geom.GeometryType.POLYGON].concat(styles[ol.geom.GeometryType.LINE_STRING]);

styles[ol.geom.GeometryType.POINT] = [
  new ol.style.Style({
    image: new ol.style.Circle({
      radius: width * 2,
      fill: new ol.style.Fill({
        color: red
      }),
      stroke: new ol.style.Stroke({
        color: white,
        width: width / 2
      })
    }),
    zIndex: Infinity
  })
];
styles[ol.geom.GeometryType.MULTI_POINT] = styles[ol.geom.GeometryType.POINT];

styles[ol.geom.GeometryType.GEOMETRY_COLLECTION] = styles[ol.geom.GeometryType.POLYGON].concat(styles[ol.geom.GeometryType.LINE_STRING], styles[ol.geom.GeometryType.POINT]);

styles[ol.geom.GeometryType.POLYGON] = _.concat(styles[ol.geom.GeometryType.POLYGON],styles[ol.geom.GeometryType.LINE_STRING]);

styles[ol.geom.GeometryType.GEOMETRY_COLLECTION] = _.concat(styles[ol.geom.GeometryType.GEOMETRY_COLLECTION],styles[ol.geom.GeometryType.LINE_STRING]);
    
/* FINE BRUTTISSIMO! */

// run del tool di delete feature
// che ritorna una promessa
proto.run = function(inputs, context) {
  console.log('Delete task run.......');
  var self = this;
  var d = $.Deferred();
  this._layer = inputs.layer;
  //recupero la sessione dal context
  var session = context.session;
  this._selectInteraction = new ol.interaction.Select({
    layers: [this._layer],
    condition: ol.events.condition.click,
    style: function(feature) {
      var style = styles[feature.getGeometry().getType()];
      return style;
    }
  });
  this.addInteraction(this._selectInteraction);
  this._deleteInteraction = new DeleteInteraction({
    features: this._selectInteraction.getFeatures()
  });
  this.addInteraction(this._deleteInteraction);
  this._deleteInteraction.on('deleteend', function(e){
    var feature = e.features.getArray()[0];
    //var isNew = self._isNew(feature);
    // dico di cancellarla (la feature non viene cancellatata ma aggiornato il suo stato
    feature.delete();
    // vado ad aggiungere la featurea alla sessione (parte temporanea)
    session.push(feature);
    //dovrei aggiungere qui qualcosa per salvare temporaneamente quesa modifica sulla sessione al fine di
    // portare tutte le modifiche quando viene fatto il save della sessione
    self._selectInteraction.getFeatures().clear();
    // ritorno come outpu l'input layer che sarà modificato
    d.resolve(inputs);
  });
  return d.promise();
};

proto.pause = function(pause){
  if (_.isUndefined(pause) || pause){
    this._selectInteraction.setActive(false);
    this._deleteInteraction.setActive(false);
  }
  else {
    this._selectInteraction.setActive(true);
    this._deleteInteraction.setActive(true);
  }
};

proto.stop = function() {
  var d = $.Deferred();
  this._selectInteraction.getFeatures().clear();
  this.removeInteraction(this._selectInteraction);
  this._selectInteraction = null;
  this.removeInteraction(this._deleteInteraction);
  this._deleteInteraction = null;
  d.resolve(true);
  return d.promise();
};

proto._deleteFeature = function(feature, isNew) {
  return true;
};

proto._fallBack = function(feature) {
};

proto._isNew = function(feature){
  return (!_.isNil(this._layer.getSource().getFeatureById(feature.getId())));
};


module.exports = DeleteFeatureTask;