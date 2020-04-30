const inherit = g3wsdk.core.utils.inherit;
const base =  g3wsdk.core.utils.base;
const EditingTask = require('./editingtask');
const PickFeatureInteraction = g3wsdk.ol.interactions.PickFeatureInteraction;

function SelectElementsTask(options={}) {
  this._type = options.type || 'bbox'; // 'single' 'bbox' 'muliple'
  this._selectInteraction;
  base(this, options);
}

inherit(SelectElementsTask, EditingTask);

const proto = SelectElementsTask.prototype;

proto.run = function(inputs, context, queques) {
  const layer = inputs.layer;
  const d = $.Deferred();
  let features;
  let originalStyle;
  switch(this._type) {
    case 'single':
      this._selectInteraction = new PickFeatureInteraction({
        layers: [layer.getEditingLayer()]
      });
      this._selectInteraction.on('picked', (e) => {
        const feature = e.feature;
        features = [feature];
        if (feature) {
          inputs.features = features;
          originalStyle = this.setFeaturesSelectedStyle(features);
          this.setUserMessageStepDone('select');
          d.resolve(inputs);
        }
      });
      break;
    case 'multiple':
      break;
    case 'bbox':
      this._selectInteraction = new ol.interaction.DragBox({
        condition: ol.events.condition.shiftKeyOnly
      });
      this._selectInteraction.on('boxend', () => {
        const bboxExtent = this._selectInteraction.getGeometry().getExtent();
        const layerSource = layer.getEditingLayer().getSource();
        features = layerSource.getFeaturesInExtent(bboxExtent);
        if (!features.length) d.reject();
        else {
          inputs.features = features;
          originalStyle = this.setFeaturesSelectedStyle(features);
          this.setUserMessageStepDone('select');
          d.resolve(inputs);
        }
      });
      break;
  }
  queques.micro.addTask(()=>{
   inputs.features.forEach((feature => feature.setStyle(originalStyle)));
  })
  this.addInteraction(this._selectInteraction);
  return d.promise();
};

proto.stop = function(inputs, context) {
  this.removeInteraction(this._selectInteraction);
  this._drawInteraction = null;
};

module.exports = SelectElementsTask;
