<template>
    <div>
<!--        <div style="background-color: #FFFFFF; margin-top: 5px; padding: 5px; font-weight: bold" class="skin-color">{{signal_info}}</div>-->
        <div class="vertex" style="background-color: #FFFFFF; padding: 5px;">
            <button class="btn skin-button" style="width:100%" @click="editVertex">Edita vertici</button>
        </div>
    </div>

</template>

<script>
    import EditingVertexComponent from './editingvertexcomponent.vue';
    const {GUI, ComponentsFactory} = g3wsdk.gui;
    const EditingService = require('../../../services/editingservice');
    export default {
        name: 'Vertex',
        data(){
          return {
              signal_info: null
          }
        },
        methods :{
            editVertex(){
                const content = ComponentsFactory.build({
                    vueComponentObject: EditingVertexComponent
                });
                GUI.pushContent({
                    content,
                    closable: false
                })
            }
        },
        async mounted(){
            await this.$nextTick();
            this.signal_info = EditingService.getCurrentReportData().ab_signal_fields
            //EditingService.getCurrentFeatureReport().isNew() && this.editVertex();
        }
    };
</script>
