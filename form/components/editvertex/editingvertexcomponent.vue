<template>
    <div class="editingvertexcomponent" style="display: flex; flex-direction: column; justify-content: space-between">
        <div style="overflow-y: auto">
            <div style="display: flex; justify-content: space-between">
                <h4 style="font-weight: bold">Lista vertici della feature</h4>
            </div>
            <div style="display: flex; flex-direction: column; align-items: center; background-color: #FFFFFF; margin: 5px; padding: 5px" v-for="(v, index) in vertex" :key="v">
                <div style="width: 100%; display: flex; justify-content: space-between; padding: 5px; border: 2px solid #eee; margin-bottom: 5px;">
                    <button class="btn skin-button" style="margin-right: 5px;" @mouseover="highLightVertex(index)" @click="zoomToVertex(index)">
                        <i :class="g3wtemplate.font['marker']"></i>
                    </button>
                    <div class="coordinates_content" style="width:100%; display: flex; flex-direction: column; justify-content: space-around; ">
                        <div>
                            <h5 style="font-weight: bold; margin-top: 0; margin-bottom: 3px;">DEGREE(5 decimal)</h5>
                            <div style="display: flex; justify-content: space-between">
                                <input v-for="(coordinate, indexCoordinate) in v['5_coordinatesEPSG:4326']" :key="coordinate" class="form-control" type="number"
                                    style="margin-right: 5px;" step="0.00001" @change="changeVertexCoordinatesDegree(5, index, v)" @keyup.enter="loseFocusInput" v-model.lazy="v['5_coordinatesEPSG:4326'][indexCoordinate]"/>
                            </div>
                        </div>
                        <div>
                            <h5 style="font-weight: bold; margin-top: 0; margin-bottom: 3px;">DMS</h5>
                            <div style="display: flex; justify-content: space-between">
                                <div style="display: grid; grid-template-columns: 1fr 5px 1fr 5px 1fr 5px 1fr; margin-bottom: 3px; margin-right: 5px; row-gap: 3px; column-gap: 3px;">
                                    <input class="form-control" style="padding: 1px;" type="number" @keyup.enter="loseFocusInput" @change="changeVertexFeatureCoordinatesDMS(index, v)" v-model.lazy="v.coordinatesDHMS[0]"/>°
                                    <input class="form-control" style="padding: 1px;" type="number" @keyup.enter="loseFocusInput" @change="changeVertexFeatureCoordinatesDMS(index, v)" v-model.lazy="v.coordinatesDHMS[1]"/>'
                                    <input class="form-control" style="padding: 1px;" type="number" @keyup.enter="loseFocusInput" step="0.1" @change="changeVertexFeatureCoordinatesDMS(index, v)" v-model.lazy="v.coordinatesDHMS[2]"/>"
                                    <input class="form-control" style="padding: 1px;" @keyup.enter="loseFocusInput" @change="changeVertexFeatureCoordinatesDMS(index, v)" v-model.lazy="v.coordinatesDHMS[3]"/>
                                </div>
                                <div style="display: grid; grid-template-columns: 1fr 5px 1fr 5px 1fr 5px 1fr; row-gap: 3px; column-gap: 3px;">
                                    <input class="form-control" style="padding: 1px;" type="number" @keyup.enter="loseFocusInput" @change="changeVertexFeatureCoordinatesDMS(index, v)" v-model.lazy="v.coordinatesDHMS[4]"/>°
                                    <input class="form-control" style="padding: 1px;" type="number" @keyup.enter="loseFocusInput" @change="changeVertexFeatureCoordinatesDMS(index, v)" v-model.lazy="v.coordinatesDHMS[5]"/>'
                                    <input class="form-control" style="padding: 1px;" type="number" @keyup.enter="loseFocusInput" @change="changeVertexFeatureCoordinatesDMS(index, v)" v-model.lazy="v.coordinatesDHMS[6]"/>"
                                    <input class="form-control" style="padding: 1px;" @keyup.enter="loseFocusInput" @change="changeVertexFeatureCoordinatesDMS(index, v)" v-model.lazy="v.coordinatesDHMS[7]"/>
                                </div>
                            </div>
                        </div>
                        <div>
                            <h5 style="font-weight: bold; margin-top: 0; margin-bottom: 3px;">DEGREE(3 decimal)</h5>
                            <div style="display: flex; justify-content: space-between">
                                <input v-for="(coordinate, indexCoordinate) in v['3_coordinatesEPSG:4326']" :key="coordinate" class="form-control" type="number"
                                       style="margin-right: 5px;" step="0.001" @change="changeVertexCoordinatesDegree(3, index, v)" @keyup.enter="loseFocusInput" v-model.lazy="v['3_coordinatesEPSG:4326'][indexCoordinate]"/>
                            </div>
                        </div>
                        <div>
                            <h5 style="font-weight: bold; margin-top: 0; margin-bottom: 3px;">EPSG:3857</h5>
                            <div style="display: flex; justify-content: space-between">
                                <input v-for="(coordinate3857, indexCoordinate) in v['coordinatesEPSG:3857']" :key="coordinate3857" class="form-control" type="number"
                                    style="margin-right: 5px;" step="0.1" @keyup.enter="loseFocusInput" @change="changeVertexCoordinates3857(index, v)" v-model.lazy="v['coordinatesEPSG:3857'][indexCoordinate]"/>
                            </div>
                        </div>
                    </div>
                </div>
                <div style="width: 100%; padding:5px; border: 2px solid #eee" class="fields_content">
                    <g3w-input v-for="field in v.fields" :key="field.name"
                        :changeInput="isValidInputVertex"
                        @changeInput="isValidInputVertex"
                        :state="field">
                    </g3w-input>
                </div>
            </div>
        </div>
        <div class="buttons" style="align-self: center; font-weight: bold; width: 100%; display: flex; justify-content: center">
            <button v-t-plugin="'signaler_iim.form.buttons.save'" class="btn btn-success" v-disabled="!valid" style="min-width: 80px; font-weight: bold; margin: 5px;" @click="save"></button>
            <button v-t-plugin="'signaler_iim.form.buttons.cancel'" class="btn btn-danger" style="min-width: 80px; margin: 5px; font-weight: bold" @click="cancel"></button>
        </div>
    </div>
</template>

<script>
    import SIGNALER_IIM_CONFIG from '../../../global_plugin_data';
    const {findSelfIntersects} = g3wsdk.core.geoutils;
    const {areCoordinatesEqual, getCoordinatesFromGeometry, ConvertDEGToDMS, ConvertDMSToDEG} = g3wsdk.core.geoutils;
    const {isPolygonGeometryType} = g3wsdk.core.geometry.Geometry;
    const mapEpsg = g3wsdk.core.ApplicationState.map.epsg;
    const G3WInput = g3wsdk.gui.vue.Inputs.G3WInput;
    const EditingService = require('../../../services/editingservice');
    const GUI = g3wsdk.gui.GUI;
    export default {
        name: 'Editingvertexcomponent',
        data(){
            return {
                vertex: [],
                validForm: true, // set valid form,
                validGeometry: true
            }
        },
        components:{
            'g3w-input':G3WInput
        },
        computed:{
          valid(){
              return this.validForm && this.validGeometry;
            }
        },
        methods: {
            loseFocusInput(evt){
              evt.target.blur()
            },
            // INPUTS VALIDATION
            isValidInputVertex(input) {
                const index = input.indexVertex;
                this.featureVertex[index].set(input.name, input.value);
                this.vertex[index].changed = true;
                this.validForm = this.vertex.map(vertex => {
                    return vertex.fields
                }).flat().reduce((previous, input) => previous && input.validate.valid, true);
            },
            toDegree(vertex){
                vertex['3_coordinatesEPSG:4326'] = ol.proj.transform(vertex['coordinatesEPSG:3857'], 'EPSG:3857', 'EPSG:4326');
                vertex['5_coordinatesEPSG:4326'] = ol.proj.transform(vertex['coordinatesEPSG:3857'], 'EPSG:3857', 'EPSG:4326');
            },
            toDHMS(vertex){
                vertex.coordinatesDHMS = [
                    ...ConvertDEGToDMS({deg: vertex['5_coordinatesEPSG:4326'][0], lon:true, output: 'Array'}),
                    ...ConvertDEGToDMS({deg:vertex['5_coordinatesEPSG:4326'][1], lat:true, output: 'Array'})
                ];
            },
            to3857(vertex){
                vertex['coordinatesEPSG:3857'] = ol.proj.transform(vertex['5_coordinatesEPSG:4326'], 'EPSG:4326', 'EPSG:3857');
            },
            changeVertexFeatureCoordinatesDMS(index, vertex){
                vertex['5_coordinatesEPSG:4326'][0] = ConvertDMSToDEG({
                    dms: [vertex.coordinatesDHMS[0], vertex.coordinatesDHMS[1], vertex.coordinatesDHMS[2], vertex.coordinatesDHMS[3]]
                });
                vertex['5_coordinatesEPSG:4326'][1] = ConvertDMSToDEG({
                    dms: [vertex.coordinatesDHMS[4], vertex.coordinatesDHMS[5], vertex.coordinatesDHMS[6], vertex.coordinatesDHMS[7]]
                });
                vertex.changed = true;
                this.to3857(vertex);
                this.changeVertexFeatureCoordinates(index, vertex);
                this.changeFeatureReportGeometry(vertex);
            },
            changeVertexFeatureCoordinates(index, vertex){
              let coordinates;
              switch (mapEpsg) {
                  case 'EPSG:4326':
                      coordinates = vertex['5_coordinatesEPSG:4326'];
                      break;
                  case 'EPSG:3857':
                      coordinates = vertex['coordinatesEPSG:3857'];
                      break;
                  default:
                      coordinates = ol.proj.transform(vertex['5_coordinatesEPSG:4326'], 'EPSG:4326', mapEpsg);
              }
              this.featureVertex[index].getGeometry().setCoordinates(coordinates);
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
            changeVertexCoordinates3857(index, vertex){
                vertex['coordinatesEPSG:3857'][index] = 1* vertex['coordinatesEPSG:3857'][index];
                vertex.changed = true;
                this.changeVertexFeatureCoordinates(index, vertex);
                this.toDegree(vertex);
                this.toDHMS(vertex);
                this.changeFeatureReportGeometry(vertex);
            },
            changeVertexCoordinatesDegree(minDecimal, index, vertex){
                const degreeValue = this.toMinimunDecimals(vertex[`${minDecimal}_coordinatesEPSG:4326`][index], minDecimal);
                vertex[`${minDecimal}_coordinatesEPSG:4326`][index] = degreeValue;
                if (minDecimal === 5)vertex[`3_coordinatesEPSG:4326`][index] = degreeValue;
                else vertex[`5_coordinatesEPSG:4326`][index] = this.toMinimunDecimals(vertex['3_coordinatesEPSG:4326'][index], 5);
                vertex.changed = true;
                this.toDHMS(vertex);
                this.to3857(vertex);
                this.changeVertexFeatureCoordinates(index, vertex);
                this.changeFeatureReportGeometry(vertex);
            },
            getSourceFeatureReport(){
                const {geo_layer_id} = SIGNALER_IIM_CONFIG;
                const featureLayerToolBox = EditingService.getToolBoxById(geo_layer_id);
                const feature = featureLayerToolBox.getEditingLayerSource().getFeatures().find(feature => feature.getId() === this.featureReport.getId());
                return feature;
            },
            /**
             * Method to change feature geometry when some vertex change
             * @param vertex
             */
            changeFeatureReportGeometry(vertex){
                const {geo_layer_id} = SIGNALER_IIM_CONFIG;
                const session = EditingService.getToolBoxById(geo_layer_id).getSession();
                const feature = this.getSourceFeatureReport();
                vertex.featureReportIndexVertex.forEach(index => this.changeFeatureReportCoordinates[index] = vertex[`coordinates${mapEpsg}`]);
                feature.setGeometry(isPolygonGeometryType(feature.getGeometry().getType()) ?
                        new ol.geom.MultiPolygon([[this.changeFeatureReportCoordinates]])
                        : new ol.geom.MultiLineString([this.changeFeatureReportCoordinates]));
                if (findSelfIntersects(feature.getGeometry())) this.validGeometry = false;
                else {
                    session.pushUpdate(geo_layer_id, feature, this.originalFeatureReportFeature);
                    this.validGeometry = true;
                }
            },
            close(){
                GUI.popContent();
            },
            save(){
                const {geo_layer_id, vertex_layer_id} = SIGNALER_IIM_CONFIG;
                const session = EditingService.getToolBoxById(geo_layer_id).getSession();
                this.vertex.forEach((vertex, index) => {
                  if (vertex.changed) {
                    const vertexFeature = this.featureVertex[index];
                    const originalVertex = this.originalVertexFeature[index];
                    vertexFeature.setGeometry(new ol.geom.Point(vertex[`coordinates${mapEpsg}`]));
                    session.pushUpdate(vertex_layer_id, vertexFeature, originalVertex);
                  }
              });
              this.close();
            },
            cancel(){
              this.featureVertex.forEach((feature, index) =>{
                  feature.getGeometry().setCoordinates(this.originalVertexCoordinates[index]);
              });
              const feature = this.getSourceFeatureReport();
              feature.setGeometry(new ol.geom.MultiPolygon([[this.originalfeatureReportGeometryCoordinates]]));
              this.close();
            },
            zoomToVertex(index){
                const mapService = GUI.getComponent('map').getService();
                mapService.zoomToFeatures([this.featureVertex[index]], {
                    highlight: true
                })
            },
            highLightVertex(index){
                const mapService = GUI.getComponent('map').getService();
                mapService.highlightFeatures([this.featureVertex[index]], {
                    highlight: true,
                    duration: 1000
                })
            }
        },
        created(){
            const {vertex_layer_id} = SIGNALER_IIM_CONFIG;
            this.featureReport = EditingService.getCurrentFeatureReport();
            this.originalFeatureReportFeature = this.getSourceFeatureReport().clone();
            this.originalfeatureReportGeometry = this.featureReport.getGeometry();
            this.originalfeatureReportGeometryCoordinates = isPolygonGeometryType(this.originalfeatureReportGeometry.getType()) ?
                    this.originalfeatureReportGeometry.getCoordinates()[0][0] :
                    this.originalfeatureReportGeometry.getCoordinates()[0];
            this.changeFeatureReportCoordinates = [...this.originalfeatureReportGeometryCoordinates];
            const id = this.featureReport.getId();
            const vertexLayerToolBox = EditingService.getToolBoxById(vertex_layer_id);
            const vertexLayer = vertexLayerToolBox.getLayer();
            this.originalVertexCoordinates = [];
            this.featureVertex = vertexLayerToolBox.getEditingLayerSource().getFeatures().filter(feature => feature.get('feature_id') == id);
            this.originalVertexFeature = this.featureVertex.map(feature => feature.clone());
            this.featureVertex.forEach(feature =>{
                const vertex = {
                    fields: [],
                    '5_coordinatesEPSG:4326': null,
                    coordinatesDHMS: null,
                    '3_coordinatesEPSG:4326': null,
                    'coordinatesEPSG:3857': null,
                    featureReportIndexVertex: [], // store index vertex of feature
                    changed: false
                };
                let vertex_coordinates;
                if (mapEpsg === 'EPSG:3857') {
                    vertex['coordinatesEPSG:3857'] = feature.getGeometry().getCoordinates();
                    vertex_coordinates = vertex['coordinatesEPSG:3857'];
                    this.toDegree(vertex);
                } else if (mapEpsg === 'EPSG:4326'){
                    vertex['5_coordinatesEPSG:4326'] = feature.getGeometry().getCoordinates();
                    vertex['3_coordinatesEPSG:4326'] = feature.getGeometry().getCoordinates();
                    vertex_coordinates = vertex['5_coordinatesEPSG:4326'];
                    this.to3857(vertex);
                }
                this.originalfeatureReportGeometryCoordinates.forEach((coordinates, index) =>{
                    areCoordinatesEqual(coordinates, vertex_coordinates) && vertex.featureReportIndexVertex.push(index);
                });
                this.toDHMS(vertex);
                this.originalVertexCoordinates.push([...vertex_coordinates]);
                const indexVertex = this.vertex.push(vertex);
                vertexLayer.getFieldsWithValues(feature).forEach(field => {
                    field.indexVertex = indexVertex -1;
                    vertex.fields.push(field)
                });
            })
        },
        async mounted() {
            await this.$nextTick();
        },
        beforeDestroy() {
            this.featureReport = null;
            this.featureVertex = null;
            this.originalVertexCoordinates = null;
            this.originalfeatureReportGeometry = null;
            this.originalFeatureReportFeature = null;
            this.originalfeatureReportGeometryCoordinates = null;
            this.changeFeatureReportCoordinates = null;
            this.originalVertexCoordinates = null;
            this.featureVertex = null;
            this.originalVertexFeature = null;
        }
    };
</script>
