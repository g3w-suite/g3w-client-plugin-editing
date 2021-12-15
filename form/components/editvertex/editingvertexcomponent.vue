<template>
    <div class="editingvertexcomponent" style="display: flex; flex-direction: column; justify-content: space-between">
        <div>
            <div style="display: flex; justify-content: space-between">
                <h4 style="font-weight: bold">Lista vertici della feature</h4>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; background-color: #FFFFFF; margin: 5px; padding: 5px" v-for="v in vertex" :key="v">
                <div>
                    <button class="btn skin-button" style="width: 50px;" @mouseover="highLightVertex(v)"  @click="zoomToVertex(v)">
                        <i :class="g3wtemplate.font['marker']"></i>
                    </button>
                </div>
                <div style="justify-self: center">
                   Vertice {{v}}
                </div>
            </div>

        </div>
        <div class="buttons" style="align-self: center; font-weight: bold; width: 100%; display: flex; justify-content: space-between">
            <button v-t-plugin="'editing.form.buttons.save'" class="btn btn-success" style="width: 40%; font-weight: bold" @click="save"></button>
            <button v-t-plugin="'editing.form.buttons.cancel'" class="btn btn-danger" style="width: 40%; font-weight: bold" @click="cancel"></button>
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
            save(){
              this.cancel();
            },
            cancel(){
                GUI.popContent();
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
            this.featureVertex = vertexLayerToolBox.getEditingLayerSource().getFeatures().filter(feature => feature.get('feature_id') == id);
            this.featureVertex.forEach((feature, index) =>{
                this.vertex.push(index)
            })
        },
        beforeDestroy() {
            this.featureVertex = null;
        }
    };
</script>
