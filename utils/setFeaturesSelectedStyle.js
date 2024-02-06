/**
 * ORIGINAL SOURCE: g3w-client-plugin-editing/workflows/tasks/editingtask.js@3.7.1
 * 
 * Get selected style from "extracted" original feature style  
 * 
 * @param feature
 * 
 * @returns {{ originalStyle: *, selectedStyle: * }} selected style based on geometry type
 */
function getSelectedStyle(feature) {
  return {
    originalStyle: feature.getStyle(),
    selectedStyle: g3wsdk.core.geoutils.createSelectedStyle({ geometryType: feature.getGeometry().getType() })
  }
};

/**
 * ORIGINAL SOURCE: g3w-client-plugin-editing/workflows/tasks/editingtask.js@3.7.1
 * 
 * Set selected style to features and return original feature style
 * 
 * @param { Array } features
 * 
 * @returns { ol.style.Style }
 */
export function setFeaturesSelectedStyle(features=[]) {
  if (features.length > 0) {                                       // copy feature from other layers when selecting multiple features
    const arr = features.flat();                                   // flat nested features
    const style = getSelectedStyle(arr[0]);
    arr.forEach(feature => feature.setStyle(style.selectedStyle));
    return style.originalStyle;
  }
};