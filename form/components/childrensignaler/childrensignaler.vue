<template>
    <div class="childrensignaler_content" style="margin-top: 10px; background-color: #FFFFFF; padding: 5px;">
        <div class="skin-color-dark" style="font-size: 1.2em; font-weight: bold"></div>
        <div class="g3w-signale_iim_plugin_children_signaler_tools" style="display: flex; justify-content: space-between; margin-bottom: 5px;">
            <div style="width: 100%" v-t-tooltip:top.create="'plugins.signaler_iim.signaler.reload'">
                <button style="width: 100%" v-disabled="loading" class="btn skin-button"  @click.stop.prevent="loadChildrenData" :class="g3wtemplate.font['refresh']"></button>
            </div>

        </div>
        <bar-loader :loading="loading"></bar-loader>
        <div v-if="loading == false" class="g3w-signale_iim_plugin_children_signaler_data">
            <div v-for="childsignaler in childrendsignaler" :key="childsignaler.type" class="skin-border-color" style="padding: 5px; border-style: solid; border-width: 2px 0 0 0">
                <div class="childsignaler_header" style="display: flex; justify-content: space-between">
                    <div class="child_title skin-color" style="font-weight: bold; font-size: 1.1em;" v-t-plugin="`signaler_iim.signaler.signaler_types.${childsignaler.type}`"></div>
                    <div v-t-tooltip:top.create="'plugins.signaler_iim.signaler.add_new_child_signaler'">
                        <button class="btn skin-button" :class="g3wtemplate.font['plus']" @click.stop.prevent="addChildSignaler(childsignaler.url)"></button>
                    </div>
                </div>
                <div v-for="child in childsignaler.features" style="display: flex; align-items: baseline; padding: 2px 0 2px 0; border-bottom: 1px solid #eeeeee">
                    <div  v-t-tooltip:right.create="'plugins.signaler_iim.signaler.edit_child_signaler'">
                        <button class="btn skin-button" style="margin-right: 5px;" :class="g3wtemplate.font['pencil']" @click.stop.prevent="editChildFeature({url: childsignaler.url, id:child})"></button>
                    </div>
                    <div style="font-weight: bold">{{child}}</div>
                </div>
            </div>
        </div>
    </div>
</template>

<script>
    import SIGNALER_IIM_CONFIG from '../../../global_plugin_data';
    const EditingService = require('../../../services/editingservice');
    const {XHR} = g3wsdk.core.utils;

    export default {
        name: 'Childrensignaler',
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
                this.loading = true;
                const {signaler_parent_field, urls:{vector}} = SIGNALER_IIM_CONFIG;
                const promises = [];
                this.childrendsignaler.forEach(({layer_id, features, project_id}, index) =>{
                    this.childrendsignaler[index].features = [];
                    promises.push(XHR.get({
                        url: `${vector}/data/qdjango/${project_id}/${layer_id}`,
                        params:{
                            field: `${signaler_parent_field}|eq|${this.currentChildSignalerFieldValue}`,
                            formatter: 1
                        }
                    }))
                });
                Promise.allSettled(promises).then(responses =>{
                    responses.forEach(({status, value}, index) => {
                        const {result, vector:{data}} = value;
                        if (status === 'fulfilled' && result)
                            data.features.forEach(feature =>this.childrendsignaler[index].features.push(feature.id));
                    })
                }).finally(()=>this.loading = false);
            },
            editChildFeature({url, id}){
                window.open(`${url}?sid_edit=${id}`, '_blank').focus();
            },
            addChildSignaler(url){
                window.open(`${url}?sid=new&segn_pad_id=${this.currentChildSignalerFieldValue}`, '_blank').focus();
            }
        },
        created(){
            this.currentChildSignalerFieldValue = `${EditingService.getCurrentReportData().id}:${SIGNALER_IIM_CONFIG.signal_type}`;
        },
        beforeMount() {
            this.loadChildrenData();
        },
        beforeDestroy() {
            this.currentChildSignalerFieldValue = null;
        }
    };
</script>
