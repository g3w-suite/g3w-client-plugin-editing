const { splitFeature } = g3wsdk.core.geoutils;

/**
 * ORIGINAL SOURCE: g3w-client/src/utils/splitFeatures.js@v3.10.2
 * 
 * @param { Object } opts
 * @param { Array } opts.features
 * @param opts.splitfeature
 * 
 * @returns { Array } splittered geometries
 * 
 * @since g3w-client-plugin-editing@v3.9.0
 */
export function splitFeatures(features, splitfeature) {
  return (features || []).reduce((a, f) => {
    const geometries = splitFeature({ splitfeature, feature: f });
    if (geometries.length > 1) {
      a.push({ uid: f.getUid(), geometries });
    }
    return a;
  }, []);
}