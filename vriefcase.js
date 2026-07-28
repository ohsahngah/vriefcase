#!/usr/bin/env node

/*!
 * Vriefcase
 * The Virtual Briefcase for All Intelligent Beings.
 * Created in 2022 by OhSahngAh <ohsahngah@gmail.com>
 * 
 * Released under the MIT License.
 * https://ohsahngah.github.io/vriefcase/license
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const dns = require('dns').promises;

const pc = require('picocolors');
const degitRaw = require('degit');

// 안전하게 degit 모듈 호환성 처리
const degit = typeof degitRaw === 'function' ? degitRaw : degitRaw.default;

const ver = 'v0.0.3';
const DATA_URL = 'https://ohsahngah.github.io/vriefcase/vriefcase.json';

// 시스템 임시 디렉터리에 캐시 저장(권한 이슈 방지)
const CACHE_FILE = path.join(os.tmpdir(), 'vriefcase.json'); 
const CACHE_TTL = 60 * 60 * 1000;

// 허용할 호스트 목록
const ALLOWED_HOSTS = [
    'github',
    'gitlab',
    'bitbucket'
];

// 삭제하고 싶은 폴더나 파일 이름 추가
const REMOVE_TARGETS = [
    '.github'
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
        process.exit(1);
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
        process.exit(1);
    }
}

// 데이터셋을 가져오거나 캐시된 파일을 읽음
async function fetchDataset() {
    try {
        if (fs.existsSync(CACHE_FILE)) {
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
        // 원격 데이터를 가져오지 못했을 때 기존 캐시가 있다면 비상용으로 반환
        if (fs.existsSync(CACHE_FILE)) {
            const rawData = fs.readFileSync(CACHE_FILE, 'utf-8');
            return JSON.parse(rawData);
        }

        // console.error(pc.red('Error: Failed to fetch dataset:'), error);
        console.error(pc.red('Error: Failed to fetch dataset.'));
        process.exit(1);
    }
}

// 저장소에서 프로젝트 스냅샷을 추출
async function extractSnapshot(repo) {
    const currentDir = process.cwd();
    let destPath = path.join(currentDir, repo.title);

    if (fs.existsSync(destPath)) {
        const timestamp = Date.now();
        destPath = `${destPath}_${timestamp}`;
    }

    let degitPath = repo.repository;

    const branchName = repo.branch && typeof repo.branch === 'string' && repo.branch.trim() !== '' 
        ? repo.branch.trim() 
        : null;

    if (branchName) {
        degitPath += `#${branchName}`;
        console.log(`Extracting snapshot of branch '${branchName}' of '${repo.title}' to '${destPath}'...`);
    } else {
        console.log(`Extracting snapshot of '${repo.title}' to '${destPath}'...`);
    }

    const emitter = degit(degitPath, {
        cache: false,
        force: true
    });

    emitter.on('info', info => {
        console.log(info.message);
    });

    try {
        await emitter.clone(destPath);
        
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
        console.error(pc.red('\nError: Failed to extract project snapshot.'));
        
        if (error.code === 'MISSING_REF') {
            console.error(pc.red('Error: Project inaccessible or specified branch not found.'));
        } else if (error.code === 'COULD_NOT_DOWNLOAD') {
            console.error(pc.red('Error: Network connection and project info check required.'));
        } else {
            console.error(pc.red(`Error detail: ${error.message}`));
        }
    }
}

// 메인 실행 로직
async function main() {
    const args = process.argv.slice(2);

    await checkNetwork();
    validateSafePath();

    const dataset = await fetchDataset();
    const rawRepositories = dataset.repositories || [];
    const recommendationList = dataset.recommendationList || [];

    // 중복 제거 및 허용된 호스트(GitHub, GitLab, Bitbucket) 필터링 로직
    const repoMap = new Map();
    const duplicateTitles = new Set();

    for (const repo of rawRepositories) {
        if (repo.repository && repo.repository.includes(':')) {
            const host = repo.repository.split(':')[0].toLowerCase();
            if (!ALLOWED_HOSTS.includes(host)) {
                continue; // 허용되지 않은 호스트(sourcehut 등)는 제외
            }
        }

        if (repoMap.has(repo.title)) {
            duplicateTitles.add(repo.title);
        }
        repoMap.set(repo.title, repo);
    }

    // 병합 및 필터링이 완료된 안전한 저장소 목록을 최종 배열로 사용
    const repositories = Array.from(repoMap.values());

    if (args.length === 0) {
        console.log(pc.bold(pc.cyan('Vriefcase')), ver);
        console.log('The Virtual Briefcase for All Intelligent Beings.\n');
        console.log(pc.bold('Usage:'));
        console.log(`\tvriefcase                  : Show help and recommended projects`);
        console.log(`\tvriefcase <project-title>  : Search projects with similar titles`);
        console.log(`\tvriefcase @<project-title> : Extract project snapshot with matching title`);

        // 중복 title이 존재할 경우 경고 메시지 노출
        if (duplicateTitles.size > 0) {
            console.log('\n' + pc.yellow(`Warning: Duplicate project removal required (${Array.from(duplicateTitles).join(', ')}).`));
            console.log(pc.yellow(`Safely merged based on the last registered project.`));
        }

        console.log(pc.bold('\nRecommended:'));
        const recommendedRepos = repositories.filter(r => recommendationList.includes(r.title));
        
        if (recommendedRepos.length === 0) {
            console.log(pc.yellow('\tNo recommended projects available.'));
        } else {
            recommendedRepos.forEach((r, idx) => {
                console.log(`\t${pc.bold(pc.cyan(r.title))} (${getStarRateString(r.starRate)}) ${r.description}`);
            });
        }
        return;
    }

    const query = args[0];

    // 스냅샷 추출 분기 (@)
    if (query.startsWith('@')) {
        const exactTitle = query.slice(1).trim();

        if (exactTitle.length < 3) {
            console.error(pc.red('Error: Minimum 3 characters required (excluding @)'));
            return;
        }

        const repo = repositories.find(r => r.title === exactTitle);

        if (!repo) {
            console.log(pc.red('Error: Valid project title required.'));
            return;
        }

        if (repo.starRate === 0) {
            console.log(pc.red(`Error: Untrusted project.`));
            console.log(pc.red('Please contact the project maintainer'));
            return;
        }

        await extractSnapshot(repo);
        return;
    }

    // 검색 분기
    if (query.length < 3) {
        console.error(pc.red('Error: Minimum 3 characters required.'));
        return;
    }

    const searchResults = repositories
        .filter(r => r.title.toLowerCase().includes(query.toLowerCase()))
        .sort((a, b) => (b.starRate || 0) - (a.starRate || 0));

    if (searchResults.length === 0) {
        console.log(pc.red('Error: Valid project title required.'));
    } else {
        console.log();
        searchResults.forEach(r => {
            let host = '';
            let repoUser = '';
            let repoName = '';

            if (r.repository && r.repository.includes(':')) {
                const parts = r.repository.split(':');
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
                repoName = r.repository;
            }

            const branchName = r.branch && typeof r.branch === 'string' && r.branch.trim() !== '' 
                ? r.branch.trim() 
                : '';  // main or master
            
            const recommendMark = (r.starRate || 0) >= 5 ? pc.yellow('(Recommended)') : '';

            if (r.website) {
                console.log(pc.bold(pc.cyan(hyperlink(r.title, r.website))), recommendMark);
            } else {
                console.log(pc.bold(pc.cyan(r.title)), recommendMark);
            }

            console.log(`${getStarRateString(r.starRate)}`);
            console.log(`${r.description}`);

            console.log(
                pc.yellow(host + ':' || '') +
                pc.yellow(repoUser + '/' || '') +
                pc.yellow(repoName || '') +
                pc.yellow(branchName ? `#${branchName}` : ''));

            if (r.contact) console.log(`${r.contact}`);
            console.log();
        });
        console.log(
            `Total: ${searchResults.length} ${searchResults.length <= 1 ? 'project' : 'projects'}`
        );
    }
}

main();