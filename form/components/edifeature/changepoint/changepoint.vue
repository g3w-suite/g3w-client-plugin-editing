<template>
    <div class="coordinates_content" style="width:100%; display: flex; flex-direction: column; justify-content: space-around; ">
        <div>
            <h5 style="font-weight: bold; margin-top: 0; margin-bottom: 3px;">DEGREE(5 decimal)</h5>
            <div style="display: flex; justify-content: space-between">
                <input v-for="(coordinate, indexCoordinate) in point['5_coordinatesEPSG:4326']" :key="coordinate" class="form-control" type="number"
                       style="margin-right: 5px;" step="0.00001" @change="changePointCoordinatesDegree(5, indexCoordinate, point)" @keyup.enter="loseFocusInput" v-model.lazy="point['5_coordinatesEPSG:4326'][indexCoordinate]"/>
            </div>
        </div>
        <div>
            <h5 style="font-weight: bold; margin-top: 0; margin-bottom: 3px;">DMS</h5>
            <div style="display: flex; justify-content: space-between">
                <div style="display: grid; grid-template-columns: 1fr 5px 1fr 5px 1fr 5px 1fr; margin-bottom: 3px; margin-right: 5px; row-gap: 3px; column-gap: 3px;">
                    <input class="form-control" style="padding: 1px;" type="number" @keyup.enter="loseFocusInput" @change="changePointFeatureCoordinatesDMS(point)" v-model.lazy="point.coordinatesDHMS[0]"/>°
                    <input class="form-control" style="padding: 1px;" type="number" @keyup.enter="loseFocusInput" @change="changePointFeatureCoordinatesDMS(point)" v-model.lazy="point.coordinatesDHMS[1]"/>'
                    <input class="form-control" style="padding: 1px;" type="number" @keyup.enter="loseFocusInput" step="0.1" @change="changePointFeatureCoordinatesDMS(point)" v-model.lazy="point.coordinatesDHMS[2]"/>"
                    <input class="form-control" style="padding: 1px;" @keyup.enter="loseFocusInput" @change="changePointFeatureCoordinatesDMS(point)" v-model.lazy="point.coordinatesDHMS[3]"/>
                </div>
                <div style="display: grid; grid-template-columns: 1fr 5px 1fr 5px 1fr 5px 1fr; row-gap: 3px; column-gap: 3px;">
                    <input class="form-control" style="padding: 1px;" type="number" @keyup.enter="loseFocusInput" @change="changePointFeatureCoordinatesDMS(point)" v-model.lazy="point.coordinatesDHMS[4]"/>°
                    <input class="form-control" style="padding: 1px;" type="number" @keyup.enter="loseFocusInput" @change="changePointFeatureCoordinatesDMS(point)" v-model.lazy="point.coordinatesDHMS[5]"/>'
                    <input class="form-control" style="padding: 1px;" type="number" @keyup.enter="loseFocusInput" @change="changePointFeatureCoordinatesDMS(point)" v-model.lazy="point.coordinatesDHMS[6]"/>"
                    <input class="form-control" style="padding: 1px;" @keyup.enter="loseFocusInput" @change="changePointFeatureCoordinatesDMS(point)" v-model.lazy="point.coordinatesDHMS[7]"/>
                </div>
            </div>
        </div>
        <div>
            <h5 style="font-weight: bold; margin-top: 0; margin-bottom: 3px;">DEGREE(3 decimal)</h5>
            <div style="display: flex; justify-content: space-between">
                <input v-for="(coordinate, indexCoordinate) in point['3_coordinatesEPSG:4326']" :key="coordinate" class="form-control" type="number"
                       style="margin-right: 5px;" step="0.001" @change="changePointCoordinatesDegree(3, indexCoordinate, point)" @keyup.enter="loseFocusInput" v-model.lazy="point['3_coordinatesEPSG:4326'][indexCoordinate]"/>
            </div>
        </div>
        <div>
            <h5 style="font-weight: bold; margin-top: 0; margin-bottom: 3px;">EPSG:3857</h5>
            <div style="display: flex; justify-content: space-between">
                <input v-for="(coordinate3857, indexCoordinate) in point['coordinatesEPSG:3857']" :key="coordinate3857" class="form-control" type="number"
                       style="margin-right: 5px;" step="0.1" @keyup.enter="loseFocusInput" @change="changePointCoordinates3857(indexCoordinate, point)" v-model.lazy="point['coordinatesEPSG:3857'][indexCoordinate]"/>
            </div>
        </div>
    </div>
</template>

<script>
    import PointMixins from '../mixins';
    const {ConvertDMSToDEG} = g3wsdk.core.geoutils;
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
            changePointCoordinates3857(index, point){
                point['coordinatesEPSG:3857'][index] = 1* point['coordinatesEPSG:3857'][index];
                this.toDegree(point);
                this.toDHMS(point);
                this.pointChanged();
            },
            changePointCoordinatesDegree(minDecimal, index, point){
                const value = point[`${minDecimal}_coordinatesEPSG:4326`][index];
                point[`${minDecimal}_coordinatesEPSG:4326`][index] = this.toMinimunDecimals( value, minDecimal);
                const otherMinDecimal = minDecimal === 3 ? 5 : 3;
                point[`${otherMinDecimal}_coordinatesEPSG:4326`][index] = this.toMinimunDecimals(value, otherMinDecimal);
                this.toDHMS(point);
                this.to3857(point);
                this.pointChanged();
            },
            changePointFeatureCoordinatesDMS(point){
                point['5_coordinatesEPSG:4326'][0] = ConvertDMSToDEG({
                    dms: [point.coordinatesDHMS[0], point.coordinatesDHMS[1], point.coordinatesDHMS[2], point.coordinatesDHMS[3]]
                });
                point['5_coordinatesEPSG:4326'][1] = ConvertDMSToDEG({
                    dms: [point.coordinatesDHMS[4], point.coordinatesDHMS[5], point.coordinatesDHMS[6], point.coordinatesDHMS[7]]
                });
                this.to3857(point);
                this.pointChanged();
            }
        }
    };
</script>
