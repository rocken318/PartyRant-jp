const fs = require('fs');
const path = require('path');

const ROOT_DIR = process.cwd();
const FILES_DIR = path.join(ROOT_DIR, 'files');

const SOURCES = [
  {
    group: 'partyrant_presets.json',
    paths: [path.join(FILES_DIR, 'partyrant_presets.json')],
  },
  {
    group: 'partyrant_majority_quiz_pack.json',
    paths: [path.join(FILES_DIR, 'partyrant_majority_quiz_pack.json')],
  },
  {
    group: '0420/partyrant_quizzes',
    paths: listJsonFiles(path.join(FILES_DIR, '0420', 'partyrant_quizzes')),
  },
  {
    group: '0420/partyrant_quizzes_vol2',
    paths: listJsonFiles(path.join(FILES_DIR, '0420', 'partyrant_quizzes_vol2')),
  },
  {
    group: '0420/partyrant_trivia_quizzes',
    paths: listJsonFiles(path.join(FILES_DIR, '0420', 'partyrant_trivia_quizzes')),
  },
];

function listJsonFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((file) => file.endsWith('.json'))
    .sort((a, b) => a.localeCompare(b, 'ja'))
    .map((file) => path.join(dir, file));
}

function readJson(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8');
  return JSON.parse(raw);
}

function relativePath(filePath) {
  return path.relative(ROOT_DIR, filePath).replace(/\\/g, '/');
}

function isPresetGame(value) {
  return (
    value &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    typeof value.title === 'string' &&
    Array.isArray(value.questions)
  );
}

function normalizePartTitle(title) {
  return title
    .replace(/[ 　]*パート[0-9０-９]+[ 　]*$/u, '')
    .replace(/[ 　]*Part[ 　]*[0-9]+[ 　]*$/iu, '')
    .trim();
}

function normalizeOptions(options) {
  if (!Array.isArray(options)) return null;
  return JSON.stringify(options);
}

function pushMap(map, key, value) {
  if (!key) return;
  if (!map.has(key)) map.set(key, []);
  map.get(key).push(value);
}

function uniqBy(items, keyFn) {
  const seen = new Set();
  return items.filter((item) => {
    const key = keyFn(item);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function collectPresets() {
  const presets = [];
  const loadErrors = [];

  for (const source of SOURCES) {
    for (const filePath of source.paths) {
      try {
        const data = readJson(filePath);
        if (!Array.isArray(data)) {
          loadErrors.push(`${relativePath(filePath)}: root is not an array`);
          continue;
        }

        data.forEach((item, index) => {
          if (!isPresetGame(item)) return;
          presets.push({
            sourceGroup: source.group,
            source: relativePath(filePath),
            index,
            title: item.title,
            mode: item.mode || null,
            questions: item.questions,
          });
        });
      } catch (error) {
        loadErrors.push(`${relativePath(filePath)}: ${error.message}`);
      }
    }
  }

  return { presets, loadErrors };
}

function buildReport(presets) {
  const titles = new Map();
  const baseTitles = new Map();
  const questions = new Map();
  const optionSets = new Map();

  for (const preset of presets) {
    const presetKey = `${preset.source}#${preset.index}`;
    const presetRef = {
      source: preset.source,
      sourceGroup: preset.sourceGroup,
      presetTitle: preset.title,
      mode: preset.mode,
      presetKey,
    };

    pushMap(titles, preset.title, presetRef);
    pushMap(baseTitles, normalizePartTitle(preset.title), {
      source: preset.source,
      sourceGroup: preset.sourceGroup,
      fullTitle: preset.title,
      presetKey,
    });

    for (const [questionIndex, question] of preset.questions.entries()) {
      if (!question || typeof question !== 'object') continue;

      const questionText = typeof question.text === 'string' ? question.text.trim() : '';
      const questionRef = {
        source: preset.source,
        sourceGroup: preset.sourceGroup,
        presetTitle: preset.title,
        mode: preset.mode,
        questionIndex,
        presetKey,
      };

      pushMap(questions, questionText, questionRef);

      const optionsKey = normalizeOptions(question.options);
      if (optionsKey) {
        pushMap(optionSets, optionsKey, {
          ...questionRef,
          questionText,
          options: question.options,
        });
      }
    }
  }

  const titleDuplicates = [...titles.entries()]
    .filter(([, instances]) => uniqBy(instances, (item) => item.presetKey).length > 1)
    .map(([title, instances]) => ({
      title,
      instances: uniqBy(instances, (item) => item.presetKey).map(stripInternalKeys),
    }))
    .sort((a, b) => b.instances.length - a.instances.length || a.title.localeCompare(b.title, 'ja'));

  const questionDuplicates = [...questions.entries()]
    .filter(([, instances]) => uniqBy(instances, (item) => item.presetKey).length > 1)
    .map(([questionText, instances]) => ({
      questionText,
      instances: uniqBy(instances, (item) => item.presetKey).map(stripInternalKeys),
      sameMode: new Set(instances.map((item) => item.mode)).size === 1,
    }))
    .sort((a, b) => {
      if (a.sameMode !== b.sameMode) return a.sameMode ? -1 : 1;
      return b.instances.length - a.instances.length || a.questionText.localeCompare(b.questionText, 'ja');
    });

  const similarTitles = [...baseTitles.entries()]
    .map(([baseName, instances]) => ({
      baseName,
      instances: uniqBy(instances, (item) => item.presetKey),
    }))
    .filter((entry) => new Set(entry.instances.map((item) => item.sourceGroup)).size > 1)
    .map((entry) => ({
      baseName: entry.baseName,
      instances: entry.instances.map(stripInternalKeys),
    }))
    .sort((a, b) => b.instances.length - a.instances.length || a.baseName.localeCompare(b.baseName, 'ja'));

  const optionDuplicates = [...optionSets.entries()]
    .map(([, instances]) => {
      const uniqueQuestionTexts = new Set(instances.map((item) => item.questionText));
      const uniquePresets = uniqBy(instances, (item) => `${item.presetKey}:${item.questionIndex}`);
      return {
        options: instances[0].options,
        instances: uniquePresets,
        uniqueQuestionTextCount: uniqueQuestionTexts.size,
      };
    })
    .filter((entry) => entry.instances.length > 1 && entry.uniqueQuestionTextCount > 1)
    .map((entry) => ({
      options: entry.options,
      instances: entry.instances.map(stripInternalKeys),
    }))
    .sort((a, b) => b.instances.length - a.instances.length || a.options.join('').localeCompare(b.options.join(''), 'ja'));

  return {
    generatedAt: new Date().toISOString(),
    summary: {
      presetsChecked: presets.length,
      titleDuplicates: titleDuplicates.length,
      questionDuplicates: questionDuplicates.length,
      optionDuplicates: optionDuplicates.length,
      similarTitles: similarTitles.length,
    },
    titleDuplicates,
    questionDuplicates: questionDuplicates.map(({ sameMode, ...entry }) => entry),
    optionDuplicates,
    similarTitles,
  };
}

function stripInternalKeys(item) {
  const { presetKey, sourceGroup, ...publicItem } = item;
  return publicItem;
}

function printReport(report, loadErrors) {
  console.log('重複チェック結果');
  console.log('================');
  console.log(`生成日時: ${report.generatedAt}`);
  console.log(`チェックしたプリセット数: ${report.summary.presetsChecked}`);
  console.log(`タイトル完全一致: ${report.summary.titleDuplicates}件`);
  console.log(`問題文完全一致: ${report.summary.questionDuplicates}件`);
  console.log(`選択肢完全一致（問題文違い）: ${report.summary.optionDuplicates}件`);
  console.log(`類似タイトル（クロスソース）: ${report.summary.similarTitles}件`);

  if (loadErrors.length > 0) {
    console.log('\n読み込みエラー');
    for (const error of loadErrors) console.log(`- ${error}`);
  }

  printSection('\nタイトル完全一致', report.titleDuplicates, (entry) => {
    console.log(`- ${entry.title}`);
    for (const instance of entry.instances) {
      console.log(`  - [${instance.source}] ${instance.presetTitle}`);
    }
  });

  printSection('\n問題文完全一致', report.questionDuplicates, (entry) => {
    console.log(`- ${entry.questionText}`);
    for (const instance of entry.instances) {
      console.log(`  - [${instance.source}] ${instance.presetTitle} (${instance.mode})`);
    }
  });

  printSection('\n選択肢完全一致（問題文違い）', report.optionDuplicates, (entry) => {
    console.log(`- ${entry.options.join(' / ')}`);
    for (const instance of entry.instances) {
      console.log(`  - [${instance.source}] ${instance.presetTitle}: ${instance.questionText}`);
    }
  });

  printSection('\n類似タイトル（クロスソース）', report.similarTitles, (entry) => {
    console.log(`- ${entry.baseName}`);
    for (const instance of entry.instances) {
      console.log(`  - [${instance.source}] ${instance.fullTitle}`);
    }
  });
}

function printSection(title, entries, printEntry) {
  console.log(title);
  if (entries.length === 0) {
    console.log('- なし');
    return;
  }

  for (const entry of entries) printEntry(entry);
}

const { presets, loadErrors } = collectPresets();
const report = buildReport(presets);
const outputPath = path.join(FILES_DIR, 'duplicate-report.json');

fs.writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
printReport(report, loadErrors);
console.log(`\nJSONレポートを保存しました: ${relativePath(outputPath)}`);
