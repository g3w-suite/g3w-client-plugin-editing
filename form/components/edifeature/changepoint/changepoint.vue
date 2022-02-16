<template>
    <div class="coordinates_content" style="width:100%; display: flex; flex-direction: column; justify-content: space-around; ">
        <div>
            <h5 style="font-weight: bold; margin-top: 0; margin-bottom: 3px;">DEGREE</h5>
            <div style="display: flex; justify-content: space-between">
                <input v-for="(coordinate, indexCoordinate) in point['coordinatesEPSG:4326']" :key="coordinate" class="form-control" type="number"
                       style="margin-right: 5px;" step="0.00001" @change="changePointCoordinatesEPSG('EPSG:4326', indexCoordinate, point)" @keyup.enter="loseFocusInput" v-model.lazy="point['coordinatesEPSG:4326'][indexCoordinate]"/>
            </div>
        </div>
        <div>
            <h5 style="font-weight: bold; margin-top: 0; margin-bottom: 3px;">DMS</h5>
            <div style="display: flex; justify-content: space-between">
                <div style="display: grid; grid-template-columns: 1fr 5px 1fr 5px 1fr 5px 1fr; margin-bottom: 3px; margin-right: 5px; row-gap: 3px; column-gap: 3px;">
                    <input class="form-control" style="padding: 1px;" type="number" @keyup.enter="loseFocusInput" @change="changePointFeatureCoordinatesDMS(point, 0)" v-model.lazy="point.coordinatesDMS[0]"/>°
                    <input class="form-control" style="padding: 1px;" type="number" @keyup.enter="loseFocusInput" @change="changePointFeatureCoordinatesDMS(point, 1)" v-model.lazy="point.coordinatesDMS[1]"/>'
                    <input class="form-control" style="padding: 1px;" type="number" @keyup.enter="loseFocusInput" step="0.01" @change="changePointFeatureCoordinatesDMS(point, 2)" v-model.lazy="point.coordinatesDMS[2]"/>"
                    <input class="form-control" style="padding: 1px;" @keyup.enter="loseFocusInput" @change="changePointFeatureCoordinatesDMS(point, 3)" v-model.lazy="point.coordinatesDMS[3]"/>
                </div>
                <div style="display: grid; grid-template-columns: 1fr 5px 1fr 5px 1fr 5px 1fr; row-gap: 3px; column-gap: 3px;">
                    <input class="form-control" style="padding: 1px;" type="number" @keyup.enter="loseFocusInput" @change="changePointFeatureCoordinatesDMS(point, 4)" v-model.lazy="point.coordinatesDMS[4]"/>°
                    <input class="form-control" style="padding: 1px;" type="number" @keyup.enter="loseFocusInput" @change="changePointFeatureCoordinatesDMS(point, 5)" v-model.lazy="point.coordinatesDMS[5]"/>'
                    <input class="form-control" style="padding: 1px;" type="number" @keyup.enter="loseFocusInput" @change="changePointFeatureCoordinatesDMS(point, 6)" v-model.lazy="point.coordinatesDMS[6]"/>"
                    <input class="form-control" style="padding: 1px;" @keyup.enter="loseFocusInput" @change="changePointFeatureCoordinatesDMS(point, 7)" v-model.lazy="point.coordinatesDMS[7]"/>
                </div>
            </div>
        </div>
        <div>
            <h5 style="font-weight: bold; margin-top: 0; margin-bottom: 3px;">DM</h5>
            <div style="display: flex; justify-content: space-between">
                <div style="display: grid; grid-template-columns: 1fr 5px 1fr 5px; margin-bottom: 3px; margin-right: 5px; row-gap: 3px; column-gap: 3px;">
                    <input class="form-control" style="padding: 1px;" type="number" @keyup.enter="loseFocusInput" @change="changePointFeatureCoordinatesDM(point, 0)" v-model.lazy="point.coordinatesDM[0]"/>°
                    <input class="form-control" style="padding: 1px;" type="number" step="0.001" @keyup.enter="loseFocusInput" @change="changePointFeatureCoordinatesDM(point, 1)" v-model.lazy="point.coordinatesDM[1]"/>'
                                    </div>
                <div style="display: grid; grid-template-columns: 1fr 5px 1fr 5px; row-gap: 3px; column-gap: 3px;">
                    <input class="form-control" style="padding: 1px;" type="number" @keyup.enter="loseFocusInput" @change="changePointFeatureCoordinatesDMS(point, 2)" v-model.lazy="point.coordinatesDM[2]"/>°
                    <input class="form-control" style="padding: 1px;" type="number" step="0.001" @keyup.enter="loseFocusInput" @change="changePointFeatureCoordinatesDMS(point, 3)" v-model.lazy="point.coordinatesDM[3]"/>'
                </div>
            </div>
        </div>
        <div>
            <h5 style="font-weight: bold; margin-top: 0; margin-bottom: 3px;">EPSG:32632</h5>
            <div style="display: flex; justify-content: space-between">
                <input v-for="(coordinates, indexCoordinate) in point['coordinatesEPSG:32632']" :key="coordinates" class="form-control" type="number"
                       style="margin-right: 5px;" step="0.01" @keyup.enter="loseFocusInput" @change="changePointCoordinatesEPSG('EPSG:32632', indexCoordinate, point)" v-model.lazy="point['coordinatesEPSG:32632'][indexCoordinate]"/>
            </div>
        </div>
        <div>
            <h5 style="font-weight: bold; margin-top: 0; margin-bottom: 3px;">EPSG:32633</h5>
            <div style="display: flex; justify-content: space-between">
                <input v-for="(coordinates, indexCoordinate) in point['coordinatesEPSG:32633']" :key="coordinates" class="form-control" type="number"
                       style="margin-right: 5px;" step="0.01" @keyup.enter="loseFocusInput" @change="changePointCoordinatesEPSG('EPSG:32633', indexCoordinate, point)" v-model.lazy="point['coordinatesEPSG:32633'][indexCoordinate]"/>
            </div>
        </div>
        <div>
            <h5 style="font-weight: bold; margin-top: 0; margin-bottom: 3px;">EPSG:32634</h5>
            <div style="display: flex; justify-content: space-between">
                <input v-for="(coordinates, indexCoordinate) in point['coordinatesEPSG:32634']" :key="coordinates" class="form-control" type="number"
                       style="margin-right: 5px;" step="0.01" @keyup.enter="loseFocusInput" @change="changePointCoordinatesEPSG('EPSG:32634', indexCoordinate, point)" v-model.lazy="point['coordinatesEPSG:32634'][indexCoordinate]"/>
            </div>
        </div>
    </div>
</template>

<script>
    import PointMixins from '../mixins';
    const {ConvertDMSToDEG, ConvertDMToDEG} = g3wsdk.core.geoutils;
    const mapEpsg = g3wsdk.core.ApplicationState.map.epsg;
    export default {
        name: 'changepoint',
        props:{
            point: {
                type: Object
            }
        },
        mixins: [PointMixins],
        methods: {
            pointChanged(){
              this.point.changed = true;
                this.$emit('change-point');
            },
            changePointCoordinatesEPSG(epsg_code, index, point){
                const value = point[`coordinates${epsg_code}`][index];
                console.log(value, this.toMinimunDecimals(value, epsg_code === 'EPSG:4326' ? 5 : 2))
                point[`coordinates${epsg_code}`][index] = this.toMinimunDecimals(value, epsg_code === 'EPSG:4326' ? 5 : 2);
                this.covertToEPSG({
                    excludeEPSG: epsg_code,
                    point
                });
                this.toDMS(point);
                this.toDM(point);
                this.pointChanged();
            },
            changePointFeatureCoordinatesDMS(point, index){
                if (index === 2 || index === 6) {
                    const value = point.coordinatesDMS[index];
                    point.coordinatesDMS[index] = this.toMinimunDecimals(value, 2);
                }
                point['coordinatesEPSG:4326'][0] = ConvertDMSToDEG({
                    dms: [point.coordinatesDMS[0], point.coordinatesDMS[1], point.coordinatesDMS[2], point.coordinatesDMS[3]]
                });
                point['coordinatesEPSG:4326'][1] = ConvertDMSToDEG({
                    dms: [point.coordinatesDMS[4], point.coordinatesDMS[5], point.coordinatesDMS[6], point.coordinatesDMS[7]]
                });
                this.covertToEPSG({
                    excludeEPSG: 'EPSG:4326',
                    point
                });
                this.toDM(point);
                this.pointChanged();
            },
            changePointFeatureCoordinatesDM(point, index){
                if (index === 1 || index === 3) {
                    const value = point.coordinatesDM[index];
                    point.coordinatesDM[index] = this.toMinimunDecimals(value, 3);
                }
                point['coordinatesEPSG:4326'][0] = ConvertDMToDEG({
                    dms: [point.coordinatesDM[0], point.coordinatesDM[1]]
                });
                point['coordinatesEPSG:4326'][1] = ConvertDMToDEG({
                    dms: [point.coordinatesDM[2], point.coordinatesDM[3]]
                });
                this.covertToEPSG({
                    excludeEPSG: 'EPSG:4326',
                    point
                });
                this.toDMS(point);
                this.pointChanged();
            }
        }
    };
</script>
