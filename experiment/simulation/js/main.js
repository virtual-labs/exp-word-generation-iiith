// Google Analytics
(function (i, s, o, g, r, a, m) {
  i["GoogleAnalyticsObject"] = r;
  ((i[r] =
    i[r] ||
    function () {
      (i[r].q = i[r].q || []).push(arguments);
    }),
    (i[r].l = 1 * new Date()));
  ((a = s.createElement(o)), (m = s.getElementsByTagName(o)[0]));
  a.async = 1;
  a.src = g;
  m.parentNode.insertBefore(a, m);
})(window, document, "script", "//www.google-analytics.com/analytics.js", "ga");
ga("create", "UA-67558473-1", "auto");
ga("send", "pageview");

// Morphological Analysis Data Manager
class MorphologyAnalyzer {
  constructor() {
    this.languages = ["hi", "en"];
    this.currentLanguage = "hi";
    this.rootWordsByLanguage = {
      hi: new Map(),
      en: new Map(),
    };
    this.paradigmDataByLanguage = {
      hi: new Map(),
      en: new Map(),
    };
    this.answerOptionsByLanguage = {
      hi: [],
      en: [],
    };
    this.rootWords = this.rootWordsByLanguage.hi;
    this.paradigmData = this.paradigmDataByLanguage.hi;
    this.answerOptions = this.answerOptionsByLanguage.hi;
    this.currentRoot = null;
    this.currentParadigm = null;
    this.correctAnswers = [];
    this.userAnswers = [];
    this.isInitialized = false;
  }

  setLanguage(language) {
    if (!this.languages.includes(language)) return;
    this.currentLanguage = language;
    this.rootWords = this.rootWordsByLanguage[language];
    this.paradigmData = this.paradigmDataByLanguage[language];
    this.answerOptions = [...this.answerOptionsByLanguage[language]];
  }

  getCommonPrefixLength(a, b) {
    const first = this.normalizeText(a);
    const second = this.normalizeText(b);
    let idx = 0;
    while (
      idx < first.length &&
      idx < second.length &&
      first.charAt(idx) === second.charAt(idx)
    ) {
      idx++;
    }
    return idx;
  }

  deriveDeleteAdd(root, target) {
    const normalizedRoot = this.normalizeText(root);
    const normalizedTarget = this.normalizeText(target);
    const prefixLength = this.getCommonPrefixLength(
      normalizedRoot,
      normalizedTarget,
    );
    return {
      del: normalizedRoot.slice(prefixLength),
      add: normalizedTarget.slice(prefixLength),
    };
  }

  parseEnglishParadigmsFromFeatures(text) {
    const lines = text.trim().split("\n");
    const nounFormsByRoot = new Map();

    lines.forEach((line) => {
      const parts = line.split("\t").map((part) => this.normalizeText(part));
      if (parts.length < 9) return;

      const word = parts[0];
      const root = parts[1];
      const category = parts[2].toLowerCase();
      const number = parts[4].toLowerCase();
      const language = parts[7].toLowerCase();

      if (language !== "en" || category !== "noun" || !root || !word) return;

      if (!nounFormsByRoot.has(root)) {
        nounFormsByRoot.set(root, {
          singular: new Set(),
          plural: new Set(),
        });
      }

      const entry = nounFormsByRoot.get(root);
      if (number === "singular") entry.singular.add(word);
      if (number === "plural") entry.plural.add(word);
    });

    const englishRoots = Array.from(nounFormsByRoot.keys()).sort((a, b) =>
      a.localeCompare(b),
    );
    const englishOptions = new Set();

    englishRoots.forEach((rootWord, index) => {
      const forms = nounFormsByRoot.get(rootWord);
      const singularCandidates = Array.from(forms.singular);
      const pluralCandidates = Array.from(forms.plural);

      const singular = singularCandidates.includes(rootWord)
        ? rootWord
        : singularCandidates[0] || rootWord;
      const plural =
        pluralCandidates.find((candidate) => candidate !== singular) ||
        pluralCandidates[0] ||
        singular;

      const targets = [singular, singular, plural, plural];
      const transforms = targets.map((target) =>
        this.deriveDeleteAdd(rootWord, target),
      );
      const deletes = transforms.map((item) => item.del);
      const adds = transforms.map((item) => item.add);

      deletes.forEach((item) => {
        if (item) englishOptions.add(item);
      });
      adds.forEach((item) => {
        if (item) englishOptions.add(item);
      });

      const paradigmId = `en_${index + 1}`;
      this.rootWordsByLanguage.en.set(rootWord, paradigmId);
      this.paradigmDataByLanguage.en.set(paradigmId, {
        root: rootWord,
        transformations: { deletes, adds },
      });
    });

    this.answerOptionsByLanguage.en = [
      "None",
      ...Array.from(englishOptions).sort((a, b) => a.localeCompare(b)),
    ];
  }

  normalizeText(value) {
    if (value === null || value === undefined) return "";
    return String(value).trim().normalize("NFC");
  }

  toJoinableSuffix(suffix) {
    if (!suffix) return "";

    const normalized = this.normalizeText(suffix);
    const firstChar = normalized.charAt(0);
    const rest = normalized.slice(1);
    const vowelToMatra = {
      आ: "ा",
      इ: "ि",
      ई: "ी",
      उ: "ु",
      ऊ: "ू",
      ए: "े",
      ऐ: "ै",
      ओ: "ो",
      औ: "ौ",
    };

    if (vowelToMatra[firstChar]) {
      return vowelToMatra[firstChar] + rest;
    }

    return normalized;
  }

  // Load data from text files (replacing PHP file reading)
  async loadData() {
    try {
      // console.log('Loading data files...');

      // Load options (root words)
      const optionsResponse = await fetch("Exp3/options.txt");
      if (!optionsResponse.ok) {
        throw new Error(
          `Failed to load options.txt: ${optionsResponse.status}`,
        );
      }
      const optionsText = await optionsResponse.text();
      //console.log('Options text loaded, first 200 chars:', optionsText.substring(0, 200));
      this.parseOptions(optionsText, "hi");

      // Load paradigm data
      const paradigmResponse = await fetch("Exp3/paradigm.txt");
      if (!paradigmResponse.ok) {
        throw new Error(
          `Failed to load paradigm.txt: ${paradigmResponse.status}`,
        );
      }
      const paradigmText = await paradigmResponse.text();
      //console.log('Paradigm text loaded, first 200 chars:', paradigmText.substring(0, 200));
      this.parseParadigm(paradigmText, "hi");

      // Load answer options
      const answersResponse = await fetch("Exp3/answers_opt.txt");
      if (!answersResponse.ok) {
        throw new Error(
          `Failed to load answers_opt.txt: ${answersResponse.status}`,
        );
      }
      const answersText = await answersResponse.text();
      //console.log('Answers text loaded, first 200 chars:', answersText.substring(0, 200));
      this.parseAnswerOptions(answersText, "hi");

      // Load language-agnostic features to build English noun paradigms
      const featuresResponse = await fetch("features.txt");
      if (!featuresResponse.ok) {
        throw new Error(
          `Failed to load features.txt: ${featuresResponse.status}`,
        );
      }
      const featuresText = await featuresResponse.text();
      this.parseEnglishParadigmsFromFeatures(featuresText);

      // Default language is Hindi on first load.
      this.setLanguage("hi");

      this.isInitialized = true;
      //console.log('Data loaded successfully');
      //console.log('Root words:', Array.from(this.rootWords.entries()));
      //console.log('Paradigm data:', Array.from(this.paradigmData.entries()));
      //console.log('Answer options:', this.answerOptions);
      return true;
    } catch (error) {
      console.error("Error loading data:", error);
      return false;
    }
  }

  // Parse options.txt file
  parseOptions(text, language = "hi") {
    const lines = text.trim().split("\n");
    const targetRootWords = this.rootWordsByLanguage[language];
    //console.log('Parsing options:', lines);

    lines.forEach((line) => {
      const parts = line.trim().split(/\s+/);
      if (parts.length >= 2) {
        const paradigmId = parts[0];
        const word = this.normalizeText(parts[1]);
        targetRootWords.set(word, paradigmId);
        //console.log(`Added root word: ${word} -> paradigm ${paradigmId}`);
      }
    });
  }

  // Parse paradigm.txt file
  parseParadigm(text, language = "hi") {
    const lines = text.trim().split("\n");
    const targetParadigmData = this.paradigmDataByLanguage[language];
    //console.log('Parsing paradigm lines:', lines.length);

    lines.forEach((line, lineIndex) => {
      const parts = line.trim().split(/\s+/);
      //console.log(`Line ${lineIndex + 1}: "${line.trim()}" -> ${parts.length} parts`);

      if (parts.length >= 10) {
        const paradigmId = parts[0];
        const rootWord = this.normalizeText(parts[1]);
        const tokens = parts.slice(2, 10).map((t) => this.normalizeText(t));
        // Convert "None" to empty string for internal logic
        const deletes = tokens.slice(0, 4).map((x) => (x === "None" ? "" : x));
        const adds = tokens.slice(4, 8).map((x) => (x === "None" ? "" : x));
        targetParadigmData.set(paradigmId, {
          root: rootWord,
          transformations: { deletes, adds },
        });
        //console.log(`Added paradigm ${paradigmId}: root="${rootWord}", deletes=`, deletes, 'adds=', adds);
      } else {
        console.warn(
          `Line ${lineIndex + 1} has insufficient parts (${parts.length}):`,
          parts,
        );
      }
    });
  }

  // Parse answers_opt.txt file
  parseAnswerOptions(text, language = "hi") {
    // Split by newlines and filter out empty lines, trim each option
    const options = text
      .trim()
      .split("\n")
      .map((opt) => this.normalizeText(opt))
      .filter((opt) => opt.length > 0 && opt !== "None");
    //console.log('Answer options parsed:', this.answerOptions.length, 'options');
    //console.log('First 10 options:', this.answerOptions.slice(0, 10));
    this.answerOptionsByLanguage[language] = ["None", ...options];
  }

  // Get root words for dropdown
  getRootWords() {
    return Array.from(this.rootWords.keys());
  }

  // Get paradigm for selected root
  getParadigm(rootWord) {
    const normalizedRoot = this.normalizeText(rootWord);
    const paradigmId = this.rootWords.get(normalizedRoot);
    //console.log(`Getting paradigm for ${rootWord}: paradigm ID ${paradigmId}`);

    if (paradigmId) {
      const paradigm = this.paradigmData.get(paradigmId);
      //console.log('Found paradigm:', paradigm);
      return paradigm;
    }
    return null;
  }

  // Generate word forms table
  generateWordFormsTable(rootWord) {
    const paradigm = this.getParadigm(rootWord);
    if (!paradigm) return null;

    const deletes = paradigm.transformations.deletes;
    const adds = paradigm.transformations.adds;

    const forms = [
      { number: "singular", case: "direct", index: 0 },
      { number: "singular", case: "oblique", index: 1 },
      { number: "plural", case: "direct", index: 2 },
      { number: "plural", case: "oblique", index: 3 },
    ];

    return forms.map((form) => ({
      word: this.applyDeleteAdd(
        rootWord,
        deletes[form.index],
        adds[form.index],
      ),
      root: rootWord,
      number: form.number,
      case: form.case,
      transformation: { del: deletes[form.index], add: adds[form.index] },
    }));
  }

  // Apply delete + add to form the target word
  applyDeleteAdd(root, delSuffix, addSuffix) {
    const normalizedRoot = this.normalizeText(root);
    const normalizedDelSuffix = this.normalizeText(delSuffix);
    const normalizedAddSuffix = this.normalizeText(addSuffix);
    const joinableDelSuffix = this.toJoinableSuffix(normalizedDelSuffix);

    //console.log(`Generating word form: root="${normalizedRoot}", delete="${normalizedDelSuffix}", add="${normalizedAddSuffix}"`);
    let base = normalizedRoot;
    // If delete suffix is specified and exists at the end of the root
    if (joinableDelSuffix && normalizedRoot.endsWith(joinableDelSuffix)) {
      base = normalizedRoot.slice(
        0,
        normalizedRoot.length - joinableDelSuffix.length,
      );
      //console.log(`Deleted suffix "${delSuffix}": "${root}" -> "${base}"`);
    } else if (
      normalizedDelSuffix &&
      normalizedRoot.endsWith(normalizedDelSuffix)
    ) {
      // Fallback for non-vowel tokens that should be deleted literally.
      base = normalizedRoot.slice(
        0,
        normalizedRoot.length - normalizedDelSuffix.length,
      );
    } else if (normalizedDelSuffix) {
      console.log(
        `Delete suffix "${normalizedDelSuffix}" not found at end of "${normalizedRoot}". Leaving root unchanged.`,
      );
    }

    // If add suffix is specified, append it
    if (normalizedAddSuffix) {
      const result = base + this.toJoinableSuffix(normalizedAddSuffix);
      //console.log(`Added suffix "${addSuffix}": "${base}" -> "${result}"`);
      return result;
    }

    return base;
  }

  // Get correct answers for current paradigm
  getCorrectAnswers(rootWord) {
    const paradigm = this.getParadigm(rootWord);
    if (!paradigm) return [];

    const { deletes, adds } = paradigm.transformations;
    return [
      deletes[0], // delete singular direct
      deletes[1], // delete singular oblique
      deletes[2], // delete plural direct
      deletes[3], // delete plural oblique
      adds[0], // add singular direct
      adds[1], // add singular oblique
      adds[2], // add plural direct
      adds[3], // add plural oblique
    ];
  }

  // Check user answers
  checkAnswers(userAnswers) {
    const deleteResults = [];
    const addResults = [];
    const correct = this.correctAnswers;

    //console.log('Checking answers:', userAnswers);
    //console.log('Correct answers:', correct);

    for (let rowIndex = 0; rowIndex < 4; rowIndex++) {
      const userDel = this.normalizeText(
        userAnswers[rowIndex] === "None" ? "" : userAnswers[rowIndex],
      );
      const userAdd = this.normalizeText(
        userAnswers[rowIndex + 4] === "None" ? "" : userAnswers[rowIndex + 4],
      );
      const corrDel = this.normalizeText(
        correct[rowIndex] === "None" ? "" : correct[rowIndex],
      );
      const corrAdd = this.normalizeText(
        correct[rowIndex + 4] === "None" ? "" : correct[rowIndex + 4],
      );

      // Accept alternate delete/add pairs when they create the same valid form.
      const expectedWord = this.applyDeleteAdd(
        this.currentRoot,
        corrDel,
        corrAdd,
      );
      const userWord = this.applyDeleteAdd(this.currentRoot, userDel, userAdd);
      const surfaceFormMatches = expectedWord === userWord;

      const deleteMatches = userDel === corrDel;
      const addMatches = userAdd === corrAdd;

      deleteResults.push(deleteMatches || surfaceFormMatches);
      addResults.push(addMatches || surfaceFormMatches);
    }

    // Keep the legacy order expected by updateCheckResults:
    // [4 delete checks, then 4 add checks].
    return [...deleteResults, ...addResults];
  }
}

// DOM Elements
const languageSelection = document.getElementById("languageSelection");
const rootSelection = document.getElementById("rootSelection");
const paradigmSection = document.getElementById("paradigmSection");
const paradigmTable = document.getElementById("paradigmTable");
const addDeleteSection = document.getElementById("addDeleteSection");
const addDeleteTableBody = document.getElementById("addDeleteTableBody");
const submitButton = document.getElementById("submitButton");
const getAnswerButton = document.getElementById("getAnswerButton");
const resetButton = document.getElementById("resetButton");
const feedback = document.getElementById("feedback");
const correctAnswer = document.getElementById("correctAnswer");
const checkHeader = document.getElementById("checkHeader");

// Initialize the analyzer
const analyzer = new MorphologyAnalyzer();

// Initialize the application
async function initializeApp() {
  //console.log('Initializing app...');

  try {
    const loaded = await analyzer.loadData();
    if (!loaded) {
      showFeedback("Error loading data. Please refresh the page.", "error");
      console.error("Failed to load data");
      return;
    }

    // Verify data was loaded
    if (analyzer.rootWords.size === 0) {
      console.error("No root words loaded!");
      showFeedback("No data loaded. Please check the data files.", "error");
      return;
    }

    if (languageSelection) {
      languageSelection.value = analyzer.currentLanguage;
    }
    populateRootWordsDropdown();
    setupEventListeners();
    setupInstructionsPanel();
    //console.log('App initialized successfully');
    //console.log('Total root words available:', analyzer.rootWords.size);
  } catch (error) {
    console.error("Error during initialization:", error);
    showFeedback("Error initializing application: " + error.message, "error");
  }
}

function handleLanguageSelection() {
  const selectedLanguage = languageSelection ? languageSelection.value : "hi";
  analyzer.setLanguage(selectedLanguage);

  // Reset state when language changes.
  rootSelection.selectedIndex = 0;
  hideParadigmSection();
  hideAddDeleteSection();
  clearFeedback();
  clearResults();
  analyzer.currentRoot = null;
  analyzer.currentParadigm = null;
  analyzer.correctAnswers = [];
  analyzer.userAnswers = [];
  submitButton.disabled = true;
  getAnswerButton.style.display = "none";
  document.getElementById("supportiveExplanation").innerHTML = "";
  document.getElementById("supportiveExplanation").style.display = "none";

  populateRootWordsDropdown();
}

// Populate root words dropdown
function populateRootWordsDropdown() {
  const rootWords = analyzer.getRootWords();
  //console.log('Populating dropdown with root words:', rootWords);
  rootSelection.innerHTML = "";
  // Add default option
  const defaultOption = document.createElement("option");
  defaultOption.value = "";
  defaultOption.textContent = "Select a root word...";
  rootSelection.appendChild(defaultOption);
  // Add root word options
  rootWords.forEach((word, index) => {
    const option = document.createElement("option");
    option.value = word;
    option.textContent = word;
    // Add data attribute for debugging
    option.setAttribute("data-index", index);
    rootSelection.appendChild(option);
    //console.log(`Added option ${index + 1}: "${word}" (length: ${word.length})`);
  });

  //console.log('Dropdown populated with', rootWords.length, 'words');
  //console.log('Total options in dropdown:', rootSelection.options.length);

  // Verify options are visible
  if (rootSelection.options.length <= 1) {
    console.error("Dropdown has no word options!");
    showFeedback(
      "No words available in dropdown. Please check data files.",
      "error",
    );
  }
}

// Handle root word selection
function handleRootSelection() {
  const selectedRoot = rootSelection.value;
  //console.log('Root selected:', selectedRoot);

  if (!selectedRoot) {
    hideParadigmSection();
    hideAddDeleteSection();
    // Clear explanation when no root is selected
    document.getElementById("supportiveExplanation").innerHTML = "";
    document.getElementById("supportiveExplanation").style.display = "none";
    return;
  }

  analyzer.currentRoot = selectedRoot;
  analyzer.currentParadigm = analyzer.getParadigm(selectedRoot);
  analyzer.correctAnswers = analyzer.getCorrectAnswers(selectedRoot);

  //console.log('Current paradigm:', analyzer.currentParadigm);
  //console.log('Correct answers:', analyzer.correctAnswers);

  showParadigmTable(selectedRoot);
  showAddDeleteTable();
  clearFeedback();
  clearResults();

  // Clear explanation when a new root is selected
  document.getElementById("supportiveExplanation").innerHTML = "";
  document.getElementById("supportiveExplanation").style.display = "none";
}

// Show paradigm table (modified: do not show answers, show placeholders and instructional message)
function showParadigmTable(rootWord) {
  const caseDirectLabel = analyzer.currentLanguage === "en" ? "N/A" : "direct";
  const caseObliqueLabel =
    analyzer.currentLanguage === "en" ? "N/A" : "oblique";

  // Optional instructional message above the table
  paradigmTable.innerHTML = `
      <table class="paradigm-display-table">
        <thead>
          <tr>
            <th>Word Form</th>
            <th>Root</th>
            <th>Number</th>
            <th>Case</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>?</td>
            <td>${rootWord}</td>
            <td>singular</td>
            <td>${caseDirectLabel}</td>
          </tr>
          <tr>
            <td>?</td>
            <td>${rootWord}</td>
            <td>singular</td>
            <td>${caseObliqueLabel}</td>
          </tr>
          <tr>
            <td>?</td>
            <td>${rootWord}</td>
            <td>plural</td>
            <td>${caseDirectLabel}</td>
          </tr>
          <tr>
            <td>?</td>
            <td>${rootWord}</td>
            <td>plural</td>
            <td>${caseObliqueLabel}</td>
          </tr>
        </tbody>
      </table>
    `;
  paradigmSection.style.display = "block";
}

// Show add-delete table
function showAddDeleteTable() {
  const directLabel = analyzer.currentLanguage === "en" ? "N/A" : "Direct";
  const obliqueLabel = analyzer.currentLanguage === "en" ? "N/A" : "Oblique";

  const categories = [
    {
      number: "sing",
      case: "dr",
      fullNumber: "Singular",
      fullCase: directLabel,
    },
    {
      number: "sing",
      case: "ob",
      fullNumber: "Singular",
      fullCase: obliqueLabel,
    },
    {
      number: "plu",
      case: "dr",
      fullNumber: "Plural",
      fullCase: directLabel,
    },
    {
      number: "plu",
      case: "ob",
      fullNumber: "Plural",
      fullCase: obliqueLabel,
    },
  ];
  // Always show "None" as the first option
  let deleteOptions = analyzer.answerOptions
    .map((opt) => `<option value="${opt}">${opt}</option>`)
    .join("");
  let addOptions = deleteOptions;
  //console.log('Creating add-delete table with options:', analyzer.answerOptions);
  let tableHTML = "";
  categories.forEach((cat, index) => {
    tableHTML += `
      <tr>
        <td>
          <select id="del${cat.number}${cat.case}" class="select-box">
            ${deleteOptions}
          </select>
        </td>
        <td>
          <select id="add${cat.number}${cat.case}" class="select-box">
            ${addOptions}
          </select>
        </td>
        <td>${cat.fullNumber}</td>
        <td>${cat.fullCase}</td>
        <td id="check${index}" class="check-cell"></td>
      </tr>
    `;
  });

  addDeleteTableBody.innerHTML = tableHTML;
  addDeleteSection.style.display = "block";
  submitButton.disabled = false;
  // Set all dropdowns to "None" by default
  const allSelects = addDeleteTableBody.querySelectorAll("select");
  allSelects.forEach((select) => {
    select.selectedIndex = 0;
  });
}

// Handle form submission
function handleSubmit() {
  if (!analyzer.currentRoot) {
    console.log("No root selected");
    return;
  }

  // Collect user answers
  const userAnswers = [
    document.getElementById("delsingdr").value,
    document.getElementById("delsingob").value,
    document.getElementById("delpludr").value,
    document.getElementById("delpluob").value,
    document.getElementById("addsingdr").value,
    document.getElementById("addsingob").value,
    document.getElementById("addpludr").value,
    document.getElementById("addpluob").value,
  ];

  //console.log('User answers collected:', userAnswers);

  analyzer.userAnswers = userAnswers;
  const results = analyzer.checkAnswers(userAnswers);

  //console.log('Check results:', results);

  // Update UI with results
  updateCheckResults(results);

  // Show feedback
  const allCorrect = results.every((result) => result);
  if (allCorrect) {
    showFeedback("✅ Correct! All transformations are correct.", "success");
    getAnswerButton.style.display = "none";
    showSupportiveExplanation(analyzer.currentRoot, analyzer.correctAnswers);
  } else {
    showFeedback(
      '❌ Some transformations are incorrect. Review your answers or use "Get Answer" to see the correct transformations.',
      "error",
    );
    getAnswerButton.style.display = "inline-flex";
    getAnswerButton.disabled = false;
    document.getElementById("supportiveExplanation").style.display = "none";
  }
  checkHeader.innerHTML = "<b>Results</b>";
}

// Update check results in the table
function updateCheckResults(results) {
  // Get all select elements
  const deleteSelects = [
    document.getElementById("delsingdr"),
    document.getElementById("delsingob"),
    document.getElementById("delpludr"),
    document.getElementById("delpluob"),
  ];

  const addSelects = [
    document.getElementById("addsingdr"),
    document.getElementById("addsingob"),
    document.getElementById("addpludr"),
    document.getElementById("addpluob"),
  ];
  for (let i = 0; i < 4; i++) {
    const checkCell = document.getElementById(`check${i}`);
    const deleteCorrect = results[i];
    const addCorrect = results[i + 4];
    if (deleteSelects[i]) {
      deleteSelects[i].classList.remove("correct", "incorrect");
      deleteSelects[i].classList.add(deleteCorrect ? "correct" : "incorrect");
    }
    if (addSelects[i]) {
      addSelects[i].classList.remove("correct", "incorrect");
      addSelects[i].classList.add(addCorrect ? "correct" : "incorrect");
    }
    if (deleteCorrect && addCorrect) {
      checkCell.innerHTML =
        '<i class="fas fa-check-circle" style="color: #4CAF50; font-size: 1.2em;"></i>';
    } else {
      checkCell.innerHTML =
        '<i class="fas fa-times-circle" style="color: #F44336; font-size: 1.2em;"></i>';
    }
  }
}

// Show correct answers
function showCorrectAnswers() {
  if (!analyzer.correctAnswers.length) {
    console.log("No correct answers available");
    return;
  }

  let answerHTML = `
        <h4>Correct Add-Delete Table for "${analyzer.currentRoot}"</h4>
        <table class="correct-answer-table">
            <thead>
                <tr>
                    <th>Delete</th>
                    <th>Add</th>
                    <th>Number</th>
                    <th>Case</th>
                </tr>
            </thead>
            <tbody>
    `;

  const directLabel = analyzer.currentLanguage === "en" ? "N/A" : "Direct";
  const obliqueLabel = analyzer.currentLanguage === "en" ? "N/A" : "Oblique";

  const categories = [
    { number: "Singular", case: directLabel },
    { number: "Singular", case: obliqueLabel },
    { number: "Plural", case: directLabel },
    { number: "Plural", case: obliqueLabel },
  ];
  categories.forEach((cat, index) => {
    answerHTML += `
            <tr>
                <td>${
                  analyzer.correctAnswers[index]
                    ? analyzer.correctAnswers[index]
                    : "None"
                }</td>
                <td>${
                  analyzer.correctAnswers[index + 4]
                    ? analyzer.correctAnswers[index + 4]
                    : "None"
                }</td>
                <td>${cat.number}</td>
                <td>${cat.case}</td>
            </tr>
        `;
  });

  answerHTML += "</tbody></table>";
  correctAnswer.innerHTML = answerHTML;
  correctAnswer.style.display = "block";
  showSupportiveExplanation(analyzer.currentRoot, analyzer.correctAnswers);
}

// Show supportive explanation below the correct answer table
function showSupportiveExplanation(rootWord, correctAnswers) {
  const explanationDiv = document.getElementById("supportiveExplanation");
  let explanation = "";

  if (analyzer.currentLanguage === "en") {
    explanation = `
      <div style="margin-top:1em; background:#f8f9fa; border-left:4px solid #4361ee; padding:0.8em 1em; border-radius:0.5em;">
        <b>Explanation:</b> For English nouns in this simulation, Number is modeled directly while Case is shown as N/A. Singular rows use singular noun forms and plural rows use plural noun forms.
      </div>
    `;
    explanationDiv.innerHTML = explanation;
    explanationDiv.style.display = "block";
    return;
  }

  // If all deletes and adds are "None" or empty (invariable/uncountable/loanwords)
  if (
    correctAnswers.slice(0, 4).every((del) => !del || del === "None") &&
    correctAnswers.slice(4, 8).every((add) => !add || add === "None")
  ) {
    explanation = `
      <div style="margin-top:1em; background:#f8f9fa; border-left:4px solid #4361ee; padding:0.8em 1em; border-radius:0.5em;">
        <b>Explanation:</b> For words like "<b>${rootWord}</b>" (which are invariable, uncountable, or loanwords), nothing is deleted or added in any form ("None" in both Delete and Add columns). The word remains unchanged for all number and case combinations.
      </div>
    `;
  }
  // If all deletes are "None" or empty, but some adds are present (consonant-ending inflecting nouns)
  else if (correctAnswers.slice(0, 4).every((del) => !del || del === "None")) {
    explanation = `
      <div style="margin-top:1em; background:#f8f9fa; border-left:4px solid #4361ee; padding:0.8em 1em; border-radius:0.5em;">
        <b>Explanation:</b> For words like "<b>${rootWord}</b>" that end with a consonant, nothing is deleted in any form ("None" in the Delete column). Only the appropriate suffix is <b>added</b> for plural forms (e.g., "एं" for plural direct, "ओं" for plural oblique). For singular forms, the word remains unchanged.
      </div>
    `;
  } else {
    explanation = "";
  }
  explanationDiv.innerHTML = explanation;
  explanationDiv.style.display = explanation ? "block" : "none";
}

// Reset the simulation
function resetSimulation() {
  if (languageSelection) {
    languageSelection.value = analyzer.currentLanguage;
  }
  rootSelection.selectedIndex = 0;
  hideParadigmSection();
  hideAddDeleteSection();
  clearFeedback();
  clearResults();
  analyzer.currentRoot = null;
  analyzer.currentParadigm = null;
  analyzer.correctAnswers = [];
  analyzer.userAnswers = [];
  submitButton.disabled = true;
  getAnswerButton.style.display = "none";
  checkHeader.innerHTML = "";
  correctAnswer.innerHTML = "";
  correctAnswer.style.display = "none";
  document.getElementById("supportiveExplanation").innerHTML = "";
  document.getElementById("supportiveExplanation").style.display = "none";
}

// Utility functions
function hideParadigmSection() {
  paradigmSection.style.display = "none";
}
function hideAddDeleteSection() {
  addDeleteSection.style.display = "none";
}
function clearFeedback() {
  feedback.innerHTML = "";
  feedback.className = "feedback-container";
}
function clearResults() {
  correctAnswer.innerHTML = "";
  correctAnswer.style.display = "none";
  checkHeader.innerHTML = "";
  for (let i = 0; i < 4; i++) {
    const checkCell = document.getElementById(`check${i}`);
    if (checkCell) {
      checkCell.innerHTML = "";
    }
  }
  const allSelects = addDeleteTableBody.querySelectorAll("select");
  allSelects.forEach((select) => {
    select.selectedIndex = 0;
    select.classList.remove("correct", "incorrect");
  });
}
function showFeedback(message, type) {
  feedback.innerHTML = message;
  feedback.className = `feedback-container ${type}`;
}

// Setup event listeners
function setupEventListeners() {
  if (languageSelection) {
    languageSelection.addEventListener("change", handleLanguageSelection);
  }
  rootSelection.addEventListener("change", handleRootSelection);
  submitButton.addEventListener("click", handleSubmit);
  getAnswerButton.addEventListener("click", showCorrectAnswers);
  resetButton.addEventListener("click", resetSimulation);
}

// Setup instructions panel
function setupInstructionsPanel() {
  const instructionsTab = document.getElementById("instructionsTab");
  const instructionsContent = document.getElementById("instructionsContent");
  const arrowIcon = instructionsTab.querySelector(".arrow-icon");
  if (instructionsTab && instructionsContent && arrowIcon) {
    instructionsContent.classList.add("collapsed");
    instructionsTab.classList.add("collapsed");
    arrowIcon.classList.remove("fa-chevron-up");
    arrowIcon.classList.add("fa-chevron-down");
    instructionsTab.addEventListener("click", () => {
      instructionsContent.classList.toggle("collapsed");
      instructionsTab.classList.toggle("collapsed");
      if (instructionsContent.classList.contains("collapsed")) {
        arrowIcon.classList.remove("fa-chevron-up");
        arrowIcon.classList.add("fa-chevron-down");
      } else {
        arrowIcon.classList.remove("fa-chevron-down");
        arrowIcon.classList.add("fa-chevron-up");
      }
    });
  }
}

// Initialize the application when DOM is loaded
document.addEventListener("DOMContentLoaded", initializeApp);
