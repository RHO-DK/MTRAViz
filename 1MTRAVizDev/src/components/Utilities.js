

// -- utiities for highlightCrossLanguages:

export function translateToken(hoveredToken, sourceLanguage) {
    let tokenTranslations = {
        EN: [],
        DE: [],
        ES: [] //use other keys if more appropriate
    }

    const germanDictionary = window.loadedDictionaries['DE'];
    const spanishDictionary = window.loadedDictionaries['ES'];
    const germanSpanishDictionary = window.loadedDictionaries['DE_ES'];
    const spanishGermanDictionary = window.loadedDictionaries['ES_DE'];
    const germanEnglishDictionary = window.loadedDictionaries['DE_EN'];
    const spanishEnglishDictionary = window.loadedDictionaries['ES_EN'];

    //add unique tokens and remove duplicates - helper for processiong below
    function addUniqueToken(tokenArray, token) {
        if (!tokenArray.includes(token)) {
            tokenArray.push(token);
        }
    }

    //English
    if (sourceLanguage === 'EN') {
        //save token in EN array
        addUniqueToken(tokenTranslations.EN, hoveredToken);

        //look up the token in the German-English dictionary
        if (germanEnglishDictionary) {
            germanEnglishDictionary.forEach(entry => {
                if (entry.translation.toLowerCase() === hoveredToken.toLowerCase()) {
                    addUniqueToken(tokenTranslations.DE, entry.word);
                }
            });
        }

        //look up the token in the Spanish-English dictionary
        if (spanishEnglishDictionary) {
            spanishEnglishDictionary.forEach(entry => {
                if (entry.translation.toLowerCase() === hoveredToken.toLowerCase()) {
                    addUniqueToken(tokenTranslations.ES, entry.word);
                }
            });
        }
    }

    //German
    else if (sourceLanguage === 'DE') {
        //save token in EN array
        addUniqueToken(tokenTranslations.DE, hoveredToken);

        //look up the token in the German-English dictionary
        if (germanEnglishDictionary) {
            germanEnglishDictionary.forEach(entry => {
                if (entry.word.toLowerCase() === hoveredToken.toLowerCase()) {
                    addUniqueToken(tokenTranslations.EN, entry.translation);
                }
            });
        }

        //look up the token in the German-Spanish dictionary
        if (germanSpanishDictionary) {
            germanSpanishDictionary.forEach(entry => {
                if (entry.word.toLowerCase() === hoveredToken.toLowerCase()) {
                    addUniqueToken(tokenTranslations.ES, entry.translation);
                }
            });
        }

        //Look up the token in the Spanish-German dictionary
        if (spanishGermanDictionary) {
            spanishGermanDictionary.forEach(entry => {
                if (entry.translation.toLowerCase() === hoveredToken.toLowerCase()) {
                    addUniqueToken(tokenTranslations.ES, entry.word);
                }
            });
        }
    }

    // If the source language is Spanish
    else if (sourceLanguage === 'ES') {
        //Save token in ES array
        addUniqueToken(tokenTranslations.ES, hoveredToken);

        //look up the token in the Spanish-English dictionary
        if (spanishEnglishDictionary) {
            spanishEnglishDictionary.forEach(entry => {
                if (entry.word.toLowerCase() === hoveredToken.toLowerCase()) {
                    addUniqueToken(tokenTranslations.EN, entry.translation);
                }
            });
        }

        //look up the token in the Spanish-German dictionary
        if (spanishGermanDictionary) {
            spanishGermanDictionary.forEach(entry => {
                if (entry.word.toLowerCase() === hoveredToken.toLowerCase()) {
                    addUniqueToken(tokenTranslations.DE, entry.translation);
                }
            });
        }

        // Look up the token in the German-Spanish dictionary
        if (germanSpanishDictionary) {
            germanSpanishDictionary.forEach(entry => {
                if (entry.translation.toLowerCase() === hoveredToken.toLowerCase()) {
                    addUniqueToken(tokenTranslations.DE, entry.word);
                }
            });
        }
    }

    //return object
    return tokenTranslations;
}


export function growSynonyms(translationCluster) {
    //Dictionaries:
    const germanDictionary = window.loadedDictionaries['DE'];
    const spanishDictionary = window.loadedDictionaries['ES'];
    const germanSpanishDictionary = window.loadedDictionaries['DE_ES'];
    const spanishGermanDictionary = window.loadedDictionaries['ES_DE'];

    //function to add unique tokens to the cluster
    function addToCluster(token, targetLang, dictionary, cluster) {
        dictionary.forEach(entry => {
            if (entry.word.toLowerCase() === token.toLowerCase() || entry.translation.toLowerCase() === token.toLowerCase()) {
                if (!cluster[targetLang].includes(entry.translation)) {
                    cluster[targetLang].push(entry.translation);
                }
                if (!cluster[targetLang].includes(entry.word)) {
                    cluster[targetLang].push(entry.word);
                }
            }
        });
    }

    //loop over EN tokens - grow DE and ES arrays
    translationCluster.EN.forEach(token => {
        //look up each EN token in DE-EN
        addToCluster(token, 'DE', germanDictionary, translationCluster);

        //Look up each EN token in ES-EN
        addToCluster(token, 'ES', spanishDictionary, translationCluster);
    });

    //loop over DE tokens - grow EN and ES arrays
    translationCluster.DE.forEach(token => {
        //look up each DE token in DE-EN
        addToCluster(token, 'EN', germanDictionary, translationCluster);

        //Look up each DE token in DE-ES
        addToCluster(token, 'ES', germanSpanishDictionary, translationCluster);
    });

    //loop over ES tokens - grow EN and DE arrays
    translationCluster.ES.forEach(token => {
        //look up each ES token in ES-EN
        addToCluster(token, 'EN', spanishDictionary, translationCluster);

        //Look up each ES token in ES-DE
        addToCluster(token, 'DE', spanishGermanDictionary, translationCluster);
    });

    //Last iteration -  to ensure everything is checked backwards
    translationCluster.EN.forEach(token => {
        //DE-EN
        addToCluster(token, 'DE', germanDictionary, translationCluster);

        //ES-EN again
        addToCluster(token, 'ES', spanishDictionary, translationCluster);
    });

    //remove duplicates
    Object.keys(translationCluster).forEach(language => {
        translationCluster[language] = [...new Set(translationCluster[language])];
    });

    console.log('Expanded Translation Cluster:', translationCluster);
    return translationCluster;
}



//-- utilities for align method - make sure dictionaries are loaded:
// AND load them only once
export async function loadDictionaries() {
    if (!window.loadedDictionaries) {
        window.loadedDictionaries = {};  //initialize globally
    }

    //Load German dictionary IF not already loaded
    if (!window.loadedDictionaries.DE) {
        try {
            const germanDictionary = await fetch('src/dictionaries/de_dictionaryParsed.json').then(response => response.json());
            window.loadedDictionaries.DE = germanDictionary;
            console.log("German dictionary loaded.");
        } catch (error) {
            console.error("Error loading German dictionary:", error);
        }
    }

    //Load Spanish dictionary IF not already loaded
    if (!window.loadedDictionaries.ES) {
        try {
            const spanishDictionary = await fetch('src/dictionaries/es_dictionaryParsed.json').then(response => response.json());
            window.loadedDictionaries.ES = spanishDictionary;
            console.log("Spanish dictionary loaded.");
        } catch (error) {
            console.error("Error loading Spanish dictionary:", error);
        }
    }

    //Load German-to-Spanish dictionary IF not already loaded
    if (!window.loadedDictionaries.DE_ES) {
        try {
            const germanSpanishDictionary = await fetch('src/dictionaries/de_to_es_dictionaryParsed.json').then(response => response.json());
            window.loadedDictionaries.DE_ES = germanSpanishDictionary;
            console.log("German to Spanish dictionary loaded.");
        } catch (error) {
            console.error("Error loading German to Spanish dictionary:", error);
        }
    }

    //Load the Spanish-to-German dictionary IF not already loaded
    if (!window.loadedDictionaries.ES_DE) {
        try {
            const spanishGermanDictionary = await fetch('src/dictionaries/es_to_de_dictionaryParsed.json').then(response => response.json());
            window.loadedDictionaries.ES_DE = spanishGermanDictionary;
            console.log("Spanish to German dictionary loaded.");
        } catch (error) {
            console.error("Error loading Spanish to German dictionary:", error);
        }
    }
}






