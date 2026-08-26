#!/usr/bin/env node

/*!
 * Vriefcase by OhSahngAh
 * The Virtual Briefcase for All Intelligent Beings.
 * 
 * Released under the MIT License.
 * https://vriefcase.github.io/license
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const dns = require('dns').promises;

const pc = require('picocolors');
const degitRaw = require('degit');

// 안전하게 degit 모듈 호환성 처리
const degit = typeof degitRaw === 'function' ? degitRaw : degitRaw.default;

const ver = 'v0.3.3';
const DATA_URL = 'https://vriefcase.github.io/assets/dataset.json';

// 시스템 임시 디렉터리에 캐시 저장(권한 이슈 방지)
const CACHE_FILE = path.join(os.tmpdir(), 'vriefcase.json');
const CACHE_TTL = 60 * 60 * 1000;

// 허용할 호스트 목록
const ALLOWED_HOSTS = [
    'github',
    'gitlab',
    'bitbucket'
];

// 삭제하고 싶은 디렉터리나 파일 이름 추가
const REMOVE_TARGETS = [
    '.github',
    '.vscode'
];

function hyperlink(text, url) {
    return `\u001B]8;;${url}\u0007${text}\u001B]8;;\u0007`;
}

// 온라인 상태(인터넷 연결) 확인
async function checkNetwork() {
    try {
        await dns.lookup('github.com');
    } catch (error) {
        throw new Error('Online connection required.');
    }
}

// 별점 변환
function getStarRateString(rate) {
    let score = Number(rate) || 0;
    
    if (score < 0) score = 0;
    if (score > 5) score = 5;
    
    score = Math.floor(score); 
    
    const filled = '★'.repeat(score);
    const empty = '☆'.repeat(5 - score);
    
    return `${pc.yellow(filled)}${empty} ${score}/5`;
}

// 안전한 경로인지 확인
function validateSafePath() {
    const cwd = path.resolve(process.cwd()).toLowerCase();
    let blocked = [];

    switch (process.platform) {
        case 'win32': {
            const drive = path.parse(process.cwd()).root;
            blocked = [
                drive,
                path.join(drive, 'Windows'),
                path.join(drive, 'Program Files'),
                path.join(drive, 'Program Files (x86)'),
                path.join(drive, 'Program Files', 'Git'),
                path.join(drive, 'ProgramData'),
                path.join(drive, '$Recycle.Bin'),
                path.join(drive, 'System Volume Information')
            ];
            break;
        }
        case 'darwin': {
            blocked = [
                '/', '/System', '/Library', '/Applications', '/bin',
                '/sbin', '/usr', '/etc', '/var', '/private'
            ];
            break;
        }
        default: { // Linux
            blocked = [
                '/', '/bin', '/boot', '/dev', '/etc', '/lib', '/lib64',
                '/proc', '/root', '/run', '/sbin', '/srv', '/sys', '/usr', '/var'
            ];
            break;
        }
    }

    blocked = blocked.map(dir => path.resolve(dir).toLowerCase());

    if (blocked.includes(cwd)) {
        throw new Error(`Safe path required.\nCurrent path: ${process.cwd()}`);
    }
}

// 데이터셋을 가져오거나 캐시된 파일을 읽음
async function fetchDataset(forceUpdate = false) {
    try {
        if (!forceUpdate && fs.existsSync(CACHE_FILE)) {
            const stats = fs.statSync(CACHE_FILE);
            const now = Date.now();
            
            if (now - stats.mtimeMs < CACHE_TTL) {
                const rawData = fs.readFileSync(CACHE_FILE, 'utf-8');
                return JSON.parse(rawData);
            }
        }

        const cacheBustingUrl = `${DATA_URL}?_t=${Date.now()}`;
        const response = await fetch(cacheBustingUrl, {
            headers: {
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache'
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP Error: Status Code(${response.status})`);
        }

        const data = await response.json();
        fs.writeFileSync(CACHE_FILE, JSON.stringify(data, null, 4), 'utf-8');
        return data;
    } catch (error) {
        if (fs.existsSync(CACHE_FILE)) {
            try {
                const rawData = fs.readFileSync(CACHE_FILE, 'utf-8');
                return JSON.parse(rawData);
            } catch (cacheError) {}
        }
        throw new Error('Failed to fetch or parse dataset.\nThe vriefcase.json file might be broken or network is unstable.\nPlease update the application by running:\n  npm install -g vriefcase');
    }
}

// 저장소 목록을 가져오고 무결성 검증을 수행하는 내부 코어 함수
async function loadValidRepositories(isSelfUpdate = false) {
    await checkNetwork();
    const dataset = await fetchDataset(isSelfUpdate);

    let isBrokenDataset = false;

    if (!dataset || typeof dataset !== 'object') {
        isBrokenDataset = true;
    } else if (dataset.isActive === false) {
        isBrokenDataset = true;
    } else {
        const reposToCheck = dataset.repos || dataset.repo || [];
        for (const item of reposToCheck) {
            if (
                !('name' in item) || !('desc' in item) ||
                !('repo' in item) || !('url' in item) || !('star' in item)
            ) {
                isBrokenDataset = true;
                break;
            }
        }
    }

    if (isBrokenDataset) {
        throw new Error('Invalid, broken, or outdated vriefcase.json detected.\nPlease update the application by running:\n  npm install -g vriefcase');
    }

    const rawRepositories = dataset.repos || dataset.repo || [];
    const repoMap = new Map();
    const duplicateTitles = new Set();

    for (const repo of rawRepositories) {
        if (repo.repo && repo.repo.includes(':')) {
            const host = repo.repo.split(':')[0].toLowerCase();
            if (!ALLOWED_HOSTS.includes(host)) {
                continue;
            }
        }

        if (repoMap.has(repo.name)) {
            duplicateTitles.add(repo.name);
        }
        repoMap.set(repo.name, repo);
    }

    return {
        repositories: Array.from(repoMap.values()),
        duplicateTitles
    };
}

// 저장소에서 프로젝트 스냅샷을 추출하는 내부 코어 함수
async function extractSnapshotCore(repo, customPath, isCLI = true) {
    const currentDir = process.cwd();
    let destPath;

    if (customPath) {
        if (customPath.includes('\\')) throw new Error('Backslashes (\\) are not allowed. Please use forward slashes (/) for paths.');
        if (path.isAbsolute(customPath) || /^[a-zA-Z]:/.test(customPath)) throw new Error('Absolute paths are not allowed for safety.');
        
        const normalizedPath = path.normalize(customPath);
        if (normalizedPath.startsWith('..') || normalizedPath.startsWith(path.sep + '..')) {
            throw new Error('Accessing parent directories is not allowed for safety.');
        }

        destPath = path.join(currentDir, customPath);
    } else {
        destPath = path.join(currentDir, repo.name);
    }

    if (fs.existsSync(destPath)) {
        const timestamp = Date.now();
        destPath = `${destPath}_${timestamp}`;
    }

    let degitPath = repo.repo;
    let branchName = null;

    if (degitPath && degitPath.includes('#')) {
        const parts = degitPath.split('#');
        branchName = parts[1];
    }

    if (isCLI) {
        if (branchName) {
            console.log(`Extracting project snapshot from '${repo.name}/${branchName}' to '${destPath}'...`);
        } else {
            console.log(`Extracting project snapshot from '${repo.name}' to '${destPath}'...`);
        }
    }

    const emitter = degit(degitPath, { cache: false, force: true });
    
    let noticeTimer;
    if (isCLI) {
        noticeTimer = setTimeout(() => {
            console.log(pc.dim('Taking longer than expected? Press Ctrl+C to cancel extraction.'));
        }, 5000);
    }

    try {
        await emitter.clone(destPath);
        if (isCLI) clearTimeout(noticeTimer);
        
        let removedItems = [];
        REMOVE_TARGETS.forEach(target => {
            const targetPath = path.join(destPath, target);
            if (fs.existsSync(targetPath)) {
                fs.rmSync(targetPath, { recursive: true, force: true });
                removedItems.push(target);
            }
        });

        if (isCLI) {
            const removedMsg = removedItems.length > 0 ? ` (Removed: ${removedItems.join(', ')})` : '';
            console.log(pc.green(`Successfully extracted project snapshot!${removedMsg}`));
        }
    } catch (error) {
        if (isCLI) clearTimeout(noticeTimer);
        
        let errorMsg = 'Failed to extract project snapshot.';
        if (error.code === 'MISSING_REF') {
            errorMsg = 'Project inaccessible or specified branch not found.';
        } else if (error.code === 'COULD_NOT_DOWNLOAD') {
            errorMsg = 'Network connection and project info check required.';
        } else {
            errorMsg = `Details: ${error.message}`;
        }
        throw new Error(errorMsg);
    }
}

// ------------------------------------------------------------------
// 모듈 배포용 외부 API (Node.js 환경 내 프로그래밍 방식)
// ------------------------------------------------------------------

/**
 * vriefcase 저장소에서 프로젝트를 검색합니다.
 * @param {string|string[]} hints - 검색 키워드 (예: 'css', ['react', 'starter'])
 * @returns {Promise<Array>} 매칭된 프로젝트 객체 배열
 */
async function search(hints) {
    let searchTerms = Array.isArray(hints) ? hints : hints.split(' ');
    searchTerms = searchTerms.map(arg => arg.toLowerCase());

    if (searchTerms.length < 1) throw new Error('Search hints required.');

    const hasInvalidTerm = searchTerms.some(term => !/^[a-z0-9._-]+$/.test(term));
    if (hasInvalidTerm) throw new Error('Unsupported search hints. Only A-Z, a-z, 0-9, ., _, and - are allowed.');
    
    const hasBadFormatTerm = searchTerms.some(term => /(^[._-])|([._-]$)|([._-]{2,})/.test(term));
    if (hasBadFormatTerm) throw new Error('Search hints cannot start or end with ., -, or _, and cannot contain them consecutively.');

    const uniqueTerms = new Set(searchTerms);
    if (uniqueTerms.size < searchTerms.length) {
        searchTerms = Array.from(uniqueTerms);
    }

    if (searchTerms.length > 5) searchTerms = searchTerms.slice(0, 5);

    const { repositories } = await loadValidRepositories();

    return repositories
        .filter(r => {
            const titleStr = (r.name || '').toLowerCase();
            const descStr = (r.desc || '').toLowerCase();
            return searchTerms.every(term => titleStr.includes(term) || descStr.includes(term));
        })
        .sort((a, b) => (b.star || 0) - (a.star || 0));
}

/**
 * 프로젝트의 스냅샷을 추출(다운로드)합니다.
 * @param {string} projectName - 추출할 프로젝트 이름 (예: 'osa')
 * @param {string} [customPath] - (선택) 직접 지정할 디렉터리 경로
 * @returns {Promise<void>}
 */
async function extract(projectName, customPath = null) {
    if (!projectName || typeof projectName !== 'string') {
        throw new Error('Valid project name required.');
    }

    const exactTitle = projectName.startsWith('@') ? projectName.slice(1).trim() : projectName.trim();

    if (!/^[A-Za-z0-9._-]+$/.test(exactTitle)) throw new Error('Unsupported project name.');
    if (/(^[._-])|([._-]$)|([._-]{2,})/.test(exactTitle)) throw new Error('Project name invalid format.');
    if (exactTitle.length < 2) throw new Error('Minimum 2 characters required.');

    validateSafePath();

    const { repositories } = await loadValidRepositories();
    const repo = repositories.find(r => r.name.toLowerCase() === exactTitle.toLowerCase());

    if (!repo) {
        throw new Error('Project not found.');
    }

    if (repo.star === 0) {
        if (exactTitle.toLowerCase() === 'vriefcase') return; // vriefcase 자체 업데이트 시엔 바로 종료
        throw new Error('Untrusted project. Please contact the project maintainer.');
    }

    await extractSnapshotCore(repo, customPath, false); // CLI 모드가 아니므로 로그 미출력
}


// ------------------------------------------------------------------
// CLI(터미널 명령어) 실행 로직
// ------------------------------------------------------------------
async function main() {
    const args = process.argv.slice(2);
    
    let datasetInfo;
    try {
        datasetInfo = await loadValidRepositories(args[0] && args[0].toLowerCase() === '@vriefcase');
    } catch (error) {
        const errorLines = error.message.split('\n');
        console.error(pc.red('\nError: ' + errorLines[0]));
        if (errorLines.length > 1) {
            errorLines.slice(1).forEach(line => {
                if (line.includes('npm install')) console.log('  ' + pc.cyan(line.trim()) + '\n');
                else console.log(pc.yellow(line));
            });
        }
        process.exitCode = 1;
        return;
    }

    try {
        validateSafePath();
    } catch(error) {
        console.error(pc.red('Error: Safe path required.'));
        console.error(pc.yellow(`Current path: ${process.cwd()}`));
        process.exitCode = 1;
        return;
    }

    const { repositories, duplicateTitles } = datasetInfo;

    // 도움말 출력
    if (args.length === 0) {
        console.log(pc.bold(pc.cyan('\nvriefcase')), ver);
        console.log('the virtual briefcase for all intelligent beings.\n');

        console.log(pc.bold('\nusage:\n'));

        console.log(`  ${pc.cyan('vriefcase')}`);
        console.log(`  show help and guidance.\n`);

        console.log(`  ${pc.cyan('vriefcase')} ${pc.dim('<project hint...>')}`);
        console.log(`  discover projects using hints.`);
        console.log(`  ex: ${pc.dim('vriefcase popular css framework')}\n`);

        console.log(`  ${pc.cyan('vriefcase')} @${pc.dim('<project-name>')} ${pc.dim('[custom-name]')}`);
        console.log(`  extract project snapshot to local machine.`);
        console.log(`  ex: ${pc.dim('vriefcase @bootstrap')}`);
        console.log(`  ex: ${pc.dim('vriefcase @bootstrap ui')}`);
        console.log(`  ex: ${pc.dim('vriefcase @bootstrap ui/bootstrap')}\n`);

        if (duplicateTitles.size > 0) {
            console.log('\n' + pc.yellow(`Warning: Duplicate project names detected (${Array.from(duplicateTitles).join(', ')}).`));
            console.log(pc.yellow(`Using the last registered project.\n`));
        }

        console.log('\nopen your vriefcase & discover your next project.');
        return;
    }

    const query = args[0];

    // 스냅샷 추출 분기 (@)
    if (query.startsWith('@')) {
        const atCount = (query.match(/@/g) || []).length;

        if (atCount > 1) {
            console.error(pc.red('Error: Invalid usage. Only one @ is allowed.'));
            return;
        }

        const exactTitle = query.slice(1).trim();

        if (!/^[A-Za-z0-9._-]+$/.test(exactTitle)) {
            console.error(pc.red('Error: Unsupported project name. Only A-Z, a-z, 0-9, . (Dot), _ (Underscore), and - (Hyphen) are allowed.'));
            return;
        }
        
        if (/(^[._-])|([._-]$)|([._-]{2,})/.test(exactTitle)) {
            console.error(pc.red('Error: Project name cannot start or end with ., -, or _, and cannot contain them consecutively.'));
            return;
        }

        if (exactTitle.length < 2) {
            console.error(pc.red('Error: Minimum 2 characters required (excluding @).'));
            return;
        }

        const repo = repositories.find(r => r.name.toLowerCase() === exactTitle.toLowerCase());

        if (!repo) {
            console.log(pc.red('Error: Valid project name required.'));
            return;
        }

        if (repo.star === 0) {
            if (exactTitle.toLowerCase() === 'vriefcase') {
                console.log(pc.green('Successfully updated vriefcase.json.'));
                return;
            }
            console.log(pc.red('Error: Untrusted project.'));
            console.log(pc.red('Please contact the project maintainer.'));
            return;
        }

        const customPath = args[1]; // CLI에서 제공한 두 번째 인자를 커스텀 경로로 사용
        try {
            await extractSnapshotCore(repo, customPath, true);
        } catch (err) {
            console.error(pc.red('\nError: Failed to extract project snapshot.'));
            console.error(pc.red(err.message));
            process.exitCode = 1;
        }
        return;
    }

    // 검색 분기
    if (query.length < 2) {
        console.error(pc.red('Error: Minimum 2 characters required.'));
        return;
    }

    let searchTerms = args.map(arg => arg.toLowerCase());

    const hasInvalidTerm = searchTerms.some(term => !/^[a-z0-9._-]+$/.test(term));
    if (hasInvalidTerm) {
        console.error(pc.red('Error: Unsupported search hints. Only A-Z, a-z, 0-9, . (Dot), _ (Underscore), and - (Hyphen) are allowed.'));
        return;
    }
    
    const hasBadFormatTerm = searchTerms.some(term => /(^[._-])|([._-]$)|([._-]{2,})/.test(term));
    if (hasBadFormatTerm) {
        console.error(pc.red('Error: Search hints cannot start or end with ., -, or _, and cannot contain them consecutively.'));
        return;
    }

    const uniqueTerms = new Set(searchTerms);
    if (uniqueTerms.size < searchTerms.length) {
        console.log(pc.yellow('\nWarning: Duplicate hints detected. Duplicates have been removed.'));
        searchTerms = Array.from(uniqueTerms);
    }

    if (searchTerms.length > 5) {
        console.log(pc.yellow('\nWarning: Maximum of 5 hints allowed. Additional hints will be ignored.'));
        searchTerms = searchTerms.slice(0, 5);
    }

    const searchResults = repositories
        .filter(r => {
            const titleStr = (r.name || '').toLowerCase();
            const descStr = (r.desc || '').toLowerCase();
            return searchTerms.every(term => titleStr.includes(term) || descStr.includes(term));
        })
        .sort((a, b) => (b.star || 0) - (a.star || 0));

    if (searchResults.length === 0) {
        console.log(pc.red('Error: No related project found.'));
    } else {
        console.log();
        searchResults.forEach(r => {
            let fullRepo = r.repo || '';
            let repoPath = fullRepo;
            let branchName = '';

            if (fullRepo.includes('#')) {
                const parts = fullRepo.split('#');
                repoPath = parts[0];
                branchName = parts[1];
            }

            let host = '';
            let repoUser = '';
            let repoName = '';

            if (repoPath.includes(':')) {
                const parts = repoPath.split(':');
                host = parts[0]; 
                const pathPart = parts[1]; 
                
                if (pathPart && pathPart.includes('/')) {
                    const pathSegments = pathPart.split('/');
                    repoUser = pathSegments[0]; 
                    repoName = pathSegments.slice(1).join('/'); 
                } else {
                    repoName = pathPart;
                }
            } else {
                repoName = repoPath;
            }

            const recommendMark = (r.star || 0) >= 5 ? pc.yellow('(Recommended)') : '';

            if (r.url) {
                console.log('  @' + pc.bold(pc.cyan(hyperlink(r.name, r.url))), recommendMark);
            } else {
                console.log('  @' + pc.bold(pc.cyan(r.name)), recommendMark);
            }

            console.log('  ' + `${getStarRateString(r.star)}`);
            console.log('  ' + `${r.desc}`);

            console.log('  ' + 
                pc.yellow(host ? host + ':' : '') +
                pc.yellow(repoUser ? repoUser + '/' : '') +
                pc.yellow(repoName || '') +
                pc.yellow(branchName ? `#${branchName}` : '')
            );

            console.log();
        });
        console.log(`total: ${searchResults.length} ${searchResults.length <= 1 ? 'project' : 'projects'}`);
    }
}

// ------------------------------------------------------------------
// 모듈 내보내기 & CLI 실행 제어
// ------------------------------------------------------------------

/**
 * vriefcase 메인 모듈 함수
 * 첫 번째 전달인자가 '@'로 시작하면 추출(extract), 그렇지 않으면 검색(search)을 수행합니다.
 */
async function vriefcaseModule(...args) {
    if (args.length === 0) {
        throw new Error('Arguments required. Please provide a project name to extract or keywords to search.');
    }

    const query = args[0];

    // 첫 번째 인자가 문자열이고 '@'로 시작하는 경우 추출(Extract)
    if (typeof query === 'string' && query.startsWith('@')) {
        const customPath = typeof args[1] === 'string' ? args[1] : null;
        return await extract(query, customPath);
    } 
    // 그 외의 경우 전체 인자를 검색어 배열로 취급하여 검색(Search)
    else {
        return await search(args);
    }
}

// 기존 구조 분해 할당 방식({ search, extract })도 지원하기 위해 프로퍼티로 할당
vriefcaseModule.search = search;
vriefcaseModule.extract = extract;

// vriefcaseModule 래퍼 함수를 기본으로 내보냄
module.exports = vriefcaseModule;

// 파일이 직접 실행되었을 경우에만 터미널 명령어(main) 작동
if (require.main === module) {
    main();
}