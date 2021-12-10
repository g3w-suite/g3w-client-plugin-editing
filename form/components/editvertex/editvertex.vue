<template>
    <div class="vertex" style="background-color: #FFFFFF; margin-top: 10px; padding: 10px;">
        <button class="btn skin-button" style="width:100%" @click="editVertex">Edita vertici</button>
    </div>
</template>

<script>
    import EditingVertexComponent from './editingvertexcomponent.vue';
    const {GUI, ComponentsFactory} = g3wsdk.gui;
    export default {
        name: 'Vertex',
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
        }
    };
</script>
