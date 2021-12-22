<template>
    <div class="editingvertexcomponent" style="display: flex; flex-direction: column; justify-content: space-between">
        <div style="overflow-y: auto">
            <div style="display: flex; justify-content: space-between">
                <h4 style="font-weight: bold">Lista vertici della feature</h4>
            </div>
            <div style="display: flex; flex-direction: column; align-items: center; background-color: #FFFFFF; margin: 5px; padding: 5px" v-for="(v, index) in vertex" :key="v">
                <div style="width: 100%; display: flex; justify-content: space-between">
                    <button class="btn skin-button" style="width: 50px;" @mouseover="highLightVertex(index)" @click="zoomToVertex(index)">
                        <i :class="g3wtemplate.font['marker']"></i>
                    </button>
                    <div style="width:100%; display: flex; justify-content: space-around; margin-left: 5px;">
                        <div>
                            <h5 style="font-weight: bold">DEGREE</h5>
                            <input style="margin-right: 5px;" class="form-control" type="number" @change="changeVertexCoordinates(index, v)" v-model="v.coordinates[0]"/>
                            <input class="form-control" type="number" @change="changeVertexCoordinates(index, v)" v-model="v.coordinates[1]">
                        </div>
                        <div>
                            <h5 style="font-weight: bold">DMS</h5>
                            <input style="margin-right: 5px;" class="form-control" readonly="true" :value="v.coordinatesDHMS"/>
                        </div>
                        <div>
                            <h5 style="font-weight: bold">EPSG:3857</h5>
                            <input style="margin-right: 5px;" class="form-control"  readonly="true" v-model="v.coordinates3857[0]"/>
                            <input style="margin-right: 5px;" class="form-control"  readonly="true" v-model="v.coordinates3857[1]"/>
                        </div>
                    </div>
                </div>
                <div style="width: 100%" class="fields_content">
                    <div v-for="field in v.fields" :key="field.name" style="display: flex; flex-direction: column; align-items: center; margin: 5px">
                        <label style="font-weight: bold" >{{field.name}}</label>
                        <input class="form-control" :value="field.value">
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
              this.featureVertex[index].getGeometry().setCoordinates(vertex.coordinates);
              this.toDHMS(vertex);
              this.to3857(vertex);
            },
            close(){
                GUI.popContent();
            },
            save(){
              this.close();
            },
            cancel(){
              this.featureVertex.forEach((feature, index) =>{
                  feature.getGeometry().setCoordinates(this.originalVertexCoordinates[index]);
              });
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
            const EditingService = require('../../../services/editingservice');
            const {id} = EditingService.getCurrentFeatureReportData();
            const vertexLayerToolBox = EditingService.getToolBoxById(EditingService.getLayerVertexId());
            const vertexLayer = vertexLayerToolBox.getLayer();
            this.originalVertexCoordinates = [];
            this.featureVertex = vertexLayerToolBox.getEditingLayerSource().getFeatures().filter(feature => feature.get('feature_id') == id);
            this.featureVertex.forEach(feature =>{
                const vertex = {
                    fields: [],
                    coordinates: null,
                    coordinatesDHMS: null,
                    coordinates3857: null
                };
                vertex.coordinates = feature.getGeometry().getCoordinates();
                this.toDHMS(vertex);
                this.to3857(vertex);
                this.originalVertexCoordinates.push([...vertex.coordinates]);
                vertexLayer.getFieldsWithValues(feature).forEach(({name, editable,value}) =>{
                    editable && vertex.fields.push({
                        name,
                        value
                    })
                });
                this.vertex.push(vertex);
            })
        },
        async mounted() {
            await this.$nextTick();

        },
        beforeDestroy() {
            this.featureVertex = null;
            this.originalVertexCoordinates = null;
        }
    };
</script>
