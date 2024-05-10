import { EditingWorkflow }                  from '../g3wsdk/workflow/workflow';
import { ConfirmStep }                      from '../workflows';
import { getProjectLayerFeatureById }       from '../utils/getProjectLayerFeatureById';
import { getEditingLayerById }              from '../utils/getEditingLayerById';
import { promisify }                        from '../utils/promisify';
import { setAndUnsetSelectedFeaturesStyle } from '../utils/setAndUnsetSelectedFeaturesStyle';

const { Feature }                     = g3wsdk.core.layer.features;
const { GUI }                         = g3wsdk.gui;
const { t, tPlugin }                  = g3wsdk.core.i18n;

/**
 * @param { Object } commits
 * @param commits.add
 * @param commits.update
 * @param commits.delete
 * 
 * @returns { string } 
 */
function _list_changes(commits, layer) {
  //all features get for editing
  const features  = layer.readFeatures();
  //current editing features (in case of deleting, feature is delete from here)
  const efeatures = layer.readEditingFeatures();
  return Object
    .keys(commits)
    .filter(c => 'relations' !== c)
    .map(c =>
      `<h4>${tPlugin('editing.messages.commit.' + c)} (${ commits[c].length })</h4>`
      + `<ul style="list-style: none; padding-left: 0;">`
      + `${ commits[c].map(item => {
        const id     = item.id || item;
        const type   = item.geometry ? item.geometry.type : '';
        const feat   = features.find(f => id === f.getId()) || {};
        const attrs = Object.entries(feat.getProperties ? feat.getProperties() : {}).sort((a,b) => a[0] > b[0]);
        return `<li style="margin-bottom: 8px;"><details><summary style="display: list-item;font-weight: bold;padding: 0.5em;cursor: pointer;background-color: rgb(255, 255, 0, 0.25);font-size: medium;user-select: none;">${type} #${id}</summary>${
          attrs.map(([k,v]) => {
            console.log(k);
            const edited = feat && v !== feat.get(k);
            const ins = edited ? ` ← <ins style="background-color: lime; text-decoration-line: none;">${ feat.get(k) }</ins>` : '';
            const del = edited ? `<del style="background-color: tomato;">${v}</del>` : '';
            return `<b style="padding-left: 1ch;">${k}</b>: ${ (del + ins) || v} <br>`;
          }).join('')
        }</details></li>`
      }).join('')}`
      + `</ul><hr>`).join('');
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
    steps: [
      new ConfirmStep({
        dialog(inputs) {
          let d = $.Deferred();
          const dialog = GUI.dialog.dialog({
            message: inputs.message,
            title: `${tPlugin("editing.messages.commit_feature")}: "${inputs.layer.getName()}"`,
            buttons: {
              SAVE:   { className: "btn-success", callback() { d.resolve(inputs); },    label: t("save"),   },
              CANCEL: { className: "btn-danger",  callback() { d.reject(); },           label: t(inputs.close ? "exitnosave" : "annul") },
              ...(inputs.close ? { CLOSEMODAL :
                      { className: "btn-primary", callback() { dialog.modal('hide'); }, label:  t("annul") }
              } : {}),
            }
          });
          const promise = d.promise();
          if (inputs.features) {
            setAndUnsetSelectedFeaturesStyle({ promise, inputs, style: this.selectStyle });
          }
          return promise;
        }
      })
    ]
  })

  try {

    await promisify(
      workflow.start({
        inputs: {
          close,
          layer,
          message: _list_changes(commitItems, layer)
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

    promisify(commitPromise).finally(() => dialog.modal('hide')) // hide saving dialog

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