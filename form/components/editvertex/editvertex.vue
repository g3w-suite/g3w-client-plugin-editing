<template>
    <div>
        <div style="background-color: #FFFFFF; margin: 4px 0 5px 0; padding: 5px;">
            <div v-for="info in signaler_father_info" style="margin-right: 3px; font-size: 1.3em">
                <span style="font-weight: bold" class="skin-color-dark">{{info.label}}</span>
                <span> : </span>
                <span>{{info.value}}</span>
            </div>
        </div>
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
                    label, value
                });
            })
        }
    };
</script>
