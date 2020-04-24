const inherit = g3wsdk.core.utils.inherit;
const base =  g3wsdk.core.utils.base;
const EditingTask = require('./editingtask');
const PickFeatureInteraction = g3wsdk.ol.interactions.PickFeatureInteraction;

function SelectElementsTask(options={}) {
  this._selectInteraction;
  this._drawInteraction;
  this._snapIteraction;
  base(this, options);
}

inherit(SelectElementsTask, EditingTask);

const proto = SelectElementsTask.prototype;

proto.run = function(inputs, context) {
  const layer = inputs.layer;
  const isPkEditable = layer.isPkEditable();
  const d = $.Deferred();
  this._selectedFeaturesLayer = new ol.layer.Vector({
    source: new ol.source.Vector(),
    style: (feature) => {
      return this.getSelectedStyle(feature).selectedStyle
    }
  });

  this._ctrlC = (evt) => {
    if ((evt.ctrlKey ||evt.metaKey) && evt.which === 67) {
      if (!this._selectedFeaturesLayer.getSource().getFeatures().length) return;
      inputs.features = this._selectedFeaturesLayer.getSource().getFeatures();
      this.setUserMessageStepDone('copy');
      this._selectInteraction.setActive(false);

      this._snapIteraction = new ol.interaction.Snap({
        features: new ol.Collection(inputs.features),
        edge: false
      });

      this._drawIteraction = new ol.interaction.Draw({
        type: 'Point',
        features: new ol.Collection(),
      });

      this._drawIteraction.on('drawend', (evt)=> {
        const coordinates = evt.feature.getGeometry().getCoordinates();
        d.resolve({
          inputs,
          context,
          coordinates
        });
        this.setUserMessageStepDone('from')
      });

      this.addInteraction(this._drawIteraction);
      this.addInteraction(this._snapIteraction);
    }
  };
  if (isPkEditable) {
    this._selectInteraction = new PickFeatureInteraction({
      layers: [layer.getEditingLayer()]
    });
    this._selectInteraction.on('picked', (e) => {
      const feature = e.feature;
      if (feature) {
        this._selectedFeaturesLayer.getSource().addFeature(feature);
        this.setUserMessageStepDone('select');
        document.addEventListener('keydown', this._ctrlC);
      }
    });
  } else {
    this._selectInteraction = new ol.interaction.DragBox({
      condition: ol.events.condition.shiftKeyOnly
    });
    this._selectInteraction.on('boxend', () => {
      this._selectedFeaturesLayer.getSource().clear();
      const bboxExtent = this._selectInteraction.getGeometry().getExtent();
      const layerSource = layer.getEditingLayer().getSource();
      const features = layerSource.getFeaturesInExtent(bboxExtent);
      if (!features.length)
        d.reject();
      else {
        this._selectedFeaturesLayer.getSource().addFeatures(features);
        this.setUserMessageStepDone('select');
        document.addEventListener('keydown', this._ctrlC);
      }
    });
  }
  this.getMap().addLayer(this._selectedFeaturesLayer);
  this.addInteraction(this._selectInteraction);


  return d.promise();
};

proto.stop = function() {
  this.removeInteraction(this._selectInteraction);
  this.removeInteraction(this._drawIteraction);
  this.removeInteraction(this._snapIteraction);
  this._drawInteraction = null;
  this._snapIteraction = null;
  this._selectInteraction = null;
  document.removeEventListener('keydown', this._ctrlC);
  this._ctrlC = null;
  this.getMap().removeLayer(this._selectedFeaturesLayer);
  this._selectedFeaturesLayer.getSource().clear();
  this._selectedFeaturesLayer = null;
  return true;
};

module.exports = SelectElementsTask;
