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

const ver = 'v0.2.6';
const DATA_URL = 'https://vriefcase.github.io/dataset.json';

// 시스템 임시 디렉터리에 캐시 저장(권한 이슈 방지)
const CACHE_FILE = path.join(os.tmpdir(), 'vriefcase.json');
const CACHE_TTL = 60 * 60 * 1000;

// 허용할 호스트 목록`
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
        console.error(pc.red('Error: Online connection required.'));
        process.exitCode = 1;
    }
}

// 별점 변환
function getStarRateString(rate) {
    let score = Number(rate) || 0;
    
    if (score < 0) score = 0;
    if (score > 5) score = 5;
    
    // 소수점이 들어올 경우를 대비해 정수 처리
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
                '/',
                '/System',
                '/Library',
                '/Applications',
                '/bin',
                '/sbin',
                '/usr',
                '/etc',
                '/var',
                '/private'
            ];
            break;
        }

        default: { // Linux
            blocked = [
                '/',
                '/bin',
                '/boot',
                '/dev',
                '/etc',
                '/lib',
                '/lib64',
                '/proc',
                '/root',
                '/run',
                '/sbin',
                '/srv',
                '/sys',
                '/usr',
                '/var'
            ];
            break;
        }
    }

    blocked = blocked.map(dir => path.resolve(dir).toLowerCase());

    if (blocked.includes(cwd)) {
        console.error(pc.red('Error: Safe path required.'));
        console.error(pc.yellow(`Current path: ${process.cwd()}`));
        process.exitCode = 1;
    }
}

// 데이터셋을 가져오거나 캐시된 파일을 읽음
async function fetchDataset(forceUpdate = false) {
    try {
        // 강제 업데이트가 아닐 때만 캐시 유효성 검사 진행
        if (!forceUpdate && fs.existsSync(CACHE_FILE)) {
            const stats = fs.statSync(CACHE_FILE);
            const now = Date.now();
            
            if (now - stats.mtimeMs < CACHE_TTL) {
                const rawData = fs.readFileSync(CACHE_FILE, 'utf-8');
                return JSON.parse(rawData);
            }
        }

        // URL 끝에 타임스탬프를 붙여 CDN/서버 캐싱 방지
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
        // 원격 데이터를 가져오지 못했을 때 기존 캐시가 있다면 비상용으로 반환 시도
        if (fs.existsSync(CACHE_FILE)) {
            try {
                const rawData = fs.readFileSync(CACHE_FILE, 'utf-8');
                return JSON.parse(rawData);
            } catch (cacheError) {
                // 캐시 파일 파싱마저 실패한 경우는 아래 에러 메시지로 넘김
            }
        }

        // JSON 파싱 실패 등 데이터를 정상적으로 가져오지 못한 경우 업데이트 안내
        console.error(pc.red('\nError: Failed to fetch or parse dataset.'));
        console.error(pc.red('The vriefcase.json file might be broken or network is unstable.'));
        console.log(pc.yellow('Please update the application by running:\n'));
        console.log('  ' + pc.cyan('npm install -g vriefcase\n'));
        
        process.exitCode = 1;
    }
}

// 저장소에서 프로젝트 스냅샷을 추출
async function extractSnapshot(repo, customPath) {
    const currentDir = process.cwd();
    let destPath;

    // 커스텀 경로가 지정된 경우 안전성 검사 진행
    if (customPath) {
        // 안전 검사 0: 역슬래시(\) 사용 차단 및 슬래시(/) 사용 안내 추가
        if (customPath.includes('\\')) {
            console.error(pc.red('Error: Backslashes (\\) are not allowed. Please use forward slashes (/) for paths.'));
            return;
        }

        // 안전 검사 1: 절대 경로 및 Windows 드라이브 문자(C:, D: 등) 포함 여부 확인
        if (path.isAbsolute(customPath) || /^[a-zA-Z]:/.test(customPath)) {
            console.error(pc.red('Error: Absolute paths are not allowed for safety.'));
            return;
        }

        // 안전 검사 2: 상위 디렉터리 접근(..) 확인 (../my-repo 등 차단)
        const normalizedPath = path.normalize(customPath);
        if (normalizedPath.startsWith('..') || normalizedPath.startsWith(path.sep + '..')) {
            console.error(pc.red('Error: Accessing parent directories is not allowed for safety.'));
            return;
        }

        //Git Bash 환경 감지 및 힌트 제공
        // const isGitBash = process.platform === 'win32' && process.env.MSYSTEM;
        
        // if (isGitBash && !customPath.includes('/') && !customPath.includes('\\')) {
        //     console.log(pc.yellow('Warning: In Git Bash, backslashes (\\) are ignored. Use forward slashes (/) for nested directories.'));
        // }

        destPath = path.join(currentDir, customPath);
    } else {
        destPath = path.join(currentDir, repo.name);
    }

    // 중복된 디렉터리 이름이 이미 존재한다면 타임스탬프 추가
    if (fs.existsSync(destPath)) {
        const timestamp = Date.now();
        destPath = `${destPath}_${timestamp}`;
    }

    let degitPath = repo.repo;
    let branchName = null;

    // repo 문자열에서 '#' 기호를 기준으로 브랜치명을 추출
    if (degitPath && degitPath.includes('#')) {
        const parts = degitPath.split('#');
        branchName = parts[1];
    }

    if (branchName) {
        console.log(`Extracting project snapshot from '${repo.name}/${branchName}' to '${destPath}'...`);
    } else {
        // branch가 명시되지 않은 경우 degit이 기본적으로 main/master를 복제
        console.log(`Extracting project snapshot from '${repo.name}' to '${destPath}'...`);
    }

    const emitter = degit(degitPath, {
        cache: false,
        force: true
    });

    // 5초 이상 걸릴 경우 사용자 안내 타이머 시작
    const noticeTimer = setTimeout(() => {
        console.log(pc.dim('Taking longer than expected? Press Ctrl+C to cancel extraction.'));
    }, 5000);

    try {
        await emitter.clone(destPath);
        clearTimeout(noticeTimer); // 추출 성공 시 안내 타이머 해제
        
        let removedItems = [];
        REMOVE_TARGETS.forEach(target => {
            const targetPath = path.join(destPath, target);
            if (fs.existsSync(targetPath)) {
                fs.rmSync(targetPath, { recursive: true, force: true });
                removedItems.push(target);
            }
        });

        const removedMsg = removedItems.length > 0 
            ? ` (Removed: ${removedItems.join(', ')})` 
            : '';

        console.log(pc.green('Successfully extracted project snapshot!'));
    } catch (error) {
        clearTimeout(noticeTimer); // 에러 발생 시 안내 타이머 해제
        console.error(pc.red('\nError: Failed to extract project snapshot.'));
        
        if (error.code === 'MISSING_REF') {
            console.error(pc.red('Error: Project inaccessible or specified branch not found.'));
        } else if (error.code === 'COULD_NOT_DOWNLOAD') {
            console.error(pc.red('Error: Network connection and project info check required.'));
        } else {
            console.error(pc.red(`Error details: ${error.message}`));
        }
    }
}

// 메인 실행 로직
async function main() {
    const args = process.argv.slice(2);

    await checkNetwork();
    if (process.exitCode === 1) return;

    validateSafePath();
    if (process.exitCode === 1) return;

    // 첫 번째 입력값이 '@vriefcase'인지 확인
    const isSelfUpdate = args[0] && args[0].toLowerCase() === '@vriefcase';

    // 해당 플래그를 전달하여 데이터셋 호출 (true일 경우 캐시 무시)
    const dataset = await fetchDataset(isSelfUpdate);
    if (process.exitCode === 1) return;

    // --- 데이터 검증 로직 시작 (isActive 및 필수 키 체크) ---
    let isBrokenDataset = false;

    // 객체 형태가 아니거나 데이터가 없는 경우
    if (!dataset || typeof dataset !== 'object') {
        isBrokenDataset = true;
    } 
    // isActive 속성이 false로 설정된 경우
    else if (dataset.isActive === false) {
        isBrokenDataset = true;
    } 
    else {
        // 기존 코드의 'repo'와 언급된 'repos' 모두 호환 가능하도록 처리
        const reposToCheck = dataset.repos || dataset.repo || [];
        
        // 필수 키가 누락된 아이템이 있는지 검사
        for (const item of reposToCheck) {
            if (
                !('name' in item) ||
                !('desc' in item) ||
                !('repo' in item) ||
                !('url' in item) ||
                !('star' in item)
            ) {
                isBrokenDataset = true;
                break;
            }
        }
    }

    if (isBrokenDataset) {
        console.error(pc.red('\nError: Invalid, broken, or outdated vriefcase.json detected.'));
        console.log(pc.yellow('Please update the application by running:\n'));
        console.log('  ' + pc.cyan('npm install -g vriefcase\n'));
        process.exitCode = 1;
        return;
    }
    // --- 데이터 검증 로직 종료 ---

    // 검증이 완료된 데이터를 할당
    const rawRepositories = dataset.repos || dataset.repo || [];

    // 중복 제거 및 허용된 호스트(GitHub, GitLab, Bitbucket) 필터링 로직
    const repoMap = new Map();
    const duplicateTitles = new Set();

    for (const repo of rawRepositories) {
        if (repo.repo && repo.repo.includes(':')) {
            const host = repo.repo.split(':')[0].toLowerCase();
            if (!ALLOWED_HOSTS.includes(host)) {
                continue; // 허용되지 않은 호스트(sourcehut 등)는 제외
            }
        }

        if (repoMap.has(repo.name)) {
            duplicateTitles.add(repo.name);
        }
        repoMap.set(repo.name, repo);
    }

    // 병합 및 필터링이 완료된 안전한 저장소 목록을 최종 배열로 사용
    const repositories = Array.from(repoMap.values());

    if (args.length === 0) {
        console.log(pc.bold(pc.cyan('\nvriefcase')), ver);
        console.log('the virtual briefcase for all intelligent beings.\n');

        console.log(pc.bold('\nusage:\n'));

        console.log(`  ${pc.cyan('vriefcase')}`);
        console.log(`  show help and discover projects.\n`);

        console.log(`  ${pc.cyan('vriefcase')} ${pc.dim('<project hint...>')}`);
        console.log(`  search projects using hints.`);
        console.log(`  ex: ${pc.dim('vriefcase popular css framework')}\n`);

        console.log(`  ${pc.cyan('vriefcase')} @${pc.dim('<project-name>')}`);
        console.log(`  extract project snapshot to local machine.`);
        console.log(`  ex: ${pc.dim('vriefcase @bootstrap')}\n`);

        // 중복 name이 존재할 경우 경고 메시지 노출
        if (duplicateTitles.size > 0) {
            console.log('\n' + pc.yellow(`Warning: Duplicate project names detected (${Array.from(duplicateTitles).join(', ')}).`));
            console.log(pc.yellow(`Using the last registered project.\n`));
        }

        console.log('\nopen your virtual briefcase. discover your next project.');
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

        // 유효성 검사(한글 제외)
        if (!/^[A-Za-z0-9._-]+$/.test(exactTitle)) {
            console.error(pc.red('Error: Unsupported project name. Only A-Z, a-z, 0-9, . (Dot), _ (Underscore), and - (Hyphen) are allowed.'));
            return;
        }

        if (exactTitle.length < 2) {
            console.error(pc.red('Error: Minimum 2 characters required (excluding @).'));
            return;
        }

        const repo = repositories.find(
            r => r.name.toLowerCase() === exactTitle.toLowerCase()
        );

        if (!repo) {
            console.log(pc.red('Error: Valid project name required.'));
            return;
        }

        // 별점 0점 처리 로직 세분화
        if (repo.star === 0) {
            if (exactTitle.toLowerCase() === 'vriefcase') {
                // vriefcase이면서 0점일 경우: 업데이트 성공 메시지만 띄우고 추출 없이 종료
                console.log(pc.green('Successfully updated vriefcase.json.'));
                return;
            }
            
            // 그 외 프로젝트가 0점일 경우: 에러 출력 후 종료
            console.log(pc.red('Error: Untrusted project.'));
            console.log(pc.red('Please contact the project maintainer.'));
            return;
        }

        const customPath = args[1]; // 두 번째 인자(원하는 디렉터리명) 가져오기
        await extractSnapshot(repo, customPath);
        return;
    }

    // 검색 분기
    if (query.length < 2) {
        console.error(pc.red('Error: Minimum 2 characters required.'));
        return;
    }

    // 입력된 모든 검색 인자를 소문자로 변환하여 배열로 준비
    let searchTerms = args.map(arg => arg.toLowerCase());

    // 유효성 검사(한글 제외)
    const hasInvalidTerm = searchTerms.some(term => !/^[a-z0-9._-]+$/.test(term));
    if (hasInvalidTerm) {
        console.error(pc.red('Error: Unsupported project name. Only A-Z, a-z, 0-9, . (Dot), _ (Underscore), and - (Hyphen) are allowed.'));
        return;
    }

    // hint 중복 검사 로직
    const uniqueTerms = new Set(searchTerms);
    if (uniqueTerms.size < searchTerms.length) {
        console.log(pc.yellow('\nWarning: Duplicate hints detected. Duplicates have been removed.'));
        searchTerms = Array.from(uniqueTerms);
    }

    // hint 최대 5개 제한 및 초과 시 경고 메시지 출력
    if (searchTerms.length > 5) {
        console.log(pc.yellow('\nWarning: Maximum of 5 hints allowed. Additional hints will be ignored.'));
        searchTerms = searchTerms.slice(0, 5);
    }

    const searchResults = repositories
        .map(r => {
            const titleStr = (r.name || '').toLowerCase();
            const descStr = (r.desc || '').toLowerCase();
            
            // OR 조건: 일치하는 힌트 개수(관련도) 계산
            let matchCount = 0;
            searchTerms.forEach(term => {
                if (titleStr.includes(term) || descStr.includes(term)) {
                    matchCount++;
                }
            });
            
            return { ...r, matchCount };
        })
        .filter(r => r.matchCount > 0) // 검색어가 하나라도 포함된 프로젝트만 필터링
        .sort((a, b) => {
            // 1순위 정렬: 관련도 (포함된 hint 개수) 내림차순
            if (b.matchCount !== a.matchCount) {
                return b.matchCount - a.matchCount;
            }
            // 2순위 정렬: star 기준 내림차순
            return (b.star || 0) - (a.star || 0);
        });

    if (searchResults.length === 0) {
        console.log(pc.red('Error: No related project found.'));
    } else {
        console.log();
        searchResults.forEach(r => {
            let fullRepo = r.repo || '';
            let repoPath = fullRepo;
            let branchName = '';

            // repo 키 내부에서 브랜치명을 분리
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
        console.log(
            `total: ${searchResults.length} ${searchResults.length <= 1 ? 'project' : 'projects'}`
        );
    }
}

main();
