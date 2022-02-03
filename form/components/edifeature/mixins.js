const {ConvertDEGToDMS} = g3wsdk.core.geoutils;
const mapEpsg = g3wsdk.core.ApplicationState.map.epsg;
export default {
  methods: {
    loseFocusInput(evt){
      evt.target.blur()
    },
    setPointCoordinatesInMapProjection({point, coordinates}={}){
      switch (mapEpsg) {
        case 'EPSG:4326':
          point['5_coordinatesEPSG:4326'] = coordinates;
          this.to3857(point);
          break;
        case 'EPSG:3857':
          point['coordinatesEPSG:3857'] = coordinates;
          this.toDegree(point);
          break;
      }
      this.toDHMS(point);
    },
    getPointCoordinatesInMapProjection(point){
      let coordinates;
      switch (mapEpsg) {
        case 'EPSG:4326':
          coordinates = point['5_coordinatesEPSG:4326'];
          break;
        case 'EPSG:3857':
          coordinates = point['coordinatesEPSG:3857'];
          break;
        default:
          coordinates = ol.proj.transform(point['5_coordinatesEPSG:4326'], 'EPSG:4326', mapEpsg);
      }
      // nee to convert no number
      return coordinates.map(coordinate => 1*coordinate);
    },
    toDegree(point){
      const coordinates = ol.proj.transform(point['coordinatesEPSG:3857'], 'EPSG:3857', 'EPSG:4326');
      point['5_coordinatesEPSG:4326'] = coordinates;
      point['3_coordinatesEPSG:4326'] = [...coordinates];
    },
    toDHMS(point){
      point.coordinatesDHMS = [
        ...ConvertDEGToDMS({deg: point['5_coordinatesEPSG:4326'][0], lon:true, output: 'Array'}),
        ...ConvertDEGToDMS({deg:point['5_coordinatesEPSG:4326'][1], lat:true, output: 'Array'})
      ];
    },
    to3857(point){
      const coordinates = point['5_coordinatesEPSG:4326'].map(coordinate => 1*coordinate);
      point['coordinatesEPSG:3857'] = ol.proj.transform(coordinates, 'EPSG:4326', 'EPSG:3857');
    },
    toMinimunDecimals(value, min) {
      value = value.toString();
      let decimalCount;
      if (value.indexOf(".") !== -1 && value.indexOf("-") !== -1)
        decimalCount = value.split("-")[1] || 0;
      else if (value.indexOf(".") !== -1)
        decimalCount = value.split(".")[1].length || 0;
      else decimalCount = value.split("-")[1] || 0;
      return decimalCount >= min ? 1*value: (1*value).toFixed(min);
    },
    createPoint(coordinates, properties={}){
      const pointObject = {
        fields: [],
        '5_coordinatesEPSG:4326': null,
        coordinatesDHMS: null,
        '3_coordinatesEPSG:4326': null,
        'coordinatesEPSG:3857': null,
        ...properties,
        changed: false
      };
      let point_coordinates;
      if (mapEpsg === 'EPSG:3857') {
        pointObject['coordinatesEPSG:3857'] = coordinates;
        point_coordinates = pointObject['coordinatesEPSG:3857'];
        this.toDegree(pointObject);
      } else if (mapEpsg === 'EPSG:4326'){
        pointObject['5_coordinatesEPSG:4326'] = coordinates;
        pointObject['3_coordinatesEPSG:4326'] = coordinates;
        point_coordinates = pointObject['5_coordinatesEPSG:4326'];
        this.to3857(pointObject);
      }
      this.toDHMS(pointObject);
      return {
        pointObject,
        point_coordinates
      }
    }
  }
}