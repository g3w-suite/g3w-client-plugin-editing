import { EditingWorkflow }            from '../g3wsdk/workflow/workflow';
import { ConfirmStep }                from '../workflows';
import { getProjectLayerFeatureById } from '../utils/getProjectLayerFeatureById';
import { getEditingLayerById }        from '../utils/getEditingLayerById';
import { promisify }                  from '../utils/promisify';

const { Feature }                     = g3wsdk.core.layer.features;
const { GUI }                         = g3wsdk.gui;
const t                               = g3wsdk.core.i18n.tPlugin;

/**
 * @param { Object } commits
 * @param commits.add
 * @param commits.update
 * @param commits.delete
 * 
 * @returns { string } 
 */
function _list_changes(commits) {
  return Object
    .keys(commits)
    .filter(c => 'relations' !== c)
    .map(c => `<h4>${t('editing.messages.commit.' + c)} (${ commits[c].length })</h4>`+ `<ul style="padding-left: 1.5em;">${ commits[c].map(item => `<li>#${item.id} ${item.geometry ? item.geometry.type : ''}</li>`).join('')}</ul><hr>`).join('');
}

async function _rollback(relations = {}) {
  return Promise.allSettled(
    Object
    .entries(relations)
    .flatMap(([ layerId, { add, delete: del, update, relations = {}}]) => {
      const source  = getEditingLayerById(layerId).getEditingSource();
      const has_features = source.readFeatures().length > 0; // check if the relation layer has some features
      // get original values
      return [
        // add
        ...(has_features && add || []).map(async ({ id }) => {
          source.removeFeature(source.getFeatureById(id));
        }),
        // update
        ...(has_features && update || []).map(async ({ id }) => {
          const f = await getProjectLayerFeatureById({ layerId, fid: id });
          const feature = source.getFeatureById(id);
          feature.setProperties(f.properties);
          feature.setGeometry(f.geometry);
        }),
        // delete
        ...del.map(async id => {
          const f = await getProjectLayerFeatureById({ layerId, fid: id });
          const feature = new ol.Feature({ geometry: f.geometry })
          feature.setProperties(f.properties);
          feature.setId(id);
          // need to add again to source because it is for relation layer is locked
          source.addFeature(new Feature({ feature }));
        }),
        _rollback(relations),
      ];
    })
  );
}

/**
 * ORIGINAL SOURCE: g3w-client-plugin-editing/services/editingservice.js@v3.7.8
 * 
 * @param { Object } opts
 * @param opts.layer
 * @param opts.commitItems
 * @param opts.close
 * @param opts.commitPromise
 *
 * @returns { Promise<unknown> }
 * 
 * @since g3w-client-plugin-editing@v3.8.0
 */
export async function showCommitModalWindow({
  layer,
  commitItems,
  close,
  commitPromise,
}) {

  /** ORIGINAL SOURCE: g3w-client-plugin-editing/workflows/commitfeaturesworkflow.js@v3.7.1 */
  const workflow = new EditingWorkflow({
    type: 'commitfeatures',
    steps: [ new ConfirmStep({ type: 'commit' }) ]
  })

  try {

    await promisify(
      workflow.start({
        inputs: {
          close,
          layer,
          message: _list_changes(commitItems)
            + (_.isEmpty(commitItems.relations) ? '' : 
              `<h4 style='padding-left: 40%;border-top: #f4f4f4 1px solid;'${ t('editing.relations') }</h4>`
              + Object.entries(commitItems.relations).map(
                ([ relationName, commits]) => `<b>"${ relationName }</b>` + _list_changes(commits)
              ).join('')
            ),
        }
      })
    );

    const dialog = GUI.dialog.dialog({
      message: `<h4 class="text-center"><i style="margin-right: 5px;" class=${GUI.getFontClass('spinner')}></i>${t('editing.messages.saving')}</h4>`,
      closeButton: false
    });

    commitPromise.always(() => dialog.modal('hide')) // hide saving dialog

    // messages set to commit
    return {
      success: {
        message: "plugins.editing.messages.saved",
        autoclose: true,
      },
      error: {},
    };

  } catch (e) {
    await _rollback(commitItems.relations);
    return Promise.reject(e);
  } finally {
    workflow.stop()
  }
}