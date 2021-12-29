<template>
    <div class="edit_features_and_report_child" style="background-color: #FFFFFF; margin-top: 10px; padding: 10px;">
<!--        <button class="btn skin-button" style="width:100%; margin-bottom: 5px;" @click="editReportChild">Edita Report Relazionate</button>-->
        <button class="btn skin-button" style="width:100%; margin-bottom: 5px;" @click="addReportFeature">Aggiungi Features</button>
        <button v-if="!isNew" class="btn skin-button" style="width:100%;" @click="updateReportFeatures">Edita Features</button>
    </div>
</template>

<script>
    import {REPORT_FIELD} from '../../../constant';
    const {GUI, ComponentsFactory} = g3wsdk.gui;
    import AddFeaturesMethodComponent from './addfeaturemethod.vue';
    export default {
        name: 'editFeatures',
        data(){
            return {}
        },
        methods: {
            editReportChild(){
                const EditingService = require('../../../services/editingservice');
                const id = EditingService.getCurrentReportData().id;
                window.open(`http://192.168.1.3:3000/?project=segnalatore-planetek-3857/qdjango/104&${REPORT_FIELD}=${id}`,'_blank');
            },
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
