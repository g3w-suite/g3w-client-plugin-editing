const inherit = g3wsdk.core.utils.inherit;
const tPlugin =  t = g3wsdk.core.i18n.tPlugin;
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
  this.drawInteraction;
  this._snapInteraction;
  this._finishCondition = function(evt) {
    return true
  };
  //options.finishCondition || _.constant(true);
  this._condition = options.condition || _.constant(true);
  this._constraints = options.constraints || {};
  this._dependency = options.dependency || null;
  this._removeLastPoint = this.removeLastPoint.bind(this);
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
  const isBranchLayer = this.isBranchLayer(layerId);
  if (!isBranchLayer && !this.getBranchLayerSource().getFeatures().length)
    this.showUserMessage({
      type: 'warning',
      closable: false,
      position: 'top',
      message: tPlugin('editing.messages.editing.no_branch')
    });
  // vado a rrecuperare la primary key del layer
  const pk = originalLayer.getPk();
  this._optionscondition = {
    vertex: 0,
    snapFeatures: [],
    start: false,
    edge:false,
    edgeCoordinate:[]
  };
  // qui vado a valutare il tipo di layer
  switch (originalLayer.getType()) {
    case Layer.LayerTypes.VECTOR:
      let geometryType;
      if (originalLayer.getEditingGeometryType() === Geometry.GeometryTypes.LINE)
        geometryType = 'LineString';
      else if (originalLayer.getEditingGeometryType() === Geometry.GeometryTypes.MULTILINE)
        geometryType = 'MultiLineString';
      else if (originalLayer.getEditingGeometryType() === 'PointZ')
        geometryType = 'Point';
      else
        geometryType = originalLayer.getEditingGeometryType();
      //definisce l'interazione che deve essere aggiunta
      // specificando il layer sul quale le feature aggiunte devono essere messe
      const source = editingLayer.getSource();
      const dependencyFeatures = this.getDependencyFeatures(this._dependency);
      const options = {
        source,
        canDraw: false,
        dependency: this._dependency,
        dependencyFeatures,
        optionscondition: this._optionscondition
      };
      const fields = originalLayer.getFields();
      const attributes = fields.filter((field) => {
        return field.editable && field.name !== originalLayer.getPk() ;
      });
      this._condition = AddFeatureTask.CONDITIONS[geometryType](options);
      // creo una source temporanea
      const temporarySource = new ol.source.Vector();
      this.drawInteraction = new ol.interaction.Draw({
        type: geometryType, // il tipo lo prende dal geometry type dell'editing vetor layer che a sua volta lo prende dal tipo si geometry del vector layer originale
        source: temporarySource, // lo faccio scrivere su una source temporanea (non vado a modificare il source featuresstore)
        condition: this._condition,
        ...this._constraints
      });
      //aggiunge l'interazione tramite il metodo generale di editor.js
      // che non fa altro che chaimare il mapservice
      this.addInteraction(this.drawInteraction);
      //setta attiva l'interazione
      this.drawInteraction.setActive(true);
      this._snapInteraction = new ol.interaction.Snap({
        features:  isBranchLayer ? new ol.Collection(source.getFeatures()) : new ol.Collection(dependencyFeatures),
        //edge: !isBranchLayer,
      });
      this.addInteraction(this._snapInteraction);
      this._snapInteraction.setActive(true);
      this.drawInteraction.on('drawstart', (evt) => {
        if (isBranchLayer) {
          this._createMeasureTooltip();
          this._registerPointerMoveEvent({
            feature: evt.feature,
            snapFeatures: this._optionscondition.snapFeatures
          });
        }
        this._optionscondition.start = true;
        document.addEventListener('keydown', this._removeLastPoint);
      });
      // viene settato l'evento drawend
      this.drawInteraction.on('drawend', (e) => {
        this._optionscondition.start = false;
        const _feature = e.feature;
        //console.log('Drawend .......');
        // vado ad assegnare le proprià del layer alla nuova feature
        if (!isBranchLayer) {
          this.setBranchId({
            feature: _feature,
            dependency: this._dependency
          });
          this.runNodeMethods({
            type: 'add',
            layerId,
            feature: _feature
          })
        } else {
          this._clearMeasureTooltip();
        }
        attributes.forEach((attribute) => {
          _feature.set(attribute.name, null);
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
        session.pushAdd(layerId, feature);
        inputs.features.push(feature);
        if (isBranchLayer) {
          if (!this._optionscondition.edge)
            this.runBranchMethods({
              action: 'add',
              session,
              feature,
            }, {
              snapFeatures: this._optionscondition.snapFeatures.filter(snapFeature => {
                return snapFeature;
              })
            });
          else {
            const {originalFeature, newFeature, snapFeature} = this._splitSnapFeature();
            this._setSplittedBrachProfiles({
              features: [newFeature, snapFeature]
            });
            session.pushUpdate(layerId, snapFeature, originalFeature);
            session.pushAdd(layerId, newFeature);
            source.addFeature(newFeature);
          }
        }
        d.resolve(inputs);
      });
      break;
  }
  return d.promise();
};

proto._setSplittedBrachProfiles = function({features}) {
  features.forEach((feature) => {
    feature.set('pipes', undefined);
    this.setBranchProfileData({
      feature
    });
  })
};

proto._splitSnapFeature = function() {
  // ricavo la feature su cui è snappata la nuova feature inserita
  const snapFeature = this._optionscondition.snapFeatures.filter(snapFeature => {
    return snapFeature;
  })[0];
  // prendo le coordinate originali
  const originalCoordinates = snapFeature.getGeometry().getCoordinates();
  // prendo le coordinate del punto di snap
  const snapCoordinate = this._optionscondition.edgeCoordinate;
  // vado a clonare la feature originale
  const originalFeature = snapFeature.clone();
  // vado a clonare la feature orinale per la creazione della nuona feature
  const newFeature = snapFeature.clone();
  newFeature.setTemporaryId();
  newFeature.getGeometry().setCoordinates([snapCoordinate, originalCoordinates[1]]);
  snapFeature.getGeometry().setCoordinates([originalCoordinates[0], snapCoordinate]);
  return {
    originalFeature,
    newFeature,
    snapFeature
  }
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
  document.removeEventListener('keydown', this._removeLastPoint);
  this.closeUserMessage();
  this._measureTooltip && this._clearMeasureTooltip();
  return true;
};

proto.removeLastPoint = function(evt) {
  if (evt.which === 27 && this._optionscondition.vertex) {
    this.drawInteraction.removeLastPoint();
    this._optionscondition.vertex = 0;
    this._optionscondition.snapFeatures = [];
    this._clearMeasureTooltip();
  }
};

AddFeatureTask.CONDITIONS = {
  'LineString': function(options={}) {
    // viene settato sull'inizio del draw l'evento drawstart dell'editor
    return function({coordinate}) {
      const source = options.source;
      const features = source.getFeatures();
      const coordinateExtent = new ol.geom.Point(coordinate).getExtent();
      if (features.length === 0) {
        return true
      } else {
        const optionscondition = options.optionscondition;
        // obbligo a verificare che sia partito lo start draw event
        optionscondition.vertex = optionscondition.start ? optionscondition.vertex : 0;
        let canDraw = false;
        //funzione per il check
        const checkSnapVertex = () => {
          const branchFeatures = source.getFeatures();
          for (let i = 0; i < branchFeatures.length; i++) {
            const feature = branchFeatures[i];
            const geometry = feature.getGeometry();
            // check id snapped to vertex
            if (geometry.intersectsExtent(coordinateExtent)) {
              optionscondition.edge = true;
              optionscondition.edgeCoordinate = coordinate;
              optionscondition.snapFeatures[optionscondition.vertex] = optionscondition.snapFeatures[optionscondition.vertex] === undefined ? feature : false;
              canDraw = true;
              if (geometry.getCoordinates()[0].toString() === coordinate.toString() || geometry.getCoordinates()[1].toString() === coordinate.toString()) {
                optionscondition.edge = false;
                optionscondition.edgeCoordinate = [];
                break;
              }
            }
          }
          if (optionscondition.vertex === 0) {
            optionscondition.vertex+=1;
            canDraw = true;
          } else {
            canDraw = canDraw || optionscondition.snapFeatures[0] !== undefined;
          }
        };
        checkSnapVertex();
        return canDraw;
      }
    }
  },
  'Point': function({ dependency, dependencyFeatures, source }) {
    return function({coordinate, pixel}) {
      return dependencyFeatures.length &&
        !!dependencyFeatures.find((feature) => {
          return !!this.getMap().forEachFeatureAtPixel(pixel, function(_feature) {
            return feature === _feature;
          }, {
            layerFilter: function(layer) {
              return !!dependency.find((_dependency) => {
                return _dependency === layer
              })
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
