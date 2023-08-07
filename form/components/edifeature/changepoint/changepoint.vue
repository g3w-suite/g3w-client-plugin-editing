<template>
    <div class="coordinates_content" style="width:100%; display: flex; flex-direction: column; justify-content: space-around; ">
        <div>
            <h5 style="font-weight: bold; margin-top: 0; margin-bottom: 3px;">DEGREE</h5>
            <div style="display: flex; justify-content: space-between">
                <input v-for="(coordinate, indexCoordinate) in point['coordinatesEPSG:4326']" :key="coordinate" class="form-control" type="number"
                       style="margin-right: 5px;" step="0.00001"
                       :max="indexCoordinate === 0 ? 180.00000 : 90.00000"
                       :min="indexCoordinate === 0 ? -180.00000 : -90.00000"
                       @change="changePointCoordinatesEPSG('EPSG:4326', indexCoordinate, point)" @keyup.enter="loseFocusInput" v-model.lazy="point['coordinatesEPSG:4326'][indexCoordinate]"/>
            </div>
        </div>
        <div>
            <h5 style="font-weight: bold; margin-top: 0; margin-bottom: 3px;">DMS</h5>
            <div style="display: flex; justify-content: space-between">
                <div style="display: grid; grid-template-columns: 1fr 5px 1fr 5px 1fr 5px 1fr; margin-bottom: 3px; margin-right: 5px; row-gap: 3px; column-gap: 3px;">
                    <input class="form-control" style="padding: 1px;" type="number" max="180" min="-1" @keyup.enter="loseFocusInput" @change="changePointFeatureCoordinatesDMS(point, 0)" v-model.lazy="point.coordinatesDMS[0]"/>°
                    <input class="form-control" style="padding: 1px;" v-disabled="Math.abs(point.coordinatesDMS[0]) === 180" type="number" step="1" max="60" @keyup.enter="loseFocusInput" @change="changePointFeatureCoordinatesDMS(point, 1)" v-model.lazy="point.coordinatesDMS[1]"/>'
                    <input class="form-control" style="padding: 1px;" v-disabled="Math.abs(point.coordinatesDMS[0]) === 180" type="number" step="0.01" max="60.00" min="-0.01" @keyup.enter="loseFocusInput"  @change="changePointFeatureCoordinatesDMS(point, 2)" v-model.lazy="point.coordinatesDMS[2]"/>"
                    <input class="form-control" style="padding: 1px;" @keyup.enter="loseFocusInput" @change="changePointFeatureCoordinatesDMS(point, 3)" v-model.lazy="point.coordinatesDMS[3]"/>
                </div>
                <div style="display: grid; grid-template-columns: 1fr 5px 1fr 5px 1fr 5px 1fr; row-gap: 3px; column-gap: 3px;">
                    <input class="form-control" style="padding: 1px;" type="number" max="90" min="-1" @keyup.enter="loseFocusInput" @change="changePointFeatureCoordinatesDMS(point, 4)" v-model.lazy="point.coordinatesDMS[4]"/>°
                    <input class="form-control" style="padding: 1px;" v-disabled="Math.abs(point.coordinatesDMS[4]) === 90" type="number" step="1" max="60" @keyup.enter="loseFocusInput" @change="changePointFeatureCoordinatesDMS(point, 5)" v-model.lazy="point.coordinatesDMS[5]"/>'
                    <input class="form-control" style="padding: 1px;" v-disabled="Math.abs(point.coordinatesDMS[4]) === 90" type="number" step="0.01" max="60.00" min="-0.01" @keyup.enter="loseFocusInput" @change="changePointFeatureCoordinatesDMS(point, 6)" v-model.lazy="point.coordinatesDMS[6]"/>"
                    <input class="form-control" style="padding: 1px;" @keyup.enter="loseFocusInput" @change="changePointFeatureCoordinatesDMS(point, 7)" v-model.lazy="point.coordinatesDMS[7]"/>
                </div>
            </div>
        </div>
        <div>
            <h5 style="font-weight: bold; margin-top: 0; margin-bottom: 3px;">DM</h5>
            <div style="display: flex; justify-content: space-between">
                <div style="display: grid; grid-template-columns: 1fr 5px 1fr 5px; margin-bottom: 3px; margin-right: 5px; row-gap: 3px; column-gap: 3px;">
                    <input class="form-control" style="padding: 1px;" type="number" max="180" min="-180" @keyup.enter="loseFocusInput" @change="changePointFeatureCoordinatesDM(point, 0)" v-model.lazy="point.coordinatesDM[0]"/>°
                    <input class="form-control" style="padding: 1px;" v-disabled="Math.abs(point.coordinatesDM[0]) === 180" type="number" max="60.000" min="-0.001" step="0.001" @keyup.enter="loseFocusInput" @change="changePointFeatureCoordinatesDM(point, 1)" v-model.lazy="point.coordinatesDM[1]"/>'
                </div>
                <div style="display: grid; grid-template-columns: 1fr 5px 1fr 5px; row-gap: 3px; column-gap: 3px;">
                    <input class="form-control" style="padding: 1px;" type="number" max="90" min="-90" @keyup.enter="loseFocusInput" @change="changePointFeatureCoordinatesDM(point, 2)" v-model.lazy="point.coordinatesDM[2]"/>°
                    <input class="form-control" style="padding: 1px;" v-disabled="Math.abs(point.coordinatesDM[2]) === 90" type="number" max="60.000" min="-0.001" step="0.001" @keyup.enter="loseFocusInput" @change="changePointFeatureCoordinatesDM(point, 3)" v-model.lazy="point.coordinatesDM[3]"/>'
                </div>
            </div>
        </div>
        <div>
            <h5 style="font-weight: bold; margin-top: 0; margin-bottom: 3px;">EPSG:32632 - WGS84/UTM 32N</h5>
            <div style="display: flex; justify-content: space-between">
                <input v-for="(coordinates, indexCoordinate) in point['coordinatesEPSG:32632']" :key="coordinates" class="form-control" type="number"
                       style="margin-right: 5px;" step="0.01" @keyup.enter="loseFocusInput" @change="changePointCoordinatesEPSG('EPSG:32632', indexCoordinate, point)" v-model.lazy="point['coordinatesEPSG:32632'][indexCoordinate]"/>
            </div>
        </div>
        <div>
            <h5 style="font-weight: bold; margin-top: 0; margin-bottom: 3px;">EPSG:32633 - WGS84/UTM 33N</h5>
            <div style="display: flex; justify-content: space-between">
                <input v-for="(coordinates, indexCoordinate) in point['coordinatesEPSG:32633']" :key="coordinates" class="form-control" type="number"
                       style="margin-right: 5px;" step="0.01" @keyup.enter="loseFocusInput" @change="changePointCoordinatesEPSG('EPSG:32633', indexCoordinate, point)" v-model.lazy="point['coordinatesEPSG:32633'][indexCoordinate]"/>
            </div>
        </div>
        <div>
            <h5 style="font-weight: bold; margin-top: 0; margin-bottom: 3px;">EPSG:32634 - WGS84/UTM 34N</h5>
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
            async changePointCoordinatesEPSG(epsg_code, index, point){
                if (epsg_code === 'EPSG:4326') {
                    //DEGREE
                    if (index === 0) { //longitude
                        if (Math.abs(point[`coordinates${epsg_code}`][index]) >= 180) {
                            await this.$nextTick();
                            point[`coordinates${epsg_code}`][index] = point[`coordinates${epsg_code}`][index] > 0 ? 180: -180;
                        }
                    } else if (index === 1) { //latitude
                        if (Math.abs(point[`coordinates${epsg_code}`][index]) >= 90) {
                            await this.$nextTick();
                            point[`coordinates${epsg_code}`][index] =point[`coordinates${epsg_code}`][index] > 0 ? 90 : -90;
                        }
                    }
                }
                const value = point[`coordinates${epsg_code}`][index];
                point[`coordinates${epsg_code}`][index] = this.toMinimunDecimals(value, epsg_code === 'EPSG:4326' ? 5 : 2);
                this.covertToEPSG({
                    excludeEPSG: epsg_code,
                    point
                });
                this.toDMS(point);
                this.toDM(point);
                this.pointChanged();
            },
            async changePointFeatureCoordinatesDMS(point, index){
                /*
                 * https://gitlab.gis3w.it/gis3w/planetek---iim-progettoup/issues/3
                * */
                //DEGREE
                if (index === 0) { //longitude
                    if (point.coordinatesDMS[index] > 180 || point.coordinatesDMS[index] < 0) {
                        await this.$nextTick();
                        point.coordinatesDMS[index] = point.coordinatesDMS[index] > 0 ? 180 : 0;
                        point.coordinatesDMS[index+1] = 0; //set minutes to 0
                        point.coordinatesDMS[index+2] = 0.00; // set seconds to 0
                    }
                } else if (index === 4) { //latitude
                    if (point.coordinatesDMS[index] > 90 || point.coordinatesDMS[index] < 0) {
                        await this.$nextTick();
                        point.coordinatesDMS[index] = point.coordinatesDMS[index] > 0 ? 90 : 0;
                        point.coordinatesDMS[index+1] = 0; //set minutes to 0
                        point.coordinatesDMS[index+2] = 0.00; // set seconds to 0
                    }
                }
                // MINUTES
                else if (index === 1 || index === 5) {
                    //check if more than 59
                    if (point.coordinatesDMS[index] > 59) {
                        //it means that is set manually
                        if (point.coordinatesDMS[index] > 60) {
                            point.coordinatesDMS[index] = 59;
                        } else {
                            if (1*point.coordinatesDMS[index-1] < (index === 1 ? 180 : 90)) {
                                point.coordinatesDMS[index] = 0;
                                point.coordinatesDMS[index-1] = (1*point.coordinatesDMS[index-1]) + 1;
                            } else {
                                point.coordinatesDMS[index] = 59;
                            }
                        }

                    } else if (point.coordinatesDMS[index] < 0) {
                        //it means that is set manually
                        if (point.coordinatesDMS[index] < -1) {
                            point.coordinatesDMS[index] = 0;
                        } else {
                            if (1*point.coordinatesDMS[index-1] > 0) {
                                point.coordinatesDMS[index] = 59;
                                point.coordinatesDMS[index-1] = (1*point.coordinatesDMS[index-1]) - 1;
                            } else {
                                point.coordinatesDMS[index] = 0;
                            }
                        }
                    }
                } //SECONDS
                else if (index === 2 || index === 6) {
                    const value = point.coordinatesDMS[index];
                    point.coordinatesDMS[index] = this.toMinimunDecimals(value, 2);
                    if (point.coordinatesDMS[index] > 59.99) {
                        //it means that is set manually
                        if (point.coordinatesDMS[index] > 60) {
                            point.coordinatesDMS[index] = 59.99;
                        } else {
                            if (Math.abs(point.coordinatesDMS[index-1]) < 90) {
                                point.coordinatesDMS[index] = 0.00;
                                point.coordinatesDMS[index-1] = (1*point.coordinatesDMS[index-1]) + 1;
                                this.changePointFeatureCoordinatesDMS(point, index-1)
                            } else {
                                point.coordinatesDMS[index] = 59.99;
                            }
                        }

                    } else if (point.coordinatesDMS[index] < 0) {
                        //it means that is set manually
                        if (point.coordinatesDMS[index] < -0.01) {
                            point.coordinatesDMS[index] = 0.00;
                        } else {
                            if (Math.abs(point.coordinatesDMS[index-1]) < 90) {
                                point.coordinatesDMS[index] = 0.00;
                                point.coordinatesDMS[index-1] = (1*point.coordinatesDMS[index-1]) - 1;
                                this.changePointFeatureCoordinatesDMS(point, index-1)
                            } else {
                                point.coordinatesDMS[index] = 0.00;
                            }
                        }

                    }
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
            async changePointFeatureCoordinatesDM(point, index) {
                //DEGREE
                if (index === 0) { //longitude
                    if (Math.abs(point.coordinatesDM[index]) >= 180) {
                        await this.$nextTick();
                        point.coordinatesDM[index] = point.coordinatesDM[index] > 0 ? 180: -180;
                        point.coordinatesDM[index+1] = 0.000; //set minutes to 0
                    }
                } else if (index === 2) { //latitude
                    if (Math.abs(point.coordinatesDM[index]) >= 90) {
                        await this.$nextTick();
                        point.coordinatesDM[index] = point.coordinatesDM[index] > 0 ? 90 : -90;
                        point.coordinatesDM[index+1] = 0.000; //set minutes to 0
                    }
                } else { //MINUTES
                    if (index === 1 || index === 4) {
                        const value = point.coordinatesDM[index];
                        point.coordinatesDM[index] = this.toMinimunDecimals(value, 3);
                        if (point.coordinatesDM[index] > 59.999) {
                            if (point.coordinatesDM[index] > 60) {
                                //it means that is set manually
                                point.coordinatesDM[index] = 59.999;
                            } else {
                                //LONGITUDE
                                if (index === 1) {
                                    if (Math.abs(point.coordinatesDM[index-1]) < 180) {
                                        point.coordinatesDM[index-1] = 1*point.coordinatesDM[index-1] + 1;
                                        point.coordinatesDM[index] = 0.000;
                                    }  else {
                                        point.coordinatesDM[index] = 59.999;
                                    }
                                } else { //LATITUDE
                                    if (Math.abs(point.coordinatesDM[index-1]) < 90) {
                                        point.coordinatesDM[index-1] = 1*point.coordinatesDM[index-1] + 1;
                                        point.coordinatesDM[index] = 0.000;
                                    }  else {
                                        point.coordinatesDM[index] = 59.999;
                                    }
                                }
                            }

                        } else if (point.coordinatesDM[index] < 0) {
                            if (point.coordinatesDM[index] < -0.001) {
                                //it means that is set manually
                                point.coordinatesDM[index] = 0.000;
                            } else {
                                if (index === 1) { //LONGITUDE
                                    if (Math.abs(point.coordinatesDM[index-1]) < 180) {
                                        point.coordinatesDM[index-1] = 1*point.coordinatesDM[index-1] - 1;
                                        point.coordinatesDM[index] = 0.000;
                                    }  else {
                                        point.coordinatesDM[index] = 0.000;
                                    }
                                } else { //LATITUDE
                                    if (Math.abs(point.coordinatesDM[index-1]) < 90) {
                                        point.coordinatesDM[index-1] = 1*point.coordinatesDM[index-1] - 1;
                                        point.coordinatesDM[index] = 0.000;
                                    }  else {
                                        point.coordinatesDM[index] = 0.000;
                                    }
                                }
                            }
                        }
                    }
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
