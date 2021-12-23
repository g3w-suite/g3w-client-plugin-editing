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
                            <h5 style="font-weight: bold; margin-top: 0; margin-bottom: 3px;">DEGREE</h5>
                            <div style="display: flex; justify-content: space-between">
                                <input style="margin-right: 5px;" class="form-control" type="number" step="0.1" @change="changeVertexCoordinates(index, v)" v-model="v.coordinates[0]"/>
                                <input class="form-control" type="number" step="0.1" @change="changeVertexCoordinates(index, v)" v-model="v.coordinates[1]">
                            </div>
                        </div>
                        <div>
                            <h5 style="font-weight: bold; margin-top: 0; margin-bottom: 3px;">DMS</h5>
                            <input style="margin-right: 5px;" class="form-control" readonly="true" :value="v.coordinatesDHMS"/>
                        </div>
                        <div>
                            <h5 style="font-weight: bold; margin-top: 0; margin-bottom: 3px;">EPSG:3857</h5>
                            <div style="display: flex; justify-content: space-between">
                                <input class="form-control" style="margin-right: 5px;"  readonly="true" v-model="v.coordinates3857[0]"/>
                                <input class="form-control"  readonly="true" v-model="v.coordinates3857[1]"/>
                            </div>
                        </div>
                    </div>
                </div>
                <div style="width: 100%; padding:5px; border: 2px solid #eee" class="fields_content">
                    <div v-for="field in v.fields" :key="field.name" style="display: flex; flex-direction: column; align-items: center; margin: 5px">
                        <label style="font-weight: bold" >{{field.name}}</label>
                        <input class="form-control" v-disabled="!field.editable" :value="field.value">
                    </div>
                </div>
            </div>
        </div>
        <div class="buttons" style="align-self: center; font-weight: bold; width: 100%; display: flex; justify-content: center">
            <button v-t-plugin="'editing.form.buttons.save'" class="btn btn-success" style="min-width: 80px; font-weight: bold; margin: 5px;" @click="save"></button>
            <button v-t-plugin="'editing.form.buttons.cancel'" class="btn btn-danger" style="min-width: 80px; margin: 5px; font-weight: bold" @click="cancel"></button>
        </div>
    </div>
</template>

<script>
    const {areCoordinatesEqual, getCoordinatesFromGeometry} = g3wsdk.core.geoutils;
    const {isPolygonGeometryType} = g3wsdk.core.geometry.Geometry;
    const EditingService = require('../../../services/editingservice');
    const GUI = g3wsdk.gui.GUI;
    export default {
        name: 'Editingvertexcomponent',
        data(){
            return {
                vertex: []
            }
        },
        methods: {
            toDHMS(vertex){
                vertex.coordinatesDHMS = ol.coordinate.toStringHDMS(vertex.coordinates);
            },
            to3857(vertex){
                vertex.coordinates3857 = ol.proj.transform(vertex.coordinates, 'EPSG:4326', 'EPSG:3857');
            },
            changeVertexCoordinates(index, vertex){
              vertex.coordinates[0] = 1* vertex.coordinates[0];
              vertex.coordinates[1] = 1* vertex.coordinates[1];
              vertex.changed = true;
              this.featureVertex[index].getGeometry().setCoordinates(vertex.coordinates);
              this.toDHMS(vertex);
              this.to3857(vertex);
              this.changeFeatureReportGeometry(vertex);
            },
            getSourceFeatureReport(){
                const featureLayerToolBox = EditingService.getToolBoxById(EditingService.getLayerFeaturesId());
                const feature = featureLayerToolBox.getEditingLayerSource().getFeatures().find(feature => feature.getId() === this.featureReport.getId());
                return feature;
            },
            changeFeatureReportGeometry(vertex){
                const session = EditingService.getToolBoxById(EditingService.getLayerFeaturesId()).getSession();
                const feature = this.getSourceFeatureReport();
                vertex.featureReportIndexVertex.forEach(index =>this.changeFeatureReportCoordinates[index] = vertex.coordinates);
                feature.setGeometry(isPolygonGeometryType(feature.getGeometry().getType()) ?
                        new ol.geom.MultiPolygon([[this.changeFeatureReportCoordinates]])
                        : new ol.geom.MultiLineString([this.changeFeatureReportCoordinates]));
                session.pushUpdate(EditingService.getLayerFeaturesId(), feature, this.originalFeatureReportFeature);
            },
            close(){
                GUI.popContent();
            },
            save(){
                const session = EditingService.getToolBoxById(EditingService.getLayerFeaturesId()).getSession();
                this.vertex.forEach((vertex, index) =>{
                  if (vertex.changed) {
                    const vertexFeature = this.featureVertex[index] ;
                    const originalVertex = this.originalVertexFeature[index];
                    vertexFeature.setGeometry(new ol.geom.Point(vertex.coordinates));
                    session.pushUpdate(EditingService.getLayerVertexId(), vertexFeature, originalVertex);
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
            this.featureReport = EditingService.getCurrentFeatureReport();
            this.originalFeatureReportFeature = this.getSourceFeatureReport().clone();
            this.originalfeatureReportGeometry = this.featureReport.getGeometry();
            this.originalfeatureReportGeometryCoordinates = isPolygonGeometryType(this.originalfeatureReportGeometry.getType()) ?
                    this.originalfeatureReportGeometry.getCoordinates()[0][0] :
                    this.originalfeatureReportGeometry.getCoordinates()[0];
            this.changeFeatureReportCoordinates = [...this.originalfeatureReportGeometryCoordinates];
            const id = this.featureReport.getId();
            const vertexLayerToolBox = EditingService.getToolBoxById(EditingService.getLayerVertexId());
            const vertexLayer = vertexLayerToolBox.getLayer();
            this.originalVertexCoordinates = [];
            this.featureVertex = vertexLayerToolBox.getEditingLayerSource().getFeatures().filter(feature => feature.get('feature_id') == id);
            this.originalVertexFeature = this.featureVertex.map(feature => feature.clone());
            this.featureVertex.forEach(feature =>{
                const vertex = {
                    fields: [],
                    coordinates: null,
                    coordinatesDHMS: null,
                    coordinates3857: null,
                    featureReportIndexVertex: [], // store index vertex of feature
                    changed: false
                };
                vertex.coordinates = feature.getGeometry().getCoordinates();
                this.originalfeatureReportGeometryCoordinates.forEach((coordinates, index) =>{
                    areCoordinatesEqual(coordinates, vertex.coordinates) && vertex.featureReportIndexVertex.push(index);
                });
                this.toDHMS(vertex);
                this.to3857(vertex);
                this.originalVertexCoordinates.push([...vertex.coordinates]);
                vertexLayer.getFieldsWithValues(feature).forEach(({name, editable,value}) =>{
                    vertex.fields.push({
                        name,
                        value,
                        editable
                    })
                });
                this.vertex.push(vertex);
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
            this.originalfeatureReportGeometryCoordinates = null;
            this.changeFeatureReportCoordinates = null;
            this.originalVertexCoordinates = null;
            this.featureVertex = null;
        }
    };
</script>
