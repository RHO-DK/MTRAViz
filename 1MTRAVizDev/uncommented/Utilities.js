

export function translateToken(hoveredToken, sourceLanguage) {
    let tokenTranslations = {
        EN: [],
        DE: [],
        ES: [] 
    };

    const germanDictionary = window.loadedDictionaries['DE'];
    const spanishDictionary = window.loadedDictionaries['ES'];
    const germanSpanishDictionary = window.loadedDictionaries['DE_ES'];
    const spanishGermanDictionary = window.loadedDictionaries['ES_DE'];
    const germanEnglishDictionary = window.loadedDictionaries['DE_EN'];
    const spanishEnglishDictionary = window.loadedDictionaries['ES_EN'];

   
    function addUniqueToken(tokenArray, token) {
        if (!tokenArray.includes(token)) {
            tokenArray.push(token);
        }
    }

    
    if (sourceLanguage === 'EN') {
        
        addUniqueToken(tokenTranslations.EN, hoveredToken);

        
        if (germanEnglishDictionary) {
            germanEnglishDictionary.forEach(entry => {
                if (entry.translation.toLowerCase() === hoveredToken.toLowerCase()) {
                    addUniqueToken(tokenTranslations.DE, entry.word);
                }
            });
        }

        
        if (spanishEnglishDictionary) {
            spanishEnglishDictionary.forEach(entry => {
                if (entry.translation.toLowerCase() === hoveredToken.toLowerCase()) {
                    addUniqueToken(tokenTranslations.ES, entry.word);
                }
            });
        }
    }

    
    else if (sourceLanguage === 'DE') {
        
        addUniqueToken(tokenTranslations.DE, hoveredToken);

        
        if (germanEnglishDictionary) {
            germanEnglishDictionary.forEach(entry => {
                if (entry.word.toLowerCase() === hoveredToken.toLowerCase()) {
                    addUniqueToken(tokenTranslations.EN, entry.translation);
                }
            });
        }

        
        if (germanSpanishDictionary) {
            germanSpanishDictionary.forEach(entry => {
                if (entry.word.toLowerCase() === hoveredToken.toLowerCase()) {
                    addUniqueToken(tokenTranslations.ES, entry.translation);
                }
            });
        }

        
        if (spanishGermanDictionary) {
            spanishGermanDictionary.forEach(entry => {
                if (entry.translation.toLowerCase() === hoveredToken.toLowerCase()) {
                    addUniqueToken(tokenTranslations.ES, entry.word);
                }
            });
        }
    }

    
    else if (sourceLanguage === 'ES') {
        
        addUniqueToken(tokenTranslations.ES, hoveredToken);

        
        if (spanishEnglishDictionary) {
            spanishEnglishDictionary.forEach(entry => {
                if (entry.word.toLowerCase() === hoveredToken.toLowerCase()) {
                    addUniqueToken(tokenTranslations.EN, entry.translation);
                }
            });
        }

        
        if (spanishGermanDictionary) {
            spanishGermanDictionary.forEach(entry => {
                if (entry.word.toLowerCase() === hoveredToken.toLowerCase()) {
                    addUniqueToken(tokenTranslations.DE, entry.translation);
                }
            });
        }

       
        if (germanSpanishDictionary) {
            germanSpanishDictionary.forEach(entry => {
                if (entry.translation.toLowerCase() === hoveredToken.toLowerCase()) {
                    addUniqueToken(tokenTranslations.DE, entry.word);
                }
            });
        }
    }

    return tokenTranslations;
}


export function growSynonyms(translationCluster) {
    /
    const germanDictionary = window.loadedDictionaries['DE'];
    const spanishDictionary = window.loadedDictionaries['ES'];
    const germanSpanishDictionary = window.loadedDictionaries['DE_ES'];
    const spanishGermanDictionary = window.loadedDictionaries['ES_DE'];

    
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

    
    translationCluster.EN.forEach(token => {
        
        addToCluster(token, 'DE', germanDictionary, translationCluster);

        
        addToCluster(token, 'ES', spanishDictionary, translationCluster);
    });

    
    translationCluster.DE.forEach(token => {
        
        addToCluster(token, 'EN', germanDictionary, translationCluster);

        
        addToCluster(token, 'ES', germanSpanishDictionary, translationCluster);
    });

    
    translationCluster.ES.forEach(token => {
       
        addToCluster(token, 'EN', spanishDictionary, translationCluster);

       
        addToCluster(token, 'DE', spanishGermanDictionary, translationCluster);
    });

    
    translationCluster.EN.forEach(token => {
        
        addToCluster(token, 'DE', germanDictionary, translationCluster);

        
        addToCluster(token, 'ES', spanishDictionary, translationCluster);
    });

    
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
        window.loadedDictionaries = {};
    }

    
    if (!window.loadedDictionaries.DE) {
        try {
            const germanDictionary = await fetch('src/dictionaries/de_dictionaryParsed.json').then(response => response.json());
            window.loadedDictionaries.DE = germanDictionary;
            console.log("German dictionary loaded.");
        } catch (error) {
            console.error("Error loading German dictionary:", error);
        }
    }

    
    if (!window.loadedDictionaries.ES) {
        try {
            const spanishDictionary = await fetch('src/dictionaries/es_dictionaryParsed.json').then(response => response.json());
            window.loadedDictionaries.ES = spanishDictionary;
            console.log("Spanish dictionary loaded.");
        } catch (error) {
            console.error("Error loading Spanish dictionary:", error);
        }
    }

    
    if (!window.loadedDictionaries.DE_ES) {
        try {
            const germanSpanishDictionary = await fetch('src/dictionaries/de_to_es_dictionaryParsed.json').then(response => response.json());
            window.loadedDictionaries.DE_ES = germanSpanishDictionary;
            console.log("German to Spanish dictionary loaded.");
        } catch (error) {
            console.error("Error loading German to Spanish dictionary:", error);
        }
    }

    
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






