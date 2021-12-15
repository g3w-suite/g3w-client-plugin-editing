<template>
    <div class="edit_features" style="background-color: #FFFFFF; margin-top: 10px; padding: 10px;">
        <button class="btn skin-button" style="width:100%" @click="addReportFeature">Aggiungi Features</button>
        <button v-if="!isNew" class="btn skin-button" style="width:100%; margin-top: 5px;" @click="updateReportFeatures">Edita Features</button>
    </div>
</template>

<script>
    const {GUI, ComponentsFactory} = g3wsdk.gui;
    import AddFeaturesMethodComponent from './addfeaturemethod.vue';
    export default {
        name: 'editFeatures',
        data(){
            const EditingService = require('../../../services/editingservice');
            return EditingService.getCurrentReportData();
        },
        methods: {
            // method to add feature
            addReportFeature(){
                const content = ComponentsFactory.build({
                    vueComponentObject: AddFeaturesMethodComponent
                });
                GUI.pushContent({
                    content,
                    closable: false
                })
            },
            updateReportFeatures(){
                const EditingService = require('../../../services/editingservice');
                const reportToolbox = EditingService.getToolBoxById(EditingService.getLayerSegnalazioniId());
                const featuresToolbox = EditingService.getToolBoxById(EditingService.getLayerFeaturesId());
                const {id} = EditingService.getCurrentReportData();
                const options = {
                    filter: {
                        field: `report_id|eq|${this.id}`,
                    }
                };
                reportToolbox.setShow(false);
                featuresToolbox.setShow(true);
                featuresToolbox.setSelected(true);
                featuresToolbox.start(options).then(({features}) =>{
                    GUI.getComponent('map').getService().zoomToFeatures(features);
                    const tool = featuresToolbox.getToolById('editattributes');
                    featuresToolbox.setActiveTool(tool);
                    GUI.setModal(false);
                    GUI.disableSideBar(false);
                });
            }
        }
    };
</script>
