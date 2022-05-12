import {EPSG_COORDINATES}  from '../../../global_plugin_data';
const {ConvertDEGToDMS, ConvertDEGToDM} = g3wsdk.core.geoutils;
const mapEpsg = g3wsdk.core.ApplicationState.map.epsg;
export default {
  methods: {
    loseFocusInput(evt){
      evt.target.blur()
    },
    setPointCoordinatesInMapProjection({point, coordinates}={}){
      point[`coordinates${mapEpsg}`] = coordinates;
      this.covertToEPSG({
        excludeEPSG: mapEpsg,
        point
      });
      this.toDHMS(point);
      this.toDM(point);
    },
    covertToEPSG({excludeEPSG, point}){
      this.changedEPSG = excludeEPSG;
      EPSG_COORDINATES.forEach(epsg_code => epsg_code !== excludeEPSG && this.toEPSG(point, epsg_code));
    },
    getPointCoordinatesInMapProjection(point){
      const coordinates= point[`coordinates${mapEpsg}`];
      // nee to convert no number
      return coordinates.map(coordinate => 1*coordinate);
    },
    toDM(point){
      point.coordinatesDM = [
        ...ConvertDEGToDM({deg: point['coordinatesEPSG:4326'][0], output: 'Array'}),
        ...ConvertDEGToDM({deg:point['coordinatesEPSG:4326'][1], output: 'Array'})
      ];
    },
    toDMS(point){
      point.coordinatesDMS = [
        ...ConvertDEGToDMS({deg: point['coordinatesEPSG:4326'][0], lon:true, output: 'Array'}),
        ...ConvertDEGToDMS({deg:point['coordinatesEPSG:4326'][1], lat:true, output: 'Array'})
      ];
    },
    toEPSG(point, epsg_code){
      const EPSG = this.changedEPSG || mapEpsg;
      const coordinates = point[`coordinates${EPSG}`].map(coordinate => 1*coordinate);
      point[`coordinates${epsg_code}`] = ol.proj.transform(coordinates, EPSG, epsg_code);
      if (epsg_code !== 'EPSG:4326' && epsg_code !== 'EPSG:3857'){
        point[`coordinates${epsg_code}`] = [point[`coordinates${epsg_code}`][0].toFixed(2), point[`coordinates${epsg_code}`][1].toFixed(2)]
      }
    },
    toMinimunDecimals(value, min) {
      value = value.toString();
      let decimalCount;
      if (value.indexOf(".") !== -1)
        decimalCount = value.split(".")[1].length || 0;
      else decimalCount = 0;
      return decimalCount >= min ? 1*value: (1*value).toFixed(min);
    },
    createPoint(coordinates, properties={}){
      const pointObject = {
        fields: [],
        'coordinatesDMS': null,
        'coordinatesDM': null,
        ...properties,
        changed: false
      };
      /**
       * Add coordinates
       */
      EPSG_COORDINATES.forEach(epsg_code => pointObject[`coordinates${epsg_code}`] = mapEpsg === epsg_code ? coordinates : null);
      const point_coordinates = pointObject[`coordinates${mapEpsg}`];
      this.covertToEPSG({
        exludeEPSG: mapEpsg,
        point: pointObject
      });
      this.toDMS(pointObject);
      this.toDM(pointObject);
      return {
        pointObject,
        point_coordinates
      }
    }
  }
}