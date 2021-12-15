<template>
    <div class="editingvertexcomponent" style="display: flex; flex-direction: column; justify-content: space-between">
        <div>
            <h4>Lista vertici della feature</h4>
            <div style="display: flex; justify-content: space-between; align-items: center; background-color: #FFFFFF; margin: 5px; padding: 5px" v-for="v in vertex" :key="v">
                <div>
                    <button class="btn skin-button" style="width: 50px;" @click="zoomToVertex(v)">
                        <i :class="g3wtemplate.font['marker']"></i>
                    </button>
                    <button class="btn skin-button" style="width: 50px;" @click="editVertex(v)">
                        <i :class="g3wtemplate.font['pencil']"></i>
                    </button>
                </div>
                <div style="justify-self: center">
                   Vertice {{v}}
                </div>
                <button class="btn skin-button" style="width: 50px;" @click="editVertex(v)">
                    <i :class="g3wtemplate.font['plus']"></i>
                </button>
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
              console.log('qui')
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
            editVertex(index){
                alert(this.featureVertex[index].getGeometry().getCoordinates())
            }
        },
        created(){
            const EditingService = require('../../../services/editingservice');
            const {id} = EditingService.getCurrentFeatureReportData();
            const vertexLayer = EditingService.getLayerById(EditingService.getLayerVertexId());
            // load vertex of feature
            this.featureVertex = vertexLayer.getSource().getFeatures().filter(feature => feature.get('feature_id') === id);
            this.featureVertex.forEach((feature, index) =>{
                this.vertex.push(index)
            })
        },
        beforeDestroy() {
            this.featureVertex = null;
        }
    };
</script>
