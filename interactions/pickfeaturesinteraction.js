/**
 * @see https://openlayers.org/en/v5.3.0/apidoc/module-ol_interaction_Pointer.html
 */
export class PickFeaturesInteraction extends ol.interaction.Pointer {

  constructor(opts = {}) {
    let features = []; // picked features

    const featuresAtPixel = ({ pixel, map } = {}) => map.getFeaturesAtPixel(pixel, {
      layerFilter: l => opts.layer === l,
      hitTolerance: (isMobile && isMobile.any) ? 10 : 0,
    });

    super({
      handleDownEvent(e) {
        features = featuresAtPixel(e);
        return features;
      },
      handleUpEvent(e) {
        if (features && features.length > 0) {
          this.dispatchEvent({ type: 'picked', features, coordinate: e.coordinate, layer: opts.layer });
        }
        return true;
      },
      handleMoveEvent(e) {
        e.map.getTargetElement().style.cursor = featuresAtPixel(e) ? 'pointer': '';
      }
    });
  }

}