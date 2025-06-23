(function(i, s, o, g, r, a, m) {
            i['GoogleAnalyticsObject'] = r;
            i[r] = i[r] || function() {
                (i[r].q = i[r].q || []).push(arguments)
            }, i[r].l = 1 * new Date();
            a = s.createElement(o), m = s.getElementsByTagName(o)[0];
            a.async = 1;
            a.src = g;
            m.parentNode.insertBefore(a, m)
        })(window, document, 'script', '//www.google-analytics.com/analytics.js', 'ga');
        ga('create', 'UA-67558473-1', 'auto');
        ga('send', 'pageview');

// Utility: Capitalize first letter and trim
function capitalize(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}
function captrim(str) {
    return capitalize((str || '').trim());
}

// Features Manager Class
class FeaturesManager {
    constructor() {
        this.features = {
            root: new Set(),
            category: new Set(),
            gender: new Set(),
            number: new Set(),
            person: new Set(),
            case: new Set(),
            script: new Set(),
            tense: new Set()
        };
        this.words = [];
        this.currentLanguage = '';
        this.rawData = [];
        this.isLoaded = false;
        this.userSelections = {}; // Track user selections for context-aware feedback
        console.log('FeaturesManager initialized');
    }

    // Track user selections for context-aware feedback
    setUserSelection(feature, value) {
        this.userSelections[feature] = value;
    }

    getUserSelections() {
        return { ...this.userSelections };
    }

    clearUserSelections() {
        this.userSelections = {};
    }

    async loadFeatures() {
        try {
            const response = await fetch('features.txt', {
                method: 'GET',
                headers: { 'Accept': 'text/plain' }
            });
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const text = await response.text();
            if (!text || text.trim().length === 0) throw new Error('Loaded file is empty');
            const lines = text.split('\n').filter(line => line.trim());
            this.rawData = lines.map(line => {
                const fields = line.split('\t');
                if (fields.length !== 10) return null;
                const [word, root, category, gender, number, case_, person, lang, script, tense] = fields;
                return {
                    word: word.trim(),
                    root: root.trim(),
                    category: category.trim(),
                    gender: gender.trim(),
                    number: number.trim(),
                    case: case_.trim(),
                    person: person.trim(),
                    lang: lang.trim(),
                    script: script.trim(),
                    tense: tense.trim()
                };
            }).filter(item => item !== null);
            this.isLoaded = true;
            console.log('✅ features.txt loaded successfully');
        } catch (error) {
            this.isLoaded = false;
            console.error('❌ Failed to load features.txt', error);
        }
    }

    getWordsForLanguage(language) {
        return [...new Set(this.rawData.filter(item => item.lang === language).map(item => captrim(item.word)))];
    }

    getRootVariants(language, word) {
        // For English: show all inflections/variants of the word (all words with the same root)
        // For Hindi: show similar/related forms (all words with the same root or similar root)
        if (language === 'en') {
            // Find the root for the selected word
            const root = this.rawData.find(item => item.lang === 'en' && captrim(item.word) === captrim(word))?.root;
            if (!root) return [captrim(word)];
            // All words with the same root
            const variants = this.rawData.filter(item => item.lang === 'en' && item.root === root).map(item => captrim(item.word));
            return [...new Set(variants)];
        } else if (language === 'hi') {
            // For Hindi, show all words with the same root or similar root (e.g., starts with the same 2-3 chars)
            const root = this.rawData.find(item => item.lang === 'hi' && captrim(item.word) === captrim(word))?.root;
            if (!root) return [captrim(word)];
            // All words with the same root or similar root (first 2 chars)
            const similar = this.rawData.filter(item => item.lang === 'hi' && (item.root === root || item.root.startsWith(root.slice(0, 2)))).map(item => captrim(item.word));
            return [...new Set(similar)];
        }
        return [captrim(word)];
    }

    getAllFeatureValuesForLanguage(language) {
        // For distractors: get all possible values for each feature in the language
        const filtered = this.rawData.filter(item => item.lang === language);
        const features = {
            category: new Set(),
            gender: new Set(),
            number: new Set(),
            person: new Set(),
            case: new Set(),
            script: new Set(),
            tense: new Set()
        };
        filtered.forEach(item => {
            Object.keys(features).forEach(f => {
                if (item[f] && item[f] !== 'na') features[f].add(captrim(item[f]));
            });
        });
        // For script, always only Roman and Devanagari, capitalized, no duplicates
        features.script = new Set(['Roman', 'Devanagari']);
        // For case, capitalize and deduplicate
        features.case = new Set([...features.case, 'Direct', 'Oblique'].map(captrim));
        return features;
    }

    // Check if a feature can have "NA" values based on the data
    canHaveNA(feature, language) {
        const filtered = this.rawData.filter(item => item.lang === language);
        return filtered.some(item => item[feature] === 'na');
    }

    // Map the selected root dropdown value to the actual root for the selected word
    getRootForSelected(language, word, selectedRoot) {
        // For English: find the root for the selected word form
        if (language === 'en') {
            const entry = this.rawData.find(item => item.lang === 'en' && captrim(item.word) === captrim(selectedRoot));
            return entry ? captrim(entry.root) : captrim(selectedRoot);
        } else if (language === 'hi') {
            // For Hindi: find the root for the selected word form
            const entry = this.rawData.find(item => item.lang === 'hi' && captrim(item.word) === captrim(selectedRoot));
            return entry ? captrim(entry.root) : captrim(selectedRoot);
        }
        return captrim(selectedRoot);
    }

    getCorrectFeatureSet(language, word) {
        // Return the first correct feature set for the word
        const entry = this.rawData.find(item => item.lang === language && captrim(item.word) === captrim(word));
        if (!entry) return null;
        return {
            root: captrim(entry.root),
            category: captrim(entry.category),
            gender: captrim(entry.gender),
            number: captrim(entry.number),
            person: captrim(entry.person),
            case: captrim(entry.case),
            script: entry.script ? captrim(entry.script) : '',
            tense: captrim(entry.tense)
        };
    }

    validateSelection(language, word, selectedFeatures) {
        // All fields must be filled
        for (const key of ['root','category','gender','number','person','case','script','tense']) {
            if (!selectedFeatures[key]) return false;
        }
        // Map the selected root dropdown value to the actual root for the selected word
        const mappedRoot = this.getRootForSelected(language, word, selectedFeatures.root);
        // Debug log
        console.log('Selected features:', selectedFeatures);
        // Find a matching entry
        const match = this.rawData.find(item => (
            item.lang === language &&
            captrim(item.word) === captrim(word) &&
            captrim(item.root) === mappedRoot &&
            captrim(item.category) === captrim(selectedFeatures.category) &&
            (captrim(item.gender) === captrim(selectedFeatures.gender) || (item.gender === 'na' && selectedFeatures.gender === 'NA')) &&
            (captrim(item.number) === captrim(selectedFeatures.number) || (item.number === 'na' && selectedFeatures.number === 'NA')) &&
            (captrim(item.person) === captrim(selectedFeatures.person) || (item.person === 'na' && selectedFeatures.person === 'NA')) &&
            (captrim(item.case) === captrim(selectedFeatures.case) || (item.case === 'na' && selectedFeatures.case === 'NA')) &&
            (captrim(item.script) === captrim(selectedFeatures.script) || (item.script === 'na' && selectedFeatures.script === 'NA')) &&
            (captrim(item.tense) === captrim(selectedFeatures.tense) || (item.tense === 'na' && selectedFeatures.tense === 'NA'))
        ));
        if (!match) {
            console.log('No match found for:', {
                language, word, mappedRoot,
                ...selectedFeatures
            });
        } else {
            console.log('Match found:', match);
        }
        return !!match;
    }
}

const featuresManager = new FeaturesManager();

function setDropdownOptions(select, options, placeholder = '---Select---', includeNA = false) {
    select.innerHTML = '';
    const opt = document.createElement('option');
    opt.value = '';
    opt.textContent = placeholder;
    select.appendChild(opt);
    
    // Add NA option if requested and applicable
    if (includeNA) {
        const naOpt = document.createElement('option');
        naOpt.value = 'NA';
        naOpt.textContent = 'NA';
        select.appendChild(naOpt);
    }
    
    options.forEach(val => {
        const o = document.createElement('option');
        o.value = captrim(val);
        o.textContent = captrim(val);
        select.appendChild(o);
    });
}

function disableFeatureDropdowns(disabled = true) {
    [
        'root','category','gender','number','person','case','script','tense'
    ].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.disabled = disabled;
    });
}

function clearFeatureDropdowns() {
    [
        'root','category','gender','number','person','case','script','tense'
    ].forEach(id => {
        const el = document.getElementById(id);
        if (el) setDropdownOptions(el, []);
    });
}

function allFeaturesSelected() {
    return [
        'root','category','gender','number','person','case','script','tense'
    ].every(id => {
        const el = document.getElementById(id);
        return el && (el.value === 'NA' || el.value);
    });
}

// Add temporary CSS for debug visibility
const style = document.createElement('style');
style.innerHTML = `
#feedback, #answer {
  min-height: 2em;
}
`;
document.head.appendChild(style);

// Helper functions for feedback and answer UI
function showFeedback(message, type) {
    console.log('showFeedback called with:', message, type);
    const feedbackContainer = document.getElementById('feedback');
    const resultSection = document.getElementById('result-section');
    
    if (!feedbackContainer) {
        console.error('Feedback container not found');
        return;
    }
    
    // Make sure result section is visible
    if (resultSection) {
        resultSection.style.opacity = '1';
        resultSection.style.transform = 'none';
        resultSection.style.visibility = 'visible';
        console.log('Result section made visible');
    }
    
    console.log('Feedback container found:', feedbackContainer);
    console.log('Feedback container before update - textContent:', feedbackContainer.textContent, 'className:', feedbackContainer.className);
    feedbackContainer.textContent = message;
    feedbackContainer.className = `feedback-container show ${type}`;
    console.log('Feedback container after update - textContent:', feedbackContainer.textContent, 'className:', feedbackContainer.className);
    console.log('Feedback container display style:', window.getComputedStyle(feedbackContainer).display);
    console.log('Feedback container dimensions:', feedbackContainer.offsetWidth, 'x', feedbackContainer.offsetHeight);
    console.log('Feedback container position:', feedbackContainer.offsetTop, feedbackContainer.offsetLeft);
    
    // Force a repaint
    feedbackContainer.style.display = 'none';
    feedbackContainer.offsetHeight; // Force reflow
    feedbackContainer.style.display = 'block';
}

function showAnswer(word, correct, userSelections = null) {
    console.log('showAnswer called with:', word, correct, userSelections);
    const answerContainer = document.getElementById('answer');
    const resultSection = document.getElementById('result-section');
    
    if (!answerContainer) {
        console.error('Answer container not found');
        return;
    }
    
    // Make sure result section is visible
    if (resultSection) {
        resultSection.style.opacity = '1';
        resultSection.style.transform = 'none';
        resultSection.style.visibility = 'visible';
        console.log('Result section made visible');
    }
    
    console.log('Answer container found:', answerContainer);
    console.log('Answer container before update - innerHTML:', answerContainer.innerHTML, 'className:', answerContainer.className);
    
    if (!correct) {
        answerContainer.innerHTML = '<b>No correct answer found for this word.</b>';
        answerContainer.className = 'answer-container show error';
    } else {
        let answerHTML = '<h3>Correct Features:</h3><ul>';
        
        // If user selections are provided, show only the features they selected
        if (userSelections && Object.keys(userSelections).length > 0) {
            Object.keys(userSelections).forEach(feature => {
                if (userSelections[feature] && userSelections[feature] !== '') {
                    const correctValue = correct[feature] || 'N/A';
                    answerHTML += `<li><strong>${captrim(feature)}:</strong> ${correctValue}</li>`;
                }
            });
        } else {
            // Show all features if no user selections
            Object.keys(correct).forEach(feature => {
                const value = correct[feature] || 'N/A';
                answerHTML += `<li><strong>${captrim(feature)}:</strong> ${value}</li>`;
            });
        }
        
        answerHTML += '</ul>';
        answerContainer.innerHTML = answerHTML;
        answerContainer.className = 'answer-container show success';
    }
    console.log('Answer container after update - innerHTML:', answerContainer.innerHTML, 'className:', answerContainer.className);
    console.log('Answer container display style:', window.getComputedStyle(answerContainer).display);
    console.log('Answer container dimensions:', answerContainer.offsetWidth, 'x', answerContainer.offsetHeight);
    console.log('Answer container position:', answerContainer.offsetTop, answerContainer.offsetLeft);
    
    // Force a repaint
    answerContainer.style.display = 'none';
    answerContainer.offsetHeight; // Force reflow
    answerContainer.style.display = 'block';
}

function clearFeedback() {
    console.log('clearFeedback called');
    const feedbackContainer = document.getElementById('feedback');
    const answerContainer = document.getElementById('answer');
    if (feedbackContainer) {
        feedbackContainer.className = 'feedback-container';
        feedbackContainer.textContent = '';
        console.log('Feedback container cleared');
    }
    if (answerContainer) {
        answerContainer.className = 'answer-container';
        answerContainer.innerHTML = '';
        console.log('Answer container cleared');
    }
}

// UI Logic
window.addEventListener('DOMContentLoaded', async () => {
    await featuresManager.loadFeatures();
    const languageSelect = document.getElementById('language');
    const wordSection = document.querySelector('.word-section');
    const wordSelect = document.getElementById('word-select');
    const checkSection = document.getElementById('check-section');
    const checkButton = document.getElementById('check-button');
    const findAnswerButton = document.getElementById('find-answer-button');

    // Capitalize all labels and button text
    document.querySelectorAll('label, button, h1, h2').forEach(el => {
        if (el.textContent) el.textContent = captrim(el.textContent.trim());
    });

    // STEP 1: On language change
    function handleLanguageChange() {
        if (!languageSelect.value) {
            setDropdownOptions(wordSelect, [], '---Select Word---');
            wordSelect.value = '';
            clearFeatureDropdowns();
            disableFeatureDropdowns(true);
            checkSection.style.display = 'none';
            clearFeedback();
            featuresManager.clearUserSelections();
            return;
        }
        setDropdownOptions(wordSelect, featuresManager.getWordsForLanguage(languageSelect.value), '---Select Word---');
        wordSelect.value = '';
        clearFeatureDropdowns();
        disableFeatureDropdowns(true);
        checkSection.style.display = 'none';
        clearFeedback();
        featuresManager.clearUserSelections();
    }
    languageSelect.addEventListener('change', handleLanguageChange);
    handleLanguageChange(); // Initial load

    // STEP 2: On word change
    wordSelect.addEventListener('change', () => {
        clearFeatureDropdowns();
        disableFeatureDropdowns(true);
        checkSection.style.display = 'none';
        clearFeedback();
        featuresManager.clearUserSelections();
        if (!wordSelect.value || !languageSelect.value) return;
        // Root: challenging variants for English and Hindi
        const rootOptions = featuresManager.getRootVariants(languageSelect.value, wordSelect.value);
        setDropdownOptions(document.getElementById('root'), rootOptions);
        document.getElementById('root').disabled = false;
        // Other features: all possible values for the language (distractors included)
        const allFeatureValues = featuresManager.getAllFeatureValuesForLanguage(languageSelect.value);
        [
            ['category','category'],
            ['gender','gender'],
            ['number','number'],
            ['person','person'],
            ['case','case'],
            ['script','script'],
            ['tense','tense']
        ].forEach(([feature, id]) => {
            let options = Array.from(allFeatureValues[feature]).sort();
            // For script, always only Roman and Devanagari, capitalized, no duplicates
            if (feature === 'script') {
                options = ['Roman', 'Devanagari'];
            }
            // Add NA option if the feature can have NA values
            const includeNA = featuresManager.canHaveNA(feature, languageSelect.value);
            setDropdownOptions(document.getElementById(id), options, '---Select---', includeNA);
            document.getElementById(id).disabled = false;
        });
    });

    // STEP 3: On feature change, check if all are selected
    document.querySelectorAll('.feature-select').forEach(el => {
        el.addEventListener('change', () => {
            // Track user selection for context-aware feedback
            const featureName = el.id;
            featuresManager.setUserSelection(featureName, el.value);
            
            clearFeedback();
            if (allFeaturesSelected()) {
                checkSection.style.display = 'block';
            } else {
                checkSection.style.display = 'none';
            }
        });
    });

    // STEP 4: Check Answer button logic
    checkButton.addEventListener('click', () => {
        console.log('Check button clicked');
        clearFeedback();
        if (!allFeaturesSelected()) {
            console.log('Not all features selected');
            showFeedback('Please select all features.', 'error');
            return;
        }
        const selectedFeatures = {
            root: document.getElementById('root').value,
            category: document.getElementById('category').value,
            gender: document.getElementById('gender').value,
            number: document.getElementById('number').value,
            person: document.getElementById('person').value,
            case: document.getElementById('case').value,
            script: document.getElementById('script').value,
            tense: document.getElementById('tense').value
        };
        console.log('Selected features:', selectedFeatures);
        const isCorrect = featuresManager.validateSelection(languageSelect.value, wordSelect.value, selectedFeatures);
        console.log('Validation result:', isCorrect);
        if (isCorrect) {
            showFeedback('✅ Correct!', 'success');
        } else {
            showFeedback('❌ Incorrect. Please try again.', 'error');
        }
    });

    // STEP 5: Find Correct Answer button logic
    findAnswerButton.addEventListener('click', () => {
        console.log('Find answer button clicked');
        clearFeedback();
        if (!wordSelect.value || !languageSelect.value) {
            console.log('No word or language selected');
            showFeedback('Please select a word.', 'error');
            return;
        }
        const correct = featuresManager.getCorrectFeatureSet(languageSelect.value, wordSelect.value);
        console.log('Correct feature set:', correct);
        
        // Get user selections for context-aware feedback
        const userSelections = featuresManager.getUserSelections();
        console.log('User selections for context-aware feedback:', userSelections);
        
        showAnswer(wordSelect.value, correct, userSelections);
    });
});
