export const PickFeaturesInteraction = function(options={}) {
  ol.interaction.Pointer.call(this, {
    handleDownEvent: PickFeaturesInteraction.handleDownEvent_,
    handleUpEvent:   PickFeaturesInteraction.handleUpEvent_,
    handleMoveEvent: PickFeaturesInteraction.handleMoveEvent_
  });
  this.layer = options.layer;
  this.pickedFeatures = [];
};

ol.inherits(PickFeaturesInteraction, ol.interaction.Pointer);

PickFeaturesInteraction.handleDownEvent_ = function(e) {
  this.pickedFeatures = this.featuresAtPixel(e);
  return this.pickedFeatures;
};

PickFeaturesInteraction.handleUpEvent_ = function(e) {
  if (this.pickedFeatures && this.pickedFeatures.length){
    this.dispatchEvent({
      type: 'picked',
      features: this.pickedFeatures,
      coordinate: e.coordinate,
      layer: this.layer
    });
  }
  return true;
};

PickFeaturesInteraction.prototype.featuresAtPixel = function({ pixel, map }={}) {
  return map.getFeaturesAtPixel(pixel, {
    layerFilter: l => l === this.layer,
    hitTolerance: (isMobile && isMobile.any) ? 10 : 0
  });
};

PickFeaturesInteraction.handleMoveEvent_ = function(e) {
  e.map.getTargetElement().style.cursor = this.featuresAtPixel(e) ? 'pointer': '';
};

PickFeaturesInteraction.prototype.shouldStopEvent = function() {
  return false;
};

PickFeaturesInteraction.prototype.setMap = function(map) {
  if (!map) {
    this.getMap().getTargetElement().style.cursor = '';
  }
  ol.interaction.Pointer.prototype.setMap.call(this, map);
};

