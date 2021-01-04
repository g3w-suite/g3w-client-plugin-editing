export default {
  it: {
    errors: {
      no_layers: "Si è verificato un errore nel caricamento dei layers in editing.",
      some_layers: "Si è verificato un errore nel caricamento di alcuni layers in editing"
    },
    search: "Cerca",
    editing_data: "Edita Dati",
    editing_attributes: "Edita attributi",
    relations: "Relazioni",
    edit_relation: "Edita relazione",
    back_to_relations: "Ritorna alle Relazioni",
    no_relations_found: "Non ci sono relazioni",
    relation_data: "Dati relativi alla relazione",
    relation_already_added : "Relazione già presente",
    list_of_relations_feature: "Elenco Relazioni della feature ",
    tooltip:{
      edit_layer: "Modifica Layer"
    },
    toolbox: {
      title: 'Edita'
    },
    tools: {
      copy: "Copia features",
      addpart: "Aggiungi Parte",
      deletepart: "Cancella Parte",
      merge: "Dissolvi features",
      split: "Taglia Feature",
      add_feature: "Aggiungi feature",
      delete_feature: "Elimina feature",
      move_feature: "Muovi feature",
      update_vertex: "Aggiorna vertici feature",
      update_feature: "Modifica feature"
    },
    table: {
      edit: "Edita feature",
      copy: "Crea una copia",
      delete: "Cancella feature"
    },
    steps: {
      help: {
        select_elements: "Seleziona le features",
        select_element: "Seleziona la feature",
        copy: "Crea una copia delle feature selezionate",
        merge: "Dissolvi features",
        split: "Taglia Feature",
        new: "Creo una nuova feature",
        edit_table: "Edita le features della tabella",
        draw_new_feature: "Disegna sulla mappa la feature",
        action_confirm: "Conferma azione",
        double_click_delete: "Doppio click sulla feature che vuoi cancellare",
        edit_feature_vertex: "Modifica o aggiungi un vertice alla feature selezionata",
        move: "Muovi la feature selezionata",
        select_feature_to_relation: "Seleziona la feature che vuoi mettere in relazione",
        show_edit_feature_form:  "Mostra il form della feature per poter editare gli attributi",
        pick_feature: "Clicca su una feature per poterla modificare",
        insert_attributes_feature: "Inserisci gli attributi della feature"
      }
    },
    workflow: {
      steps: {
        select: 'Clicca sulla feature da selezionare',
        draw_part: "Disegna la nuova parte",
        merge: 'Seleziona la feature su cui dissolvere',
        selectPoint: "Clicca sulla feature per selezionarla",
        selectSHIFT: 'Seleziona le features tenedo premuto il tasto SHIFT',
        selectDrawBox: "Seleziona le features disegnando un poligono",
        selectPointSHIFT: 'Seleziona le features tenedo premuto il tasto SHIFT (multiselezione) oppure cliccando sulla singola feature',
        copyCTRL: 'Copia le features selezionate con CTRL+C',
        selectStartVertex: 'Seleziona il vertice di partenza delle feature selezionate',
        selectToPaste: 'Seleziona il punto dove verranno incollate le features selezionate',
        draw_split_line: "Disegna una linea per tagliare la feature selezionata"
      }
    },
    messages: {
      splitted: "Feature(s) splittata(e)",
      nosplittedfeature: "La(e) feature(s) non è stata splittata",
      press_esc: "Premi ESC per tornare indietro",
      online: "Ora sei di nuovo ONLINE. Puoi slavare le modifiche in modo permanente",
      offline: "Sei OFFLINE. Tutte le modifiche saranno salvate temporaneamente in locale",
      delete_feature: "Vuoi eliminare l'elemento selezionato?",
      delete_feature_relations: "Cancellando una feature con relazioni associate, tale relazioni rimarranno orfane. Si consiglia di gestire tali relazioni prima di cancellare la feature",
      unlink_relation: "Vuoi staccare la relazione?",
      commit_feature: "Vuoi salvare definitivamente le modifiche",
      change_toolbox_relation: "Layer in relazione. Prima di passare ad altri editing è obbligatorio salvare le modifiche correnti.",
      saved: "I dati sono stati salvati correttamente",
      saved_local: "I dati sono stati salvati correttamente in locale",
      loading_data: "Caricamento dati",
      saving: "Salvataggio dati in corso. Attendere ...",
      constraints: {
        enable_editing: "Aumentare il livello di zoom per abilitare l'editing \nScala di attivazione 1:"
      },
      commit: {
        header: "La lista sotto riporta tutte le modifiche che verranno salvate.",
        header_add: "<b>Aggiunte</b> riporta il numero delle features aggiunte",
        header_update_delete: "<b>Modificate</b> e <b>Cancellate</b> riporta la lista degli id",
        add: "Aggiunte (n. features)",
        delete: "Cancellate(id)",
        update: "Modificate(id)"
      }
    },
    relation: {
      table: {
        info: `<div>Seleziona le relazioni per associarle alla feature in editing.</div>`
      }
    },
    form: {
      relations: {
        tooltips: {
          add_relation: "Crea ed aggiungi nuova relazione",
          link_relation: "Associa una relazione esistente a questa feature",
          open_relation_tools: "Apri strumenti relatione",
          unlink_relation: "Annulla relazione"
        }
      },
      buttons: {
        save: "Salva",
        save_and_back: "Salva e torna al padre",
        cancel: "Cancella"
      }
    }

  },
  en: {
    errors: {
      no_layers: "An error occurs. It's no possible to edit layers",
      some_layers: "An error occurs: It's no possible to edit some layers"
    },
    search: "Search",
    editing_data: "Editing Layers",
    editing_attributes: "Editing attributes",
    relations: "Relations",
    edit_relation: "Edit relation",
    back_to_relations: "Back to Relations",
    no_relations_found: "No relations found",
    relation_data: "Relation data",
    relation_already_added: "Relation already added",
    list_of_relations_feature: "List of relations feature ",
    tooltip: {
      edit_layer: "Edit Layer"
    },
    toolbox: {
      title: 'Edit'
    },
    table: {
      edit: "Edit feature",
      copy: "Create a copy",
      delete: "Delete feature"
    },
    tools: {
      copy: "Copy features",
      addpart: "Add Part",
      deletepart: "Delete Part",
      merge: "Dissolve features",
      split: "Split Feature",
      add_feature: "Add feature",
      delete_feature: "Delete feature",
      move_feature: "Move feature",
      update_vertex: "Update feature vertex",
      update_feature: "Update feature"
    },
    steps: {
      help: {
        select_elements: "Select features",
        select_element: "Select feature",
        copy: "Create new copy of selected features",
        merge: "Dissolve features",
        split: "Split Feature",
        new: "Create new feature",
        edit_table: "Edit table features",
        draw_new_feature: "Draw feature on map",
        action_confirm: "Confirm action",
        double_click_delete: "Double Click on the feature to delete",
        edit_feature_vertex: "Modify or add a vertex on selected feature",
        move: "Move selected feature",
        select_feature_to_relation: "Select feature that you bind relation",
        show_edit_feature_form:  "Show feature form to edit attributes",
        pick_feature: "Click on feature to modify",
        insert_attributes_feature: "Insert attributes of the feature"
      }
    },
    workflow: {
      steps: {
        select: 'Click on feature to select',
        draw_part: "Draw new part",
        merge: 'Select featurewhere dissolve',
        selectSHIFT: 'Select features drawing a rectangle pressing SHIFT',
        selectDrawBox: "Select features drawing a polygon",
        selectPoint: "Click on feature to select",
        selectPointSHIFT: 'Select features drawing a rectangle pressing SHIFT (multifeatre) or click on one feature',
        copyCTRL: 'Copy selected features using CTRL+C',
        selectStartVertex: 'Select starting vertex of selected features',
        selectToPaste: 'Select the point where paste the features selected',
        draw_split_line: "Draw a line to split selected feature"
      }
    },
    messages: {
      splitted: "Splitted",
      nosplittedfeature: "Feature not spitted",
      press_esc: "Press ESC to back",
      online: "Back ONLINE. Now you can save your changes on database",
      offline: "You are OFFLINE. All changes are saved locally",
      delete_feature: "Do you want delete selected feature ?",
      delete_feature_relations: "If feature has bindings relations, these relations become orphans. We suggest to handle these relations before detele this feature",
      unlink_relation: "Do you want unlink relation?",
      commit_feature: "Do you want to save the changes",
      change_toolbox_relation: "Layer has relation/relations. Before switch editing you need to save changes done.",
      saved: "Data saved successfully",
      saved_local:"Data saved locally successfully",
      loading_data: "Loading data",
      saving: "Saving data. Please wait ...",
      constraints: {
        enable_editing: "Please Zoom In to enable editing tools \nActivation scale at 1:"
      },
      pdf: "Document preview not available. Please click here ",
      commit: {
        header: "The following list show all changes to commit.",
        header_add: "<b>Added</b> show the number of features added",
        header_update_delete: "<b>Modified</b> and <b>Deleted</b> show the list of features id",
        add: "Added(n. features)",
        delete: "Deleted(id)",
        update: "Modified(id)"
      }
    },
    relation: {
      table: {
        info: `
                  <div>
                    Select relations to link it to current editing feature.
                  </div>
                  <div>
               
                `
      }
    },
    form: {
      relations: {
        tooltips: {
          add_relation: "Create and link new relation",
          link_relation: "Join a relation to this feature",
          open_relation_tools: "Show relation tools",
          unlink_relation: "Unlink relation"
        }
      },
      buttons: {
        save: "Save",
        save_and_back: "Save and Back",
        cancel: "Cancel"
      }
    },
  },
  fi: {
    errors: {
      no_layers: "Tapahtui virhe. Tasoja ei ole mahdollista muokata.",
      some_layers: "Tapahtui virhe. Jotkin tasot eivät ole muokattavissa."
    },
    search: "Haku",
    editing_data: "Muokataan tasoja",
    editing_attributes: "Muokataan attribuutteja",
    relations: "Relaatiot",
    edit_relation: "Muokkaa relaatiota",
    back_to_relations: "Takaisin relaatioihin",
    no_relations_found: "Relaatioita ei löytynyt",
    relation_data: "Relaation tiedot",
    relation_already_added: "Relaatio on jo lisätty",
    list_of_relations_feature: "Lista relaation ominaisuuksista",
    tooltip: {
      edit_layer: "Muokkaa tasoa"
    },
    toolbox: {
      title: 'Muokkaa'
    },
    table: {
      edit: "Muokkaa ominaisuutta",
      copy: "Luo kopio",
      delete: "Poista ominaisuus"
    },
    tools: {
      copy: "Kopio ominaisuuksia",
      addpart: "Lisää osa",
      deletepart: "Poista osa",
      merge: "Yhdistä ominaisuudet",
      split: "Leikkaa ominaisuus",
      add_feature: "Lisää ominaisuus",
      delete_feature: "Poista ominaisuus",
      move_feature: "Siirrä ominaisuutta",
      update_vertex: "Päivitä pisteen ominaisuutta",
      update_feature: "Päivitä ominaisuus"
    },
    steps: {
      help: {
        select_elements: "Valitse ominaisuudet",
        select_element: "Valitse ominaisuus",
        copy: "Luo kopio valituista ominaisuuksista",
        merge: "Yhdistä ominaisuudet",
        split: "Leikkaa ominaisuus",
        new: "Luo uusi ominaisuus",
        edit_table: "Muuta taulun ominaisuuksia",
        draw_new_feature: "Piirrä ominaisuus kartalle",
        action_confirm: "Hyväksy toiminto",
        double_click_delete: "Kaksoisnapsauta poistettavaa ominaisuutta",
        edit_feature_vertex: "Muuta pistettä tai lisää piste valittuun ominaisuuteen",
        move: "Siirrä valittu ominaisuus",
        select_feature_to_relation: "Valitse relaatio",
        show_edit_feature_form:  "Näytä ominaisuuslomake muokataksesi attribuutteja",
        pick_feature: "Paina muokattavaa ominaisuutta",
        insert_attributes_feature: "Lisää ominaisuuden attribuutit"
      }
    },
    workflow: {
      steps: {
        select: 'Valitse ominaisuus',
        draw_part: "Piirrä uusi osa",
        merge: 'Valitse ominaisuus yhdistääksesi',
        selectSHIFT: 'Paina SHIFT, jos haluat valita kohteita suorakulmiovalinnalla.',  //Tero 10.12.2020
        selectDrawBox: "Piirrä suorakulmio, jonka siältä kohteet valitaan ", //Tero 10.12.2020
        selectPoint: "Valitse ominaisuus",
        selectPointSHIFT: 'Paina SHIFT, jos haluat valita ominaisuuksia suorakulmiovalinnalla, tai valitse yksittäinen ominaisuus.',
        copyCTRL: 'CTRL+C, voit kopioida valitut ominaisuudet.',  //Tero 10.12.2020
        selectStartVertex: 'Osoita valittujen ominaisuuksien alkupiste.',
        selectToPaste: 'Valitse kohta, johon liität valitut ominaisuudet.',
        draw_split_line: "Piirrä viiva, jonka mukaan valittu ominaisuus jaetaan."
      }
    },
    messages: {
      splitted: "Jaettu",
      nosplittedfeature: "Ominaisuutta ei jaettu",
      press_esc: "Paina ESC palataksesi",
      online: "Yhteys muodostettu. Muutokset voidaan tallentaa tietokantaan.",
      offline: "Olet offline-tilassa. Muutokset tallennetaan paikallisesti",
      delete_feature: "Haluatko poistaa valitun ominaisuuden?",
      delete_feature_relations: "Mikäli ominaisuudella on sitovia relaatioita, näistä relaatiosta tulee orpoja. Suosittelemme käsittelemään nämä relaatiot ennen poistamista",
      unlink_relation: "Haluatko poistaa relaation?",
      commit_feature: "Tallennetaanko muutokset?",
      change_toolbox_relation: "Tasolla on relaatio/relaatiota. Ennen muokkauksen aloittamista tulee muutokset tallenttaa.",
      saved: "Tiedot tallennettu onnistuneesti",
      saved_local:"Tiedot on tallennettu onnistuneesti paikallisesti.",
      loading_data: "Ladataan tietoja",
      saving: "Tallentaan tietoja. Odota...",
      constraints: {
        enable_editing: "Lähennä ottaaksesi muokkaustyökalut käyttöön \nAktivointi mittakaava 1:"
      },
      pdf: "Dokumentin esikatselu ei ole saatavilla. Paina tästä ",
      commit: {
        header: "Seuraava luettelo näyttää kaikki muutokset.",
        header_add: "<b>Lisätty</b> näytä lisättyjen ominaisuuksien lukumäärä",
        header_update_delete: "<b>Muokattu</b> ja <b>Poistettu</b> Näytä listä ominaisuuksien id:stä",
        add: "Lisätty(n. ominaisuutta)",
        delete: "Poistettu(id)",
        update: "Muokattu(id)"
      }
    },
    relation: {
      table: {
        info: `
                  <div>
					Valitse relaatiota linkittääksesi ne muokattavaan ominaisuuteen.
                  </div>
                  <div>
               
                `
      }
    },
    form: {
      relations: {
        tooltips: {
          add_relation: "Luo ja linkitä uusi relaatio",
          link_relation: "Liitä relaatio tähän ominaisuuteen",
          open_relation_tools: "Näytä relaatiotyökalut",
          unlink_relation: "Poista relaatio"
        }
      },
      buttons: {
        save: "Tallenna",
        save_and_back: "Tallenna ja palaa",
        cancel: "Peruuta"
      }
    },
  },
  se: {
   errors: {
      no_layers: "Ett fel uppstod. Nivåerna kan inte redigeras.",
      some_layers: "Ett fel uppstod. Vissa nivåer kan inte redigeras."
    },
    search: "Sökning",
    editing_data: "Nivåerna redigeras",
    editing_attributes: "Attributen redigeras",
    relations: "Relationer",
    edit_relation: "Redigera relationen",
    back_to_relations: "Tillbaka till relationerna",
    no_relations_found: "Inga relationer hittades",
    relation_data: "Relationsuppgifter",
    relation_already_added: "Relationen har redan lagts till",
    list_of_relations_feature: "Lista på relationens egenskaper",
    tooltip: {
      edit_layer: "Redigera nivån"
    },
    toolbox: {
      title: 'Redigera'
    },
    table: {
      edit: "Redigera egenskap",
      copy: "Skapa en kopia",
      delete: "Ta bort egenskap"
    },
    tools: {
      copy: "Kopiera egenskaper",
      addpart: "Lägg till del",
      deletepart: "Ta bort del",
      merge: "Slå samman egenskaper",
      split: "Dela upp egenskap",
      add_feature: "Lägg till egenskap",
      delete_feature: "Ta bort egenskap",
      move_feature: "Flytta egenskap",
      update_vertex: "Uppdatera punktens egenskap",
      update_feature: "Uppdatera egenskap"
    },
    steps: {
      help: {
        select_elements: "Välj egenskaper",
        select_element: "Välj egenskapalitse ominaisuus",
        copy: "Skapa kopia av valda egenskaper",
        merge: "Slå samman egenskaper",
        split: "Dela upp egenskap",
        new: "Skapa ny egenskap",
        edit_table: "Ändra egenskaper i tabellen",
        draw_new_feature: "Piirrä ominaisuus kartalle",
        action_confirm: "Godkänn funktionen",
        double_click_delete: "Dubbelklicka på den egenskap som ska tas bort",
        edit_feature_vertex: "Ändra punkten eller lägg till punkten till den valda egenskapen",
        move: "Flytta den valda egenskapen",
        select_feature_to_relation: "Välj relation",
        show_edit_feature_form:  "Visa egenskapsformuläret för redigering av attribut",
        pick_feature: "Tryck på den egenskap som ska redigeras",
        insert_attributes_feature: "Lägg till egenskapens attribut"
      }
    },
    workflow: {
      steps: {
        select: 'Välj egenskap',
        draw_part: "Rita ny del",
        merge: 'Välj egenskap att slå samman',
        selectSHIFT: 'Tryck SHIFT, om du vill välja objekt med hjälp av rektangel.',  //Tero 10.12.2020
        selectDrawBox: "Rita upp den rektangel inom vilken objekten väljs ", //Tero 10.12.2020
        selectPoint: "Välj egenskap",
        selectPointSHIFT: 'Tryck SHIFT, om du vill välja objekt med hjälp av rektangel, eller välj en enskild egenskap.',
        copyCTRL: 'CTRL+C, du kan kopiera valda egenskaper.',  //Tero 10.12.2020
        selectStartVertex: 'Visa startpunkten för valda egenskaper.',
        selectToPaste: 'Välj punkt till vilken de valda egenskaperna ska fogas.',
        draw_split_line: "Rita en linje enligt vilken den valda egenskapen ska uppdelas."
      }
    },
    messages: {
      splitted: "Uppdelad",
      nosplittedfeature: "Egenskapen har inte delats upp",
      press_esc: "Tryck ESC för att gå tillbaka",
      online: "Förbindelsen har upprättats. Ändringar kan sparas i databasen.",
      offline: "Du är i offline-läge. Ändringarna sparas lokalt",
      delete_feature: "Vill du ta bort den valda egenskapen?",
      delete_feature_relations: "Om egenskapen saknar bindande relationer blir dessa relationer föräldralösa. Vi rekommenderar att du behandlar dessa relationer innan du lämnar programmet",
      unlink_relation: "Vill du ta bort relationen?",
      commit_feature: "Ska ändringarna sparas?",
      change_toolbox_relation: "Nivån har en relation/relationer. Spara ändringarna innan du börjar redigera.",
      saved: "Uppgifterna sparades",
      saved_local:"Uppgifterna sparades lokalt.",
      loading_data: "Uppgifterna laddas",
      saving: "Uppgifterna sparas. Vänta...",
      constraints: {
        enable_editing: "Zooma in för att börja använda redigeringsverktyg \nAktivering skala 1:"
      },
      pdf: "Förhandsgranskning av dokument är inte tillgänglig. Tryck här",
      commit: {
        header: "Följande lista visar alla ändringar.",
        header_add: "<b>Tillagda</b> visar antalet egenskaper som lagts till",
        header_update_delete: "<b>Redigerad</b> och <b>Borttagen</b> Visa en lista på egenskapernas id",
        add: "(n. egenskaper) har lagts till",
        delete: "Borttagen (id)",
        update: "Redigerad(id)"
      }
    },
    relation: {
      table: {
        info: `
                  <div>
					Välj relation för länkning till egenskap som ska redigeras.
                  </div>
                  <div>
               
                `
      }
    },
    form: {
      relations: {
        tooltips: {
          add_relation: "Skapa och länka ny relation",
          link_relation: "Foga relationen till denna egenskap",
          open_relation_tools: "Visa relationsverktyg",
          unlink_relation: "Ta bort relation"
        }
      },
      buttons: {
        save: "Spara",
        save_and_back: "Spara och gå tillbaka",
        cancel: "Ångra"
      }
    },
  }
}