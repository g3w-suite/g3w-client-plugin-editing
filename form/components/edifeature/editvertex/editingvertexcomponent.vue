<template>
    <div class="editingvertexcomponent" style="display: flex; flex-direction: column; justify-content: space-between">
        <div style="overflow-y: auto">
            <div style="display: flex; justify-content: space-between">
                <h4 style="font-weight: bold">Lista vertici della feature</h4>
            </div>
            <report-info-component>
                <template v-slot:content>
                    <template v-for="(v, index) in vertex">
                        <div style="display: flex; flex-direction: column; align-items: center; background-color: #FFFFFF; margin: 5px 0 5px 0; padding: 5px">
                            <span :class="[v.show ? g3wtemplate.font['eye-close'] : g3wtemplate.font['eye']]" class="skin-color" @click="toggleVertexCoordinates(index)"
                                  style="font-weight: bold; margin-left: auto; padding: 3px; cursor: pointer"></span>
                            <div style="width: 100%; display: flex; justify-content: space-between; padding: 5px; border: 2px solid #eee; margin-bottom: 5px;" v-show="v.show">
                                <button class="btn skin-button" style="margin-right: 5px;" @mouseover="highLightVertex(index)" @click="zoomToVertex(index)">
                                    <i :class="g3wtemplate.font['marker']"></i>
                                </button>
                                <change-point-component @change-point="changeVertex({index, vertex:v})" :point="v"></change-point-component>
                            </div>
                            <div style="width: 100%; padding:5px; border: 2px solid #eee" class="fields_content">
                                <g3w-input v-for="field in v.fields" :key="field.name"
                                           :changeInput="isValidInputVertex"
                                           @changeInput="isValidInputVertex"
                                           :state="field">
                                </g3w-input>
                            </div>
                        </div>
                    </template>
                </template>
            </report-info-component>
        </div>
        <div class="buttons" style="align-self: center; font-weight: bold; width: 100%; display: flex; justify-content: center">
            <button v-t-plugin="'signaler_iim.form.buttons.save'" class="btn btn-success" v-disabled="!valid" style="min-width: 80px; font-weight: bold; margin: 5px;" @click="save"></button>
            <button v-t-plugin="'signaler_iim.form.buttons.cancel'" class="btn btn-danger" style="min-width: 80px; margin: 5px; font-weight: bold" @click="cancel"></button>
        </div>
    </div>
</template>

<script>
    import SIGNALER_IIM_CONFIG from '../../../../global_plugin_data';
    import ReportInfoComponent from '../../reportinfo.vue';
    import ChangePointComponent  from '../changepoint/changepoint.vue';
    import PointMixins from '../mixins';
    const {findSelfIntersects} = g3wsdk.core.geoutils;
    const {areCoordinatesEqual, getCoordinatesFromGeometry, ConvertDEGToDMS, ConvertDMSToDEG} = g3wsdk.core.geoutils;
    const {isPolygonGeometryType} = g3wsdk.core.geometry.Geometry;
    const mapEpsg = g3wsdk.core.ApplicationState.map.epsg;
    const G3WInput = g3wsdk.gui.vue.Inputs.G3WInput;
    const EditingService = require('../../../../services/editingservice');
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
        mixins: [PointMixins],
        components:{
            'g3w-input':G3WInput,
            ReportInfoComponent,
            ChangePointComponent
        },
        computed:{
          valid(){
              return this.validForm && this.validGeometry;
            }
        },
        methods: {
            toggleVertexCoordinates(index){
                this.vertex[index].show = !this.vertex[index].show;
            },
            changeVertex({index, vertex}={}){
                this.changeVertexFeatureCoordinates(index, vertex);
                this.changeFeatureReportGeometry(vertex);
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
            changeVertexFeatureCoordinates(index, vertex){
              const coordinates = this.getPointCoordinatesInMapProjection(vertex);
              this.featureVertex[index].getGeometry().setCoordinates(coordinates);
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
            const vertexLayerToolBox = EditingService.getToolBoxById(vertex_layer_id);
            const vertexLayer = vertexLayerToolBox.getLayer();
            this.originalVertexCoordinates = [];
            this.featureVertex = EditingService.getVertexFromFeatureReport(this.featureReport);
            this.originalVertexFeature = this.featureVertex.map(feature => feature.clone());
            this.featureVertex.forEach(feature =>{
                const {pointObject:vertex, point_coordinates:vertex_coordinates} = this.createPoint(feature.getGeometry().getCoordinates(), {
                    featureReportIndexVertex: [], // store index vertex of feature
                    show: true
                });
                this.originalfeatureReportGeometryCoordinates.forEach((coordinates, index) =>{
                    areCoordinatesEqual(coordinates, vertex_coordinates) && vertex.featureReportIndexVertex.push(index);
                });
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
