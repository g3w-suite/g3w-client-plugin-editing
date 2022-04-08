<template>
    <div class="childrensignaler_content" style="margin-top: 10px; background-color: #FFFFFF; padding: 5px;">
        <bar-loader :loading="loading"></bar-loader>
        <div v-if="loading == false" class="g3w-signale_iim_plugin_children_signaler_data">
            <div v-for="childsignaler in childrendsignaler" :key="childsignaler.type" class="skin-border-color" style="padding: 5px; border-style: solid; border-width: 2px 0 0 0">
                <div class="childsignaler_header" style="display: flex; justify-content: space-between">
                    <div class="child_title skin-color" style="font-weight: bold; font-size: 1.1em;" v-t-plugin="`signaler_iim.signaler.signaler_types.${childsignaler.type}`"></div>
                </div>
                <template v-if="childsignaler.features.length">
                    <div v-for="child in childsignaler.features" style="display: flex; align-items: baseline; padding: 2px 0 2px 0; border-bottom: 1px solid #eeeeee">
                        <div  v-t-tooltip:right.create="'plugins.signaler_iim.signaler.show_child_signaler'">
                            <button class="btn skin-button" style="margin-right: 5px;" :class="g3wtemplate.font['signaler']" @click.stop.prevent="showChildFeature({url: childsignaler.url, id:child.id})"></button>
                        </div>
                        <div style="font-weight: bold">{{child.id}}</div>
                    </div>
                </template>
                <template v-else>
                    <span style="font-weight: bold" v-t-plugin="'signaler_iim.signaler.no_childred_signaler'"></span>
                </template>
            </div>
        </div>
    </div>
</template>

<script>
    import SIGNALER_IIM_CONFIG from '../global_plugin_data';
    export default {
        name: 'Childrensignaler',
        props: {
          layer: {
              type: Object
          },
          feature: {
              type: Object
          }
        },
        data(){
            const {urls: {signal_type_maps}, relation_signal_types} = SIGNALER_IIM_CONFIG;
            const childrendsignaler = Object.keys(relation_signal_types).map(type => ({
                url: signal_type_maps[type],
                ...relation_signal_types[type],
                features: [],
                type
            }));
            return {
                loading: true,
                childrendsignaler
            }
        },
        methods: {
            loadChildrenData(){
                const EditingService = require('../services/editingservice');
                this.loading = true;
                const promises = [];
                this.childrendsignaler.forEach(({layer_id, features, project_id}, index) =>{
                    this.childrendsignaler[index].features = [];
                    promises.push(EditingService.getChildrenSignaler({
                        project_id,
                        layer_id,
                        signalerFieldValue: this.currentChildSignalerFieldValue
                    }))
                });
                Promise.allSettled(promises).then(responses =>{
                    responses.forEach(({status, value}, index) => {
                        const {result, vector:{data}} = value;
                        if (status === 'fulfilled' && result)
                            data.features.forEach(feature => this.childrendsignaler[index].features.push(feature));
                    })
                }).finally(()=>this.loading = false);
            },
            showChildFeature({url, id}){
                window.open(`${url}?sid=${id}`, '_blank').focus();
            },
        },
        created(){
            this.currentChildSignalerFieldValue = `${this.feature.id}:${SIGNALER_IIM_CONFIG.signal_type}`;
        },
        beforeMount() {
            this.loadChildrenData();
        },
        beforeDestroy() {
            this.currentChildSignalerFieldValue = null;
        }
    };
</script>
