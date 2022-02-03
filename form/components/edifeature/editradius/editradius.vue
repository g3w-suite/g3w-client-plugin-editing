<template>
    <report-info-component>
        <template v-slot:content>
            <div class="radius" style="background-color: #FFFFFF; padding: 5px;">
                <button class="btn skin-button" style="width:100%" @click="editRadiusAndCenter">Edita geometria</button>
            </div>
        </template>
    </report-info-component>
</template>

<script>
    import EditingRadiusAndCenterComponent from './editradiusandcentercomponent.vue';
    import ReportInfoComponent from '../../reportinfo.vue';
    const {GUI, ComponentsFactory} = g3wsdk.gui;
    const EditingService = require('../../../../services/editingservice');
    export default {
        name: 'Radius',
        data(){
            return{}
        },
        components: {
            ReportInfoComponent
        },
        methods :{
            editRadiusAndCenter(){
                const content = ComponentsFactory.build({
                    vueComponentObject: EditingRadiusAndCenterComponent
                });
                GUI.pushContent({
                    content,
                    closable: false
                })
            }
        },
        async mounted(){}
    };
</script>
