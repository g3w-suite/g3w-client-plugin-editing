<template>
    <edit-feature-component>
        <template v-slot:button>
            <div class="vertex" style="background-color: #FFFFFF; padding: 5px;">
                <button class="btn skin-button" style="width:100%" @click="editVertex">Edita vertici</button>
            </div>
        </template>
    </edit-feature-component>

</template>

<script>
    import EditFeatureComponent from '../editfeature.vue';
    import EditingVertexComponent from './editingvertexcomponent.vue';
    const {GUI, ComponentsFactory} = g3wsdk.gui;
    const EditingService = require('../../../../services/editingservice');
    export default {
        name: 'Vertex',
        components: {
            EditFeatureComponent
        },
        data(){
          return {
              signaler_father_info:[]
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
            Object.values(EditingService.getCurrentReportData().ab_signal_fields).forEach(({label, value}) =>{
                this.signaler_father_info.push({
                    label,
                    value
                });
            })
        }
    };
</script>
