const {base, inherit} = g3wsdk.core.utils;
const EditingTask = require('./editingtask');

function MoveElementsTask(options={}){
  base(this, options);
}

inherit(MoveElementsTask, EditingTask);

const proto = MoveElementsTask.prototype;

proto.getDeltaXY = function({x, y, coordinates} = {}){
  const getCoordinates = (coordinates)=> {
    if (Array.isArray(coordinates[0])){
      return getCoordinates(coordinates[0])
    } else return {
      x: coordinates[0],
      y: coordinates[1]
    };
  };
  const xy = getCoordinates(coordinates);
  return {
    x: x - xy.x,
    y: y - xy.y
  }
};

proto.run = function(inputs, context) {
  const d = $.Deferred();
  const { layer, features, coordinates } = inputs;
  const source = layer.getEditingLayer().getSource();
  const layerId = layer.getId();
  const session = context.session;
  this._snapIteraction = new ol.interaction.Snap({
    source,
    edge: false
  });

  this._drawInteraction = new ol.interaction.Draw({
    type: 'Point',
    features: new ol.Collection(),
  });

  this._drawInteraction.on('drawend', evt => {
    const [x, y] = evt.feature.getGeometry().getCoordinates();
    const deltaXY = coordinates ? this.getDeltaXY({
      x, y, coordinates
    }) : null;
    const featuresLength = features.length;
    const promisesDefaultEvaluation = [];
    for (let i =0; i < featuresLength; i++) {
      const feature = cloneFeature(features[i], layer);
      if (deltaXY) feature.getGeometry().translate(deltaXY.x, deltaXY.y);
      else {
        const coordinates = feature.getGeometry().getCoordinates();
        const deltaXY = this.getDeltaXY({
          x, y, coordinates
        });
        feature.getGeometry().translate(deltaXY.x, deltaXY.y)
      }
      this.setNullMediaFields({
        feature,
        layer
      });
      /**
       * evaluated geometry expression
       */
      const promise = this.evaluateExpressionFields({
        inputs,
        context,
        feature
      });
      
      promisesDefaultEvaluation.push(promise)
    }
    Promise.allSettled(promisesDefaultEvaluation)
      .then(promises => {
        promises.forEach(({status, value:feature}) => {

          /**
           * @todo improve client core to handle this situation on session.pushAdd not copy pk field not editable only
           */
          const noteditablefieldsvalues = this.getNotEditableFieldsNoPkValues({
            layer,
            feature
          });
          const newFeature = session.pushAdd(layerId, feature);
          // after pushAdd need to set not edit
          if (Object.entries(noteditablefieldsvalues).length) {
            Object.entries(noteditablefieldsvalues).forEach(([field, value]) => newFeature.set(field, value));
          }

          //need to add to editing layer source newFeature
          source.addFeature(newFeature);

          inputs.features.push(newFeature);
        })
      })
      .finally(() => {
        /**
         * @type {boolean}
         */
        this._steps.to.done = true;
        d.resolve(inputs);
      })
  });

  this.addInteraction(this._drawInteraction);
  this.addInteraction(this._snapIteraction);
  return d.promise();
};
proto.stop = function() {
  this.removeInteraction(this._drawInteraction);
  this.removeInteraction(this._snapIteraction);
  this._drawInteraction = null;
  this._snapIteraction = null;
  return true;
};

module.exports = MoveElementsTask;
