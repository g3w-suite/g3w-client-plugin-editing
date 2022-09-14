const PickFeaturesEventType = {
  PICKED: 'picked'
};

const PickFeaturesEvent = function(type, coordinate, layer, features) {
  this.type = type;
  this.features = features;
  this.coordinate = coordinate;
  this.layer = layer;
};

export const PickFeaturesInteraction = function(options={}) {
  ol.interaction.Pointer.call(this, {
    handleDownEvent: PickFeaturesInteraction.handleDownEvent_,
    handleUpEvent: PickFeaturesInteraction.handleUpEvent_,
    handleMoveEvent: PickFeaturesInteraction.handleMoveEvent_
  });
  this.layer = options.layer;
  this.pickedFeatures = [];
};

ol.inherits(PickFeaturesInteraction, ol.interaction.Pointer);

PickFeaturesInteraction.handleDownEvent_ = function(event) {
  this.pickedFeatures = this.featuresAtPixel(event);
  return this.pickedFeatures;
};

PickFeaturesInteraction.handleUpEvent_ = function(event) {
  if (this.pickedFeatures && this.pickedFeatures.length){
    this.dispatchEvent(
      new PickFeaturesEvent(
        PickFeaturesEventType.PICKED,
        event.coordinate,
        this.layer,
        this.pickedFeatures)
    );
  }
  return true;
};

PickFeaturesInteraction.prototype.featuresAtPixel = function({pixel, map}={}) {
  return map.getFeaturesAtPixel(pixel, {
    layerFilter: layer => layer === this.layer,
    hitTolerance: (isMobile && isMobile.any) ? 10 : 0
  });
};

PickFeaturesInteraction.handleMoveEvent_ = function(event) {
  const elem = event.map.getTargetElement();
  const intersectingFeatures = this.featuresAtPixel(event);
  elem.style.cursor = intersectingFeatures ?  'pointer': '';
};

PickFeaturesInteraction.prototype.shouldStopEvent = function(){
  return false;
};

PickFeaturesInteraction.prototype.setMap = function(map){
  if (!map) {
    const elem = this.getMap().getTargetElement();
    elem.style.cursor = '';
  }
  ol.interaction.Pointer.prototype.setMap.call(this, map);
};

