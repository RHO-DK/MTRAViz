console.log('3divs.js is loaded');

import { MTRAViz } from './src/components/Main.js';
import { loadDictionaries } from './src/components/Utilities.js';

//DATA SET
const combinedDatasets = [
    {
        editions: [
            "Amplified Bible Classic Edition AMPC_EN",
            "New International Version NIV Bible_EN",
            "King James Version KJV Bible_EN",
            "Douay Rheims 1899 American Edition DRA Bible_EN",
            "Common English Bible CEB_EN",
        ],
        verses: [
            "In the beginning God (prepared, formed, fashioned, and) created the heavens and the earth",
            "In the beginning God created the heavens and the earth",
            "In the beginning God created the heaven and the earth",
            "In the beginning God created heaven, and earth",
            "When God began to create the heavens and the earth",
        ]
    },
    {
        editions: [
            "Elberfelder 1905_DE",
            "Luther 1545_DE",
            "Menge Bibel_DE",
            "Neue evangelistische Übersetzung_DE",
            "Pattloch Bibel_DE",
        ],
        verses: [
            "Im Anfang schuf Gott die Himmel",
            "Am Anfang schuf Gott Himmel und Erde",
            "Im Anfang schuf Gott den Himmel und die Erde",
            "Im Anfang schuf Gott Himmel und Erde",
            "Im Anfang schuf Gott den Himmel und die Erde",
        ]
    },
    {
        editions: [
            "Spanish Blue Red Gold Letter Edition SRV BRG_ES",
            "Nueva Version Internacional Castilian Biblia CST_ES",
            "Reina Valera Antigua RVA Biblia_ES",
            "Dios Habla Hoy DHH Biblia_ES",
            "Jubilee Bible 2000 Spanish JBS_ES",
        ],
        verses: [
            "el principio crió Dios los cielos y la tierra",
            "Dios, en el principio, creó los cielos y la tierra",
            "el principio crió Dios los cielos y la tierra",
            "En el comienzo de todo, Dios creó el cielo y la tierra",
            "En el principio creó Dios los cielos y la tierra",
        ]
    }
];

//Initialize TRAViz in the container with specified data
function initializeTRAViz(containerId, dataset) {
    const mtraviz = new MTRAViz(containerId, {});

    //Combine the data into the format, in the way expected
    const bibleData = [];
    for (let i = 0; i < dataset.editions.length; i++) {
        bibleData.push({
            edition: dataset.editions[i],
            text: dataset.verses[i],
        });
    }

    //Align and visualize the data
    mtraviz.align(bibleData);
    mtraviz.visualize();
}


//WAIT for dictionaries to load, then initialize the visualizations  ensures only loading ONCE
document.addEventListener('DOMContentLoaded', () => {
    loadDictionaries().then(() => {
        //console.log("cictionaries are loaded. Now initializing TRAViz...");
        initializeTRAViz('containerDiv1', combinedDatasets[0]); //English
        initializeTRAViz('containerDiv2', combinedDatasets[1]); //German
        initializeTRAViz('containerDiv3', combinedDatasets[2]); //spanish
    }).catch(error => {
        console.error("Error loading dictionaries:", error);
    });
});
