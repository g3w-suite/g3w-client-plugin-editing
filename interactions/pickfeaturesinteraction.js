/**
 * @see https://openlayers.org/en/v5.3.0/apidoc/module-ol_interaction_Pointer.html
 */
export class PickFeaturesInteraction extends ol.interaction.Pointer {

  constructor(options={}) {
    let pickedFeatures = [];

    const featuresAtPixel = ({ pixel, map } = {}) => map.getFeaturesAtPixel(pixel, {
      layerFilter: l => l === options.layer,
      hitTolerance: (isMobile && isMobile.any) ? 10 : 0
    });

    super({
      handleDownEvent(e) {
        pickedFeatures = featuresAtPixel(e);
        return pickedFeatures;
      },
      handleUpEvent(e) {
        if (pickedFeatures && pickedFeatures.length){
          this.dispatchEvent({
            type: 'picked',
            features: pickedFeatures,
            coordinate: e.coordinate,
            layer: options.layer
          });
        }
        return true;
      },
      handleMoveEvent(e) {
        e.map.getTargetElement().style.cursor = featuresAtPixel(e) ? 'pointer': '';
      }
    });
  }

}