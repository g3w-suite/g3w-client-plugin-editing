const inherit = g3wsdk.core.utils.inherit;
const Layer = g3wsdk.core.layer.Layer;
const Geometry = g3wsdk.core.geometry.Geometry;
const base =  g3wsdk.core.utils.base;
const EditingTask = require('./editingtask');
const Feature = g3wsdk.core.layer.features.Feature;

// classe  per l'aggiuntadi feature
// eridita dalla classe padre EditingTool
function AddFeatureTask(options={}) {
  this._busy = false;
  // source del layer di editing
  // la drw interaction per disegnare la feature
  this.drawInteraction = null;
  this._snapInteraction = null;
  this._finishCondition = options.finishCondition || _.constant(true);
  this._condition = options.condition || _.constant(true);
  this._constraints = options.constraints || {};
  this._dependency = options.dependency || null;
  base(this, options);
}

inherit(AddFeatureTask, EditingTask);

const proto = AddFeatureTask.prototype;

// metodo eseguito all'avvio del tool
proto.run = function(inputs, context) {
  /*
    originalLayer : è il layer di editing originale
    editingLayer: è il layer, in questo caso ol.layer.Vector con cui gli strumenti interagiscono
   */
  const d = $.Deferred();
  const editingLayer = inputs.layer;
  //recupero la sessione dal context
  const session = context.session;
  const originalLayer = context.layer;
  const layerId = originalLayer.getId();
  // vado a rrecuperare la primary key del layer
  const pk = originalLayer.getPk();
  // qui vado a valutare il tipo di layer
  switch (originalLayer.getType()) {
    case Layer.LayerTypes.VECTOR:
      let geometryType;
      if (originalLayer.getEditingGeometryType() === Geometry.GeometryTypes.LINE)
        geometryType = 'LineString';
      else if (originalLayer.getEditingGeometryType() === Geometry.GeometryTypes.MULTILINE)
        geometryType = 'MultiLineString';
      else
        geometryType = originalLayer.getEditingGeometryType();
      //definisce l'interazione che deve essere aggiunta
      // specificando il layer sul quale le feature aggiunte devono essere messe
      const source = editingLayer.getSource();
      const dependencySource = this._dependency.getSource();
      const options = {
        source,
        canDraw: false,
        dependency: this._dependency
      };
      const attributes = _.filter(originalLayer.getFields(), function(field) {
        return field.editable && field.name != originalLayer.getPk() ;
      });
      this._condition = AddFeatureTask.CONDITIONS[geometryType](options);
      // creo una source temporanea
      const temporarySource = new ol.source.Vector();
      this.drawInteraction = new ol.interaction.Draw({
        type: geometryType, // il tipo lo prende dal geometry type dell'editing vetor layer che a sua volta lo prende dal tipo si geometry del vector layer originale
        source: temporarySource, // lo faccio scrivere su una source temporanea (non vado a modificare il source featuresstore)
        condition: this._condition,
        ...this._constraints,
        finishCondition: this._finishCondition // disponibile da https://github.com/openlayers/ol3/commit/d425f75bea05cb77559923e494f54156c6690c0b
      });
      //aggiunge l'interazione tramite il metodo generale di editor.js
      // che non fa altro che chaimare il mapservice
      this.addInteraction(this.drawInteraction);
      //setta attiva l'interazione
      this.drawInteraction.setActive(true);
      this._snapInteraction = new ol.interaction.Snap({
        source: geometryType === 'LineString' || geometryType == 'MultiLineString' ? source : dependencySource,
        edge: geometryType === 'LineString' || geometryType == 'MultiLineString' ? false: true
      });
      this.addInteraction(this._snapInteraction);
      this._snapInteraction.setActive(true);
      this.drawInteraction.on('drawstart', function(e) {
        options.canDraw = true;
      });
      // viene settato l'evento drawend
      this.drawInteraction.on('drawend', function(e) {
        //console.log('Drawend .......');
        // vado ad assegnare le proprià del layer alla nuova feature
        attributes.forEach((attribute) => {
          e.feature.set(attribute.name, null);
        });
        const feature = new Feature({
          feature: e.feature,
          pk// passo la pk della feature
        });
        // verifico se la pk è editabile o meno
        originalLayer.isPkEditable() ?  feature.setNew() : feature.setTemporaryId();
        // lo setto come add feature lo state
        // vado a aggiungerla
        source.addFeature(feature);
        //source.readFeatures().push(feature);
        // devo creare un clone per evitare che quando eventualmente sposto la feature appena aggiunta
        // questa non sovrascriva le feature nuova originale del primo update
        //session.pushAdd(layerId, feature);
        inputs.features.push(feature);
        d.resolve(inputs);
      });
      break;
  }
  return d.promise();
};


// metodo eseguito alla disattivazione del tool
proto.stop = function() {
  //console.log('stop add task ...');
  //rimuove e setta a null la _snapInteraction
  if (this._snapInteraction) {
     this.removeInteraction(this._snapInteraction);
     this._snapInteraction = null;
  }
  //rimove l'interazione e setta a null drawInteracion
  this.removeInteraction(this.drawInteraction);
  this.drawInteraction = null;
  return true;
};

proto._removeLastPoint = function() {
  if (this.drawInteraction) {
    // provo a rimuovere l'ultimo punto. Nel caso non esista la geometria gestisco silenziosamente l'errore
    try {
      this.drawInteraction.removeLastPoint();
    }
    catch (e) {
      //
    }
  }
};

AddFeatureTask.CONDITIONS = {
  'LineString': function(options) {
    // viene settato sull'inizio del draw l'evento drawstart dell'editor
    return function({coordinate}) {
      const source = options.source;
      const features = source.getFeatures();
      if (features.length === 0)
        return true;
      else {
        return options.canDraw || !!source.getFeatures().find((feature) => {
          return feature.getGeometry().getCoordinates()[0].toString() === coordinate.toString() || feature.getGeometry().getCoordinates()[1].toString() === coordinate.toString();
        })
      }
    }
  },
  'Point': function({ dependency, source }) {
    const features = dependency.getSource().getFeatures();
    return function({coordinate, pixel}) {
      return features.length &&
        !!features.find((feature) => {
          return !!this.getMap().forEachFeatureAtPixel(pixel, function(_feature) {
            return feature === _feature;
          }, {
            layerFilter: function(layer) {
              return layer === dependency
            }
          });
        }) &&
        !source.getFeatures().find((feature) => {
          return feature.getGeometry().getCoordinates().toString() === coordinate.toString() ;
        })
    }
  }
};

module.exports = AddFeatureTask;
