<template>
    <div class="childrensignaler_content" style="margin-top: 10px; background-color: #FFFFFF; padding: 5px;">
        <div class="skin-color-dark" style="font-size: 1.2em; font-weight: bold">Sezione Segnalazioni Figle</div>
        <div class="g3w-signale_iim_plugin_children_signaler_tools" style="display: flex; justify-content: space-between; margin-bottom: 5px;">
            <button v-disabled="loading" class="btn skin-button" style="width: 100%" @click.stop.prevent="loadChildrenData" :class="g3wtemplate.font['refresh']"></button>
        </div>
        <bar-loader :loading="loading"></bar-loader>
        <div v-if="loading == false" class="g3w-signale_iim_plugin_children_signaler_data">
            <div v-for="childsignaler in childrendsignaler" :key="childsignaler.type" class="skin-border-color" style="padding: 5px; border-style: solid; border-width: 2px 0 0 0">
                <div class="childsignaler_header" style="display: flex; justify-content: space-between">
                    <div class="child_title skin-color" style="font-weight: bold; font-size: 1.1em;">{{childsignaler.type}}</div>
                    <button class="btn skin-button" :class="g3wtemplate.font['plus']" @click.stop.prevent="addChildSignaler(childsignaler.type)"></button>
                </div>
                <div v-for="child in childsignaler.children" style="display: flex; align-items: baseline; padding: 2px 0 2px 0; border-bottom: 1px solid #eeeeee">
                    <button class="btn skin-button" style="margin-right: 5px;" :class="g3wtemplate.font['pencil']" @click.stop.prevent="editChildFeature({type: childsignaler.type, id:child})"></button>
                    <div>{{child}}</div>
                </div>
            </div>
        </div>
    </div>
</template>

<script>
    import SIGNALER_IIM_CONFIG from '../../../global_plugin_data';
    const {DataRouterService} = g3wsdk.core.data;

    export default {
        name: 'Childrensignaler',
        data(){
            return {
                loading: false,
                childrendsignaler : [{
                    type: 'Pozzi',
                    children: [1,2,3,4]
                },{
                    type: 'Ostacoli',
                    children: [1,2]
                }]
            }

        },
        methods: {
            loadChildrenData(){
                this.loading = true;
                setTimeout(()=>{
                    this.loading = false;
                }, 2000)
            },
            editChildFeature({type, id}){
                alert(`Edit  ${type} ${id}`)
            },
            addChildSignaler(type){
                alert(`ADD ${type}`)
            }
        },
        created(){
            this.loadChildrenData()
        }
    };
</script>
