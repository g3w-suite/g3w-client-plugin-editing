export default {
  it: {
    signaler: {
      show_father_signaler: "Visualizza segnalazione padre",
      no_childred_signaler: "Nessuna segnalazione figlio",
      notes: "Note",
      add_feature: "Aggiungi Feature",
      edit_feature: "Edita Feature",
      draw: "Disegna",
      vertex_list: "Lista vertici della feature",
      upload_file: "Upload File",
      no_notes: "Nessuna nota associata",
      delete_signaler: {
        title: "Vuoi cancellare la segnalazione?",
        sub_title:"Se cancelli la segnalazione verranno cancellate tutte le eventuali features associate"
      },
      note_info: {
        from_state: "Da stato",
        to_state: "a stato",
        created: "Creato",
        user: "Utente",
        note: "Nota"
      },
      signaler_types: {
        byf:"Campi boe",
        plt:"Piattaforme",
        wel:"Pozzi",
        sls:"Segnalementi sonori e luminosi",
        cab:"Cavi",
        pip:"Condotte",
        obs:"Ostacoli",
        wre:"Relitti",
        fsa:"Zone ittiche",
        pws:"Lavori portual",
        dae:"Escavazioni e dragacci",
        pla:"Planimetrie",
        aeg:"Aereogeneratori",
        iin:"Informazioni nautiche",
        tes:"TEST"
      },
      reload: "Ricarica",
      add_new_child_signaler: "Aggiungi nuova segnalazione figlio",
      edit_child_signaler: "Edita Segnalazione figlio",
      show_child_signaler: "Visualizza segnalazione figlio"
    },
    errors: {
      no_layers: "Si è verificato un errore nel caricamento dei layers in editing.",
      some_layers: "Si è verificato un errore nel caricamento di alcuni layers in editing"
    },
    search: "Cerca",
    editing_reports: "Edita Segnalazioni",
    editing_attributes: "Edita attributi",
    relations: "Relazioni",
    edit_relation: "Edita relazione",
    back_to_relations: "Ritorna alle Relazioni",
    no_relations_found: "Non ci sono relazioni",
    relation_data: "Dati relativi alla relazione",
    relation_already_added : "Relazione già presente",
    list_of_relations_feature: "Elenco Relazioni della feature ",
    tooltip:{
      edit_layer: "Modifica Layer",
      back_to_report: "Ritorna alla Segnalazione"
    },
    toolbox: {
      title: 'Edita'
    },
    tools: {
      copy: "Copia features",
      addpart: "Aggiungi parte alla geometria",
      deletepart: "Cancella parte dalla geometria",
      merge: "Dissolvi features",
      split: "Taglia Feature",
      add_feature: "Aggiungi feature",
      delete_feature: "Elimina feature",
      move_feature: "Muovi feature",
      update_vertex: "Aggiorna vertici feature",
      update_feature: "Modifica attributi feature",
      update_multi_features: "Modifica gli attributi delle features selezionate",
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
        double_click_delete: "Seleziona la feature sulla mappa da cancellare",
        edit_feature_vertex: "Modifica o aggiungi un vertice alla feature selezionata",
        move: "Muovi la feature selezionata",
        select_feature_to_relation: "Seleziona la feature che vuoi mettere in relazione",
        show_edit_feature_form:  "Mostra il form della feature per poter editare gli attributi",
        pick_feature: "Seleziona la feature sulla mappa da modificare",
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
        selectDrawBox: "Seleziona le features disegnando un rettangolo mediante la creazione dei due punti della diagonale",
        selectDrawBoxAtLeast2Feature: "Seleziona almeno 2 features disegnando un rettangolo mediante la creazione dei due punti della diagonale",
        selectPointSHIFT: 'Seleziona le features tenedo premuto il tasto SHIFT (multiselezione) oppure cliccando sulla singola feature',
        selectMultiPointSHIFT: 'Seleziona le features tenedo premuto il tasto SHIFT oppure cliccando sulla singola feature',
        selectMultiPointSHIFTAtLeast2Feature: 'Seleziona almeno 2 features tenedo premuto il tasto SHIFT oppure cliccando sulla singola feature',
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
        add: "Aggiungi",
        save_and_back: "Salva e torna al padre",
        back_to_feature_report: "Torna alla feature",
        cancel: "Cancella"
      }
    }
  },
  en: {
    signaler: {
      show_father_signaler: "Show father signaler",
      no_childred_signaler: "No children signaler",
      notes: "Notes",
      add_feature: "Add Feature",
      edit_feature: "Edit Feature",
      draw: "Draw",
      vertex_list: "Vertex list of feature",
      upload_file: "Upload File",
      no_notes: "No notes found",
      delete_signaler: {
        title: "Are you sure to delete selected signaler?",
        sub_title:"If you delete the signaler you delete all features related to it"
      },
      note_info: {
        from_state: "From state",
        to_state: "to state",
        created: "Created",
        user: "User",
        note: "Note"
      },
      signaler_types: {
        byf:"Buoy fields",
        plt:"Platforms",
        wel:"Wells",
        sls:"Light and sound signals",
        cab:"Cables",
        pip:"Pipelines",
        obs:"Obstacles",
        wre:"Wrecks",
        fsa:"Fish areas",
        pws:"Port works",
        dae:"Dredging and excavations",
        pla:"Planimetries",
        aeg:"Aereo generators",
        iin:"Nutiche information ",
        tes:"TEST"
      },
      reload: "Reload",
      add_new_child_signaler: "Add new child signaler",
      edit_child_signaler: "Edit child signaler",
      show_child_signaler: "Show child signaler"
    },
    errors: {
      no_layers: "An error occurs. It's no possible to edit layers",
      some_layers: "An error occurs: It's no possible to edit some layers"
    },
    search: "Search",
    editing_reports: "Editing Reports",
    editing_attributes: "Editing attributes",
    relations: "Relations",
    edit_relation: "Edit relation",
    back_to_relations: "Back to Relations",
    no_relations_found: "No relations found",
    relation_data: "Relation data",
    relation_already_added: "Relation already added",
    list_of_relations_feature: "List of relations feature ",
    tooltip: {
      edit_layer: "Edit Layer",
      back_to_report: "Back to Report"
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
      addpart: "Add part to multipart",
      deletepart: "Delete part from multipart",
      merge: "Dissolve features",
      split: "Split Feature",
      add_feature: "Add feature",
      delete_feature: "Delete feature",
      move_feature: "Move feature",
      update_vertex: "Update feature vertex",
      update_feature: "Update feature attribute",
      update_multi_features: "Update attributes of selected features",
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
        double_click_delete: "Select feature on map to delete",
        edit_feature_vertex: "Modify or add a vertex on selected feature",
        move: "Move selected feature",
        select_feature_to_relation: "Select feature that you bind relation",
        show_edit_feature_form:  "Show feature form to edit attributes",
        pick_feature: "Select feature on map to modify",
        insert_attributes_feature: "Insert attributes of the feature"
      }
    },
    workflow: {
      steps: {
        select: 'Click on feature to select',
        draw_part: "Draw new part",
        merge: 'Select featurewhere dissolve',
        selectSHIFT: 'Select features drawing a rectangle pressing SHIFT',
        selectDrawBox: "Select features drawing a rectangle by two point of opposite corners",
        selectDrawBoxAtLeast2Feature: "Select at least features drawing a rectangle by two point of opposite corners",
        selectPoint: "Click on feature to select",
        selectPointSHIFT: 'Select features drawing a rectangle pressing SHIFT (multifeatures) or click on one feature',
        selectMultiPointSHIFT: 'Select features drawing a rectangle pressing SHIFT or click on feature',
        selectMultiPointSHIFTAtLeast2Feature: 'Select at least 2 features drawing a rectangle pressing SHIFT or click on feature',
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
        add: "Add",
        save_and_back: "Save and Back",
        back_to_feature_report: "Back To Feature",
        cancel: "Cancel"
      }
    },
  },
  fi: {
    signaler: {
      show_father_signaler: "Show father signaler",
      no_childred_signaler: "No children signaler",
      notes: "Notes",
      add_feature: "Add Feature",
      edit_feature: "Edit Feature",
      draw: "Draw",
      vertex_list: "Vertex list of feature",
      upload_file: "Upload File",
      no_notes: "No notes found",
      delete_signaler: {
        title: "Are you sure to delete selected signaler?",
        sub_title:"If you delete the signaler you delete all features related to it"
      },
      note_info: {
        from_state: "From state",
        to_state: "to state",
        created: "Created",
        user: "User",
        note: "Note"
      },
      signaler_types: {
        byf:"Buoy fields",
        plt:"Platforms",
        wel:"Wells",
        sls:"Light and sound signals",
        cab:"Cables",
        pip:"Pipelines",
        obs:"Obstacles",
        wre:"Wrecks",
        fsa:"Fish areas",
        pws:"Port works",
        dae:"Dredging and excavations",
        pla:"Planimetries",
        aeg:"Aereo generators",
        iin:"Nutiche information ",
        tes:"TEST"
      },
      reload: "Reload",
      add_new_child_signaler: "Add new child signaler",
      edit_child_signaler: "Edit child signaler",
      show_child_signaler: "Show child signaler"
    },
    errors: {
      no_layers: "Tapahtui virhe. Tasoja ei ole mahdollista muokata.",
      some_layers: "Tapahtui virhe. Jotkin tasot eivät ole muokattavissa."
    },
    search: "Haku",
    editing_reports: "Editing Reports",
    editing_attributes: "Muokataan attribuutteja",
    relations: "Relaatiot",
    edit_relation: "Muokkaa relaatiota",
    back_to_relations: "Takaisin relaatioihin",
    no_relations_found: "Relaatioita ei löytynyt",
    relation_data: "Relaation tiedot",
    relation_already_added: "Relaatio on jo lisätty",
    list_of_relations_feature: "Lista relaation ominaisuuksista",
    tooltip: {
      edit_layer: "Muokkaa tasoa",
      back_to_report: "Back to Report"
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
        double_click_delete: "Valitse poistettava ominaisuus kartalta",
        edit_feature_vertex: "Muuta pistettä tai lisää piste valittuun ominaisuuteen",
        move: "Siirrä valittu ominaisuus",
        select_feature_to_relation: "Valitse relaatio",
        show_edit_feature_form:  "Näytä ominaisuuslomake muokataksesi attribuutteja",
        pick_feature: "Valitse muokattava ominaisuus kartalta",
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
        selectDrawBoxAtLeast2Feature: "Piirrä suorakulmio, jonka siältä kohteet vähintään 2 valitaan ",
        selectPoint: "Valitse ominaisuus",
        selectPointSHIFT: 'Paina SHIFT, jos haluat valita ominaisuuksia suorakulmiovalinnalla, tai valitse yksittäinen ominaisuus.',
        selectMultiPointSHIFT: 'Paina SHIFT, jos haluat valita ominaisuuksia suorakulmiovalinnalla, tai valitse yksittäinen ominaisuus.',
        selectMultiPointSHIFTAtLeast2Feature: 'Paina SHIFT, jos haluat valita vähintään 2 ominaisuuksia suorakulmiovalinnalla, tai valitse yksittäinen ominaisuus.',
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
        add: "Add",
        save_and_back: "Tallenna ja palaa",
        back_to_feature_report: "Back To Feature",
        cancel: "Peruuta"
      }
    },
  },
  se: {
    signaler: {
      show_father_signaler: "Show father signaler",
      no_childred_signaler: "No children signaler",
      notes: "Notes",
      add_feature: "Add Feature",
      edit_feature: "Edit Feature",
      draw: "Draw",
      vertex_list: "Vertex list of feature",
      upload_file: "Upload File",
      no_notes: "No notes found",delete_signaler: {
        title: "Are you sure to delete selected signaler?",
        sub_title:"If you delete the signaler you delete all features related to it"
      },
      note_info: {
        from_state: "From state",
        to_state: "to state",
        created: "Created",
        user: "User",
        note: "Note"
      },
      signaler_types: {
        byf:"Buoy fields",
        plt:"Platforms",
        wel:"Wells",
        sls:"Light and sound signals",
        cab:"Cables",
        pip:"Pipelines",
        obs:"Obstacles",
        wre:"Wrecks",
        fsa:"Fish areas",
        pws:"Port works",
        dae:"Dredging and excavations",
        pla:"Planimetries",
        aeg:"Aereo generators",
        iin:"Nutiche information ",
        tes:"TEST"
      },
      reload: "Reload",
      add_new_child_signaler: "Add new child signaler",
      edit_child_signaler: "Edit child signaler",
      show_child_signaler: "Show child signaler"
    },
    errors: {
      no_layers: "Ett fel uppstod. Nivåerna kan inte redigeras.",
      some_layers: "Ett fel uppstod. Vissa nivåer kan inte redigeras."
    },
    search: "Sökning",
    editing_reports: "Editing Reports",
    editing_attributes: "Attributen redigeras",
    relations: "Relationer",
    edit_relation: "Redigera relationen",
    back_to_relations: "Tillbaka till relationerna",
    no_relations_found: "Inga relationer hittades",
    relation_data: "Relationsuppgifter",
    relation_already_added: "Relationen har redan lagts till",
    list_of_relations_feature: "Lista på relationens egenskaper",
    tooltip: {
      edit_layer: "Redigera nivån",
      back_to_report: "Back to Report"
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
        double_click_delete: "Välj funktionen som du vill ta bort på kartan",
        edit_feature_vertex: "Ändra punkten eller lägg till punkten till den valda egenskapen",
        move: "Flytta den valda egenskapen",
        select_feature_to_relation: "Välj relation",
        show_edit_feature_form:  "Visa egenskapsformuläret för redigering av attribut",
        pick_feature: "Välj funktion på kartan för att ändras",
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
        selectDrawBoxAtLeast2Feature: "Rita rektangeln inom vilken minst två objekt är markerade ",
        selectPoint: "Välj egenskap",
        selectPointSHIFT: 'Tryck SHIFT, om du vill välja objekt med hjälp av rektangel, eller välj en enskild egenskap.',
        selectMultiPointSHIFT: 'Tryck SHIFT, om du vill välja objekt med hjälp av rektangel, eller välj en enskild egenskap.',
        selectMultiPointSHIFTAtLeast2Feature: 'Tryck på SKIFT för att välja minst två objekt med en rektangel eller välj en enda egenskap. ',
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
        add: "Add",
        save_and_back: "Spara och gå tillbaka",
        back_to_feature_report: "Back To Feature",
        cancel: "Ångra"
      }
    },
  },
  fr: {
    signaler: {
      show_father_signaler: "Show father signaler",
      no_childred_signaler: "No children signaler",
      notes: "Notes",
      add_feature: "Add Feature",
      edit_feature: "Edit Feature",
      draw: "Draw",
      vertex_list: "Vertex list of feature",
      upload_file: "Upload File",
      no_notes: "No notes found",
      delete_signaler: {
        title: "Are you sure to delete selected signaler?",
        sub_title:"If you delete the signaler you delete all features related to it"
      },
      note_info: {
        from_state: "From state",
        to_state: "to state",
        created: "Created",
        user: "User",
        note: "Note"
      },
      signaler_types: {
        byf:"Buoy fields",
        plt:"Platforms",
        wel:"Wells",
        sls:"Light and sound signals",
        cab:"Cables",
        pip:"Pipelines",
        obs:"Obstacles",
        wre:"Wrecks",
        fsa:"Fish areas",
        pws:"Port works",
        dae:"Dredging and excavations",
        pla:"Planimetries",
        aeg:"Aereo generators",
        iin:"Nutiche information ",
        tes:"TEST"
      },
      reload: "Reload",
      add_new_child_signaler: "Add new child signaler",
      edit_child_signaler: "Edit child signaler",
      show_child_signaler: "Show child signaler"
    },
    errors: {
      no_layers: "Une erreur s'est produite lors du chargement des layers dans l'édition.",
      some_layers: "Une erreur s'est produite lors du chargement de certaines layers dans l'édition."
    },
    search: "Recherche",
    editing_reports: "Modifier les report",
    editing_attributes: "Modifier les attributs",
    relations: "Relations",
    edit_relation: "Modifier la relation",
    back_to_relations: "Retour aux relations",
    no_relations_found: "Il n'y a pas de relations",
    relation_data: "Données sur les relations",
    relation_already_added : "Relation déjà présente",
    list_of_relations_feature: "Lister les relations de la fonctionnalité",
    tooltip:{
      edit_layer: "Modifier le layer",
      back_to_report: "Back to Report"
    },
    toolbox: {
      title: 'Modifier'
    },
    tools: {
      copy: "Copier les fonctionnalités",
      addpart: "Ajouter une pièce à la géométrie",
      deletepart: "Supprimer la partie de la géométrie",
      merge: "Dissoudre les fonctionnalités",
      split: "Couper la fonctionnalité",
      add_feature: "Ajouter une fonctionnalité",
      delete_feature: "Supprimer la fonctionnalité",
      move_feature: "Déplacez la fonctionnalité",
      update_vertex: "Mettre à jour les sommets des fonctionnalités",
      update_feature: "Modifier les attributs des fonctionnalités",
      update_multi_features: "Modifier les attributs des fonctionnalités sélectionnées",
    },
    table: {
      edit: "Modifier fonctionnalités",
      copy: "Créer une copie",
      delete: "Supprimer la fonctionnalité"
    },
    steps: {
      help: {
        select_elements: "Sélectionner les fonctionnalités",
        select_element: "Sélectionner une fonctionnalité",
        copy: "Créer une copie des fonctionnalités sélectionnées",
        merge: "Dissoudre les fonctionnalités",
        split: "Couper la fonctionnalité",
        new: "Créer une nouvelle fonctionnalité",
        edit_table: "Modifier les fonctionnalités de la table",
        draw_new_feature: "Dessiner une fonctionnalité sur la carte",
        action_confirm: "Confirmer l'action",
        double_click_delete: "Sélectionner la fonctionnalité sur la carte à supprimer",
        edit_feature_vertex: "Modifier ou ajouter un sommet à la fonctionnalité sélectionnée",
        move: "Déplacer la fonctionnalité sélectionnée",
        select_feature_to_relation: "Sélectionner la fonctionnalité que vous souhaitez mettre en relation",
        show_edit_feature_form:  "Afficher le formulaire de la fonctionnalité permettant de modifier les attributs",
        pick_feature: "Sélectionner l'élément de la carte à modifier",
        insert_attributes_feature: "Insérer les attributs de la fonctionnalité"
      }
    },
    workflow: {
      steps: {
        select: 'Cliquer sur la fonctionnalité à sélectionner',
        draw_part: "Dessiner la nouvelle partie",
        merge: 'Sélectionner la fonction à introduire en fondu',
        selectPoint: "Cliquer sur la fonctionnalité pour la sélectionner",
        selectSHIFT: 'Sélectionner des fonctionnalités en maintenant la touche SHIFT enfoncée',
        selectDrawBox: "Sélectionner les fonctionnalités en dessinant un rectangle par la création des deux points de la diagonale",
        selectDrawBoxAtLeast2Feature: "Sélectionner au moins 2 fonctionnalités en dessinant un rectangle par la création des deux points de la diagonale",
        selectPointSHIFT: 'Sélectionner des caractéristiques en maintenant la touche SHIFT enfoncée (multi-sélection) ou en cliquant sur une seule caractéristique',
        selectMultiPointSHIFT: 'Sélectionner des fonctionnalités en maintenant la touche SHIFT appuyée ou en cliquant sur la fonctionnalité individuelle',
        selectMultiPointSHIFTAtLeast2Feature: 'Sélectionner au moins 2 fonctionnalités en maintenant la touche SHIFT appuyée ou en cliquant sur la fonctionnalité individuelle',
        copyCTRL: 'Copier les fonctionnalités sélectionnées avec CTRL+C',
        selectStartVertex: 'Sélectionner le sommet de départ des fonctionnalités choisies',
        selectToPaste: 'Sélectionner le point où les fonctionnalités sélectionnées seront collées',
        draw_split_line: "Tracez une ligne pour couper la fonctionnalité sélectionnée"
      }
    },
    messages: {
      splitted: "Fonctionnalité(s) divisé(es)",
      nosplittedfeature: "La (les) fonctionnalité(s) n’a (n'ont) pas été divisé(es)",
      press_esc: "Appuyez sur ESC pour revenir",
      online: "Vous êtes à nouveau EN LIGNE. Vous pouvez enregistrer les modifications de façon permanente",
      offline: "Vous êtes HORS LIGNE. Toutes les modifications seront enregistrées temporairement en local",
      delete_feature: "Voulez-vous supprimer la fonctionnalité sélectionnée ?",
      delete_feature_relations: "La suppression d'une fonctionnalité avec des relations associées laissera ces relations orphelines. Il est recommandé de gérer ces relations avant de supprimer la fonctionnalité",
      unlink_relation: "Voulez-vous détacher la relation ?",
      commit_feature: "Voulez-vous enregistrer définitivement les changements ?",
      change_toolbox_relation: "Layer en relation. Il est obligatoire d'enregistrer les modifications en cours avant de passer à d'autres modifications.",
      saved: "Les données ont été enregistrées correctement",
      saved_local: "Les données ont été correctement sauvegardées localement",
      loading_data: "Chargement des données",
      saving: "Sauvegarde des données. Veuillez patienter ...",
      constraints: {
        enable_editing: "Augmenter le niveau de zoom pour permettre l'édition \nEchelle de déclenchement 1 :"
      },
      commit: {
        header: "La liste ci-dessous montre toutes les modifications qui seront enregistrées.",
        header_add: "<b>Ajouts</b> indique le nombre de fonctionnalités ajoutées",
        header_update_delete: "<b>Modifié</b> e <b>Supprimé</b> liste les ids",
        add: "Ajouté (n. fonctionnalités)",
        delete: "Supprimé(id)",
        update: "Modifié(id)"
      }
    },
    relation: {
      table: {
        info: `<div>Sélectionner les relations pour les associer à l'élément en cours d'édition.</div>`
      }
    },
    form: {
      relations: {
        tooltips: {
          add_relation: "Créer et ajouter une nouvelle relation",
          link_relation: "Associer une relation existante à cette fonctionnalité",
          open_relation_tools: "Outils de relation ouverte",
          unlink_relation: "Annuler la relation"
        }
      },
      buttons: {
        save: "Sauvegarder",
        add: "Add",
        save_and_back: "Sauvegarder et retourner au parent",
        back_to_feature_report: "Back To Feature",
        cancel: "Supprimer"
      }
    }
  }
}