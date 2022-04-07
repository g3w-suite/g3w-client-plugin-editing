<template>
    <div class="edit_features_and_report_child" style="background-color: #FFFFFF; margin-top: 10px; padding: 10px;">
        <button class="btn skin-button" style="width:100%; margin-bottom: 5px;" @click="addReportFeature" v-t-plugin="'signaler_iim.signaler.add_feature'"></button>
        <button v-if="!isNew" class="btn skin-button" style="width:100%;" @click="updateReportFeatures" v-t-plugin="'signaler_iim.signaler.edit_feature'"></button>
    </div>
</template>

<script>
    import SIGNALER_IIM_CONFIG from '../../../global_plugin_data';
    const {GUI, ComponentsFactory} = g3wsdk.gui;
    import AddFeaturesMethodComponent from './addfeaturemethod.vue';
    const {signaler_field} = SIGNALER_IIM_CONFIG;
    export default {
        name: 'editFeatures',
        data(){
            return {}
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
            async updateReportFeatures(){
                const EditingService = require('../../../services/editingservice');
                EditingService.editingFeaturesReport();
            }
        }
    };
</script>
