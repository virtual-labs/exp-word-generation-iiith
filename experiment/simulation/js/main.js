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

// Add this normalization function at the top
function normalizeValue(val) {
    if (!val || ['na', 'n/a', 'NA', 'Na', 'nA', 'N/a', 'n/A'].includes((val + '').trim().toLowerCase())) return 'N/A';
    if (val.toLowerCase() === 'roman') return 'Roman';
    if (val.toLowerCase() === 'devanagari') return 'Devanagari';
    if (val.toLowerCase() === 'direct') return 'Direct';
    if (val.toLowerCase() === 'oblique') return 'Oblique';
    return captrim(val);
}

// Data structures to store word features and user selections
class WordFeatures {
    constructor() {
        this.wordData = new Map();
        this.currentWord = null;
        // Remove all hardcoded options; will be built from features.txt
        this.allFeatures = null;
        this.userSelections = {};
    }

    // Process features data after loading
    processFeatures(words) {
        console.log('Starting to process features for words:', words.length);
        words.forEach((wordInfo, index) => {
            const { word, language, root, features } = wordInfo;
            console.log(`Processing word ${index + 1}:`, { word, language, root });
            
            // Skip if word or language is missing
            if (!word || !language) {
                console.warn('Skipping word due to missing word or language:', wordInfo);
                return;
            }
            
            // Initialize or get existing word data
            if (!this.wordData.has(word)) {
                this.wordData.set(word, {
                    root: root,
                    language: language,
                    features: []
                });
                console.log(`Added new word to wordData: ${word} (${language})`);
            }
            
            // Add features
            const wordData = this.wordData.get(word);
            features.forEach(feature => {
                // Normalize feature values
                const normalizedFeature = {};
                for (const [key, value] of Object.entries(feature)) {
                    normalizedFeature[key] = value === 'na' || value === 'NA' || !value ? 'N/A' : 
                        key === 'category' ? value.charAt(0).toUpperCase() + value.slice(1).toLowerCase() : 
                        value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
                }
                wordData.features.push(normalizedFeature);
            });
        });

        // Log the final word data for verification
        console.log('Final word data loaded:');
        console.log('Total words:', this.wordData.size);
        console.log('Words by language:');
        const wordsByLang = {};
        this.wordData.forEach((info, word) => {
            if (!wordsByLang[info.language]) {
                wordsByLang[info.language] = [];
            }
            wordsByLang[info.language].push(word);
        });
        console.log(wordsByLang);

        // Build allFeatures dynamically from features.txt
        const featureSets = {
            root: new Set(),
            category: new Set(),
            gender: new Set(),
            number: new Set(),
            person: new Set(),
            script: new Set(),
            case: new Set(),
            tense: new Set()
        };
        words.forEach(wordInfo => {
            wordInfo.features.forEach(feature => {
                Object.keys(featureSets).forEach(key => {
                    if (feature[key]) featureSets[key].add(normalizeValue(feature[key]));
                });
            });
        });
        // Always include 'N/A' for each feature
        Object.values(featureSets).forEach(set => set.add('N/A'));
        this.allFeatures = featureSets;

        console.log('All unique possible dropdown values for each morphological feature:');
        Object.entries(featureSets).forEach(([key, set]) => {
            console.log(`${key}:`, Array.from(set).sort());
        });
    }

    // Get words for selected language
    getWordsForLanguage(language) {
        console.log('getWordsForLanguage called with:', {
            language: language,
            languageType: typeof language,
            wordDataSize: this.wordData.size
        });

        // Log all unique languages in the data
        const uniqueLanguages = new Set(Array.from(this.wordData.values()).map(info => info.language));
        console.log('Available languages in data:', Array.from(uniqueLanguages));

        const words = Array.from(this.wordData.entries())
            .filter(([word, info]) => {
                console.log(`Comparing word "${word}":`, {
                    wordLanguage: info.language,
                    searchLanguage: language,
                    matches: info.language === language
                });
                return info.language === language;
            })
            .map(([word, _]) => word)
            .sort();

        console.log(`Found ${words.length} words for language "${language}":`, words);
        return words;
    }

    // Validate user's feature selections
    validateSelection(language, word, selections) {
        const wordInfo = this.wordData.get(word);
        if (!wordInfo || !wordInfo.features || !wordInfo.features[0]) {
            console.error('No word info or features found for:', word);
            return false;
        }
        const correctFeatures = wordInfo.features[0];
        
        return Object.entries(selections).every(([feature, value]) => {
            const userValue = normalizeValue(value);
            const correctValue = normalizeValue(correctFeatures[feature]);
            console.log(`Comparing feature "${feature}":`, { userValue, correctValue });
            return userValue === correctValue;
        });
    }

    // Helper function to normalize feature values
    normalizeFeatureValue(value) {
        if (!value || value === '') return 'N/A';
        if (value.toLowerCase() === 'na' || value.toLowerCase() === 'n/a') return 'N/A';
        return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
    }

    // Get feature options for selected word
    getFeatureOptions(word) {
        console.log('Getting feature options for word:', word);
        const wordInfo = this.wordData.get(word);
        if (!wordInfo) {
            console.error('No word info found for:', word);
            return null;
        }
        // Find all words with the same root value (case-insensitive, normalized, across all languages)
        const relatedWords = [];
        const targetRoot = normalizeValue(wordInfo.root);
        this.wordData.forEach((info, w) => {
            if (normalizeValue(info.root) === targetRoot) {
                relatedWords.push(w);
            }
        });
        // Get unique features for this word
        const uniqueFeatures = {
            root: new Set(relatedWords), // Use all related word forms for root dropdown
            category: new Set(),
            gender: new Set(),
            number: new Set(),
            person: new Set(),
            script: new Set(),
            case: new Set(),
            tense: new Set()
        };
        wordInfo.features.forEach((feature, index) => {
            for (const [key, value] of Object.entries(feature)) {
                if (key !== 'root') {
                    const normalizedValue = this.normalizeFeatureValue(value);
                    uniqueFeatures[key].add(normalizedValue);
                }
            }
        });
        // Merge with default options and ensure N/A is always available
        const mergedFeatures = {};
        for (const [key, defaultSet] of Object.entries(this.allFeatures)) {
            mergedFeatures[key] = new Set([...uniqueFeatures[key], ...defaultSet]);
        }
        mergedFeatures.root = uniqueFeatures.root;
        return mergedFeatures;
    }

    // Load word features from data file
    async loadFeatures() {
        try {
            const response = await fetch('features.txt');
            if (!response.ok) throw new Error('features.txt not found');
            const text = await response.text();
            console.log('Loading features.txt...');
            
            const lines = text.split('\n').filter(line => line.trim());
            console.log('Total lines in features.txt:', lines.length);
            
            // Log first few lines for verification
            console.log('First few lines from features.txt:');
            lines.slice(0, 5).forEach((line, i) => {
                console.log(`Line ${i + 1}:`, line);
                // Parse and log language field
                const fields = line.split('\t');
                if (fields.length >= 8) {
                    console.log(`Language field in line ${i + 1}:`, {
                        raw: fields[7],
                        trimmed: fields[7].trim(),
                        lowercase: fields[7].trim().toLowerCase()
                    });
                }
            });
            
            const words = lines.map((line, index) => {
                const fields = line.split('\t');
                if (fields.length < 10) {
                    console.warn(`Invalid line format at line ${index + 1}:`, line);
                    return null;
                }
                const [word, root, category, gender, number, case_, person, language, script, tense] = fields;
                
                // Log English words being processed
                if (language.trim().toLowerCase() === 'en') {
                    console.log('Processing English word:', word.trim());
                }
                
                return {
                    word: word.trim(),
                    language: language.trim().toLowerCase(), // Normalize language code
                    root: root.trim(),
                    features: [{
                        root: root.trim(),
                        category: category.trim(),
                        gender: gender.trim(),
                        number: number.trim(),
                        person: person.trim(),
                        script: script.trim(),
                        case: case_.trim(),
                        tense: tense.trim()
                    }]
                };
            }).filter(Boolean);
            
            console.log('Processed words:', words.length);
            console.log('Sample words by language:', 
                words.reduce((acc, w) => {
                    if (!acc[w.language]) acc[w.language] = [];
                    if (acc[w.language].length < 3) acc[w.language].push(w.word);
                    return acc;
                }, {}));
            
            this.processFeatures(words);
            
            // Verify data after processing
            console.log('Verification after processing:');
            console.log('Total words in wordData:', this.wordData.size);
            console.log('English words:', this.getWordsForLanguage('en'));
            console.log('Hindi words:', this.getWordsForLanguage('hi'));
            
            return true;
        } catch (error) {
            console.error('Error loading features:', error);
            return false;
        }
    }

    // Clear user selections
    clearSelections() {
        this.userSelections = {};
        this.currentWord = null;
    }
}

// DOM Elements
const languageSelect = document.getElementById('language');
const wordSelect = document.getElementById('word'); // Fix: Changed from 'root' to 'word'
const rootSelect = document.getElementById('root');
const categorySelect = document.getElementById('category');
const genderSelect = document.getElementById('gender');
const numberSelect = document.getElementById('number');
const personSelect = document.getElementById('person');
const scriptSelect = document.getElementById('script');
const caseSelect = document.getElementById('case');
const tenseSelect = document.getElementById('tense');
const checkButton = document.getElementById('checkButton');
const showAnswerButton = document.getElementById('showAnswerButton');
const resetButton = document.getElementById('resetButton');
const feedbackContainer = document.getElementById('feedback');
const answerContainer = document.getElementById('answer');

// Initialize word features manager
const wordFeatures = new WordFeatures();

// Helper Functions
function clearFeedback() {
    feedbackContainer.textContent = '';
    feedbackContainer.className = 'feedback-container';
    answerContainer.innerHTML = '';
    answerContainer.className = 'answer-container';
    // Remove highlight-incorrect from all dropdowns
    [rootSelect, categorySelect, genderSelect, numberSelect, personSelect, scriptSelect, caseSelect, tenseSelect].forEach(select => {
        select.classList.remove('highlight-incorrect');
    });
}

function showFeedback(message, type) {
    feedbackContainer.textContent = message;
    feedbackContainer.className = `feedback-container ${type}`;
}

// Add highlight-incorrect CSS class to dropdowns with incorrect answers
function highlightIncorrectDropdowns(selections, correctFeatures) {
    const dropdownMap = {
        root: rootSelect,
        category: categorySelect,
        gender: genderSelect,
        number: numberSelect,
        person: personSelect,
        script: scriptSelect,
        case: caseSelect,
        tense: tenseSelect
    };
    Object.keys(selections).forEach(key => {
        const userValue = normalizeValue(selections[key]);
        const correctValue = normalizeValue(correctFeatures[key]);
        if (userValue !== correctValue) {
            dropdownMap[key].classList.add('highlight-incorrect');
        } else {
            dropdownMap[key].classList.remove('highlight-incorrect');
        }
    });
}

// Helper function to populate dropdown options
function setDropdownOptions(select, options, defaultText = 'Select...', addNA = true) {
    select.innerHTML = `<option value="">${defaultText}</option>`;
    
    // Normalize and filter options
    const normalizeValue = (value) => {
        if (!value || value === '') return 'N/A';
        if (['na', 'n/a', 'n/a', 'NA', 'Na', 'nA', 'N/a', 'n/A'].includes(value.trim().toLowerCase())) return 'N/A';
        return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
    };

    const sortedOptions = Array.from(options)
        .filter(option => option && option !== '')
        .map(option => normalizeValue(option))
        .filter((value, index, self) => self.indexOf(value) === index) // Remove duplicates
        .sort((a, b) => {
            if (a === 'N/A') return 1;
            if (b === 'N/A') return -1;
            return a.localeCompare(b);
        });

    sortedOptions.forEach(option => {
        const opt = document.createElement('option');
        opt.value = option;
        opt.textContent = option;
        select.appendChild(opt);
    });

    // Add N/A if not present and requested
    if (addNA && !sortedOptions.includes('N/A')) {
        const naOption = document.createElement('option');
        naOption.value = 'N/A';
        naOption.textContent = 'N/A';
        select.appendChild(naOption);
    }
}

// Enable/disable feature dropdowns
function enableFeatureDropdowns(enable) {
    [rootSelect, categorySelect, genderSelect, numberSelect,
     personSelect, scriptSelect, caseSelect, tenseSelect].forEach(select => {
        select.disabled = !enable;
        if (!enable) {
            select.innerHTML = '<option value="">Select...</option>';
        }
    });
}

// Clear all feature dropdowns
function clearAllFeatures() {
    [rootSelect, categorySelect, genderSelect, numberSelect,
     personSelect, scriptSelect, caseSelect, tenseSelect].forEach(select => {
        select.innerHTML = '<option value="">Select...</option>';
        select.disabled = true;
    });
    checkButton.disabled = true;
    showAnswerButton.disabled = true;
}

function allFeaturesSelected() {
    return [rootSelect, categorySelect, genderSelect, numberSelect,
            personSelect, scriptSelect, caseSelect, tenseSelect]
            .every(select => select.value && select.value !== '');
}

document.querySelectorAll('select').forEach(select => {
    select.addEventListener('change', () => {
        checkButton.disabled = !allFeaturesSelected();
    });
});

// Event Handlers
function handleLanguageChange() {
    const selectedLang = languageSelect.value;
    console.log('Language dropdown value:', selectedLang);
    console.log('Language dropdown selected option:', languageSelect.options[languageSelect.selectedIndex].text);
    
    if (!selectedLang) {
        console.log('No language selected, clearing word select');
        wordSelect.innerHTML = '<option value="">Select a word...</option>';
        wordSelect.disabled = true;
        clearAllFeatures();
        clearFeedback();
        return;
    }

    // Debug log for wordData before getting words
    console.log('Current wordData contents:', {
        size: wordFeatures.wordData.size,
        languages: Array.from(wordFeatures.wordData.values()).map(info => info.language),
        sampleWords: Array.from(wordFeatures.wordData.entries()).slice(0, 5)
    });
    
    const words = wordFeatures.getWordsForLanguage(selectedLang);
    console.log(`Getting words for language "${selectedLang}" (type: ${typeof selectedLang})`);
    console.log('Found words:', words);
    
    // Clear and populate word select
    wordSelect.innerHTML = '<option value="">Select a word...</option>';
    words.forEach(word => {
        const option = document.createElement('option');
        option.value = word;
        option.textContent = word;
        wordSelect.appendChild(option);
        console.log(`Added word option: "${word}" for language "${selectedLang}"`);
    });
    
    wordSelect.disabled = false;
    clearAllFeatures();
    clearFeedback();
}

// Handle word change event
function handleWordChange() {
    const selectedWord = wordSelect.value;
    console.log('Word changed to:', selectedWord);
    
    if (!selectedWord) {
        console.log('No word selected, clearing features');
        clearAllFeatures();
        clearFeedback();
        return;
    }

    // Get word info and verify language
    const wordInfo = wordFeatures.wordData.get(selectedWord);
    console.log('Word data from store:', wordInfo);
    
    if (!wordInfo) {
        console.error('No word info found in data store for:', selectedWord);
        return;
    }

    const language = wordInfo.language;
    console.log('Word language:', language);
    
    wordFeatures.currentWord = selectedWord;
    const options = wordFeatures.getFeatureOptions(selectedWord);
    
    if (!options) {
        console.error('No feature options returned for word:', selectedWord);
        return;
    }

    console.log('Feature options:', options);
    console.log('Populating dropdowns with options');

    // Populate dropdowns
    try {
        setDropdownOptions(rootSelect, options.root, 'Select root...', false);
        setDropdownOptions(categorySelect, options.category);
        setDropdownOptions(genderSelect, options.gender, 'Select...', true);
        setDropdownOptions(numberSelect, options.number, 'Select...', true);
        setDropdownOptions(personSelect, options.person, 'Select...', true);
        setDropdownOptions(scriptSelect, options.script, 'Select...', true);
        setDropdownOptions(caseSelect, options.case, 'Select...', true);
        setDropdownOptions(tenseSelect, options.tense, 'Select...', true);
        
        console.log('Successfully populated all dropdowns');
    } catch (error) {
        console.error('Error populating dropdowns:', error);
    }

    // Enable dropdowns and buttons
    console.log('Enabling feature dropdowns and buttons');
    enableFeatureDropdowns(true);
    checkButton.disabled = false;
    showAnswerButton.disabled = false;

    // This ensures Person, Script, and Tense are always blank by default.
}

function handleFeatureChange() {
    clearFeedback();
    checkButton.disabled = !allFeaturesSelected();
}

// Update handleCheckAnswer to highlight incorrect answers
function handleCheckAnswer() {
    if (!allFeaturesSelected()) {
        showFeedback('Please select all features', 'error');
        return;
    }
    const selections = {
        root: rootSelect.value,
        category: categorySelect.value,
        gender: genderSelect.value,
        number: numberSelect.value,
        person: personSelect.value,
        script: scriptSelect.value,
        case: caseSelect.value,
        tense: tenseSelect.value
    };
    const wordInfo = wordFeatures.wordData.get(wordFeatures.currentWord);
    const correctFeatures = wordInfo.features[0];
    const isCorrect = wordFeatures.validateSelection(
        languageSelect.value,
        wordFeatures.currentWord,
        selections
    );
    highlightIncorrectDropdowns(selections, correctFeatures);
    if (isCorrect) {
        showFeedback('✅ Correct! All features match.', 'success');
    } else {
        showFeedback('❌ Some features are incorrect. Try again or use Show Answer to learn the correct features.', 'error');
    }
}

// Update handleShowAnswer to highlight incorrect answers
function handleShowAnswer() {
    if (!wordFeatures.currentWord) return;
    const wordInfo = wordFeatures.wordData.get(wordFeatures.currentWord);
    if (!wordInfo) return;
    const correctFeatures = wordInfo.features[0];
    answerContainer.innerHTML = `
        <h3>Correct Features for "${wordFeatures.currentWord}":</h3>
        <div><strong>Root:</strong> ${normalizeValue(correctFeatures.root)}</div>
        <div><strong>Category:</strong> ${normalizeValue(correctFeatures.category)}</div>
        <div><strong>Gender:</strong> ${normalizeValue(correctFeatures.gender)}</div>
        <div><strong>Number:</strong> ${normalizeValue(correctFeatures.number)}</div>
        <div><strong>Person:</strong> ${normalizeValue(correctFeatures.person)}</div>
        <div><strong>Script:</strong> ${normalizeValue(correctFeatures.script)}</div>
        <div><strong>Case:</strong> ${normalizeValue(correctFeatures.case)}</div>
        <div><strong>Tense:</strong> ${normalizeValue(correctFeatures.tense)}</div>
    `;
    // Highlight incorrect dropdowns
    const selections = {
        root: rootSelect.value,
        category: categorySelect.value,
        gender: genderSelect.value,
        number: numberSelect.value,
        person: personSelect.value,
        script: scriptSelect.value,
        case: caseSelect.value,
        tense: tenseSelect.value
    };
    highlightIncorrectDropdowns(selections, correctFeatures);
}

function handleReset() {
    languageSelect.selectedIndex = 0;
    wordSelect.innerHTML = '<option value="">Select a word...</option>';
    wordSelect.disabled = true;
    clearAllFeatures();
    clearFeedback();
    wordFeatures.clearSelections();
}

// Toggle instructions panel
function setupInstructionsPanel() {
    const instructionsTab = document.getElementById('instructionsTab');
    const instructionsContent = document.getElementById('instructionsContent');
    const arrowIcon = instructionsTab.querySelector('.arrow-icon');
    
    if (instructionsTab && instructionsContent && arrowIcon) {
        // Set default state: collapsed, arrow pointing down
        instructionsContent.classList.add('collapsed');
        instructionsTab.classList.add('collapsed');
        arrowIcon.classList.remove('fa-chevron-up');
        arrowIcon.classList.add('fa-chevron-down');
        
        instructionsTab.addEventListener('click', () => {
            instructionsContent.classList.toggle('collapsed');
            instructionsTab.classList.toggle('collapsed');
            
            // Toggle arrow direction based on collapsed state
            if (instructionsContent.classList.contains('collapsed')) {
                // Collapsed: arrow points down
                arrowIcon.classList.remove('fa-chevron-up');
                arrowIcon.classList.add('fa-chevron-down');
            } else {
                // Expanded: arrow points up
                arrowIcon.classList.remove('fa-chevron-down');
                arrowIcon.classList.add('fa-chevron-up');
            }
        });
    }
}

// Initialize simulation
async function initSimulation() {
    // Load features data
    const loaded = await wordFeatures.loadFeatures();
    if (!loaded) {
        showFeedback('Error loading word features. Please refresh the page.', 'error');
        return;
    }

    // Setup event listeners
    languageSelect.addEventListener('change', handleLanguageChange);
    wordSelect.addEventListener('change', handleWordChange);
    
    [rootSelect, categorySelect, genderSelect, numberSelect,
     personSelect, scriptSelect, caseSelect, tenseSelect].forEach(select => {
        select.addEventListener('change', handleFeatureChange);
    });
    
    checkButton.addEventListener('click', handleCheckAnswer);
    showAnswerButton.addEventListener('click', handleShowAnswer);
    resetButton.addEventListener('click', handleReset);
    
    // Setup instructions panel
    setupInstructionsPanel();
    
    // Initialize UI state
    handleLanguageChange();
}

// Start simulation when DOM is loaded
document.addEventListener('DOMContentLoaded', initSimulation);
