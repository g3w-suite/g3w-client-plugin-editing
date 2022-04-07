<template>
    <div class="g3w_signaler_iim_show_signaler_notes" style="background-color: #FFFFFF; margin-top: 10px; padding: 5px;">
        <button v-t-tooltip:top.create="'plugins.signaler_iim.signaler.notes'" class="btn skin-button" style="width:100%;" @click="showSignalerNotes">
            <i style="color: #FFFFFF !important; font-weight: bold" :class=" g3wtemplate.font['signaler_iim_notes']"></i>
        </button>
    </div>
</template>

<script>
    const EditingService = require('../../../services/editingservice');
    export default {
        name: 'Showsignalernotes',
        methods: {
            showSignalerNotes(){
                EditingService.showSignalerNotes({back:true});
            }
        }
    };
</script>
