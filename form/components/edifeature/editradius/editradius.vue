<template>
    <edit-feature-component>
        <template v-slot:button>
            <div class="vertex" style="background-color: #FFFFFF; padding: 5px;">
                <button class="btn skin-button" style="width:100%" @click="editRadius">Edita raggio</button>
            </div>
        </template>
    </edit-feature-component>
</template>

<script>
    import EditingRadiusComponent from './editradiuscomponent.vue';
    import EditFeatureComponent from '../editfeature.vue';
    const {GUI, ComponentsFactory} = g3wsdk.gui;
    const EditingService = require('../../../../services/editingservice');
    export default {
        name: 'Radius',
        data(){
            return{}
        },
        components: {
            EditFeatureComponent
        },
        methods :{
            editRadius(){
                const content = ComponentsFactory.build({
                    vueComponentObject: EditingRadiusComponent
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
