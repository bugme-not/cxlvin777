const page1 = document.getElementById('page1');
const page3 = document.getElementById('page3');
const elVisitor = document.getElementById('visitorCount');
const elIP = document.getElementById('userIP');
const elUptime = document.getElementById('uptime');
const elLog = document.getElementById('systemLog');
const graphBars = document.querySelectorAll('.graph-bar');
const latencyDot = document.getElementById('latencyDot');
const configOutput = document.getElementById('configOutput');
const copyConfigBtn = document.getElementById('copyConfigBtn');
const addressSelect = document.getElementById('addressSelect');
const sniSelect = document.getElementById('sniSelect');
const serverHostSelect = document.getElementById('serverHostSelect');
const fetchHostBtn = document.getElementById('fetchHostBtn');
const transportCards = document.querySelectorAll('[data-transport]');
const protocolCards = document.querySelectorAll('[data-protocol]');
const fetchOverlay = document.getElementById('fetchOverlay');
const successMsg = document.getElementById('successMsg');
const fetchLoadingText = document.getElementById('fetchLoadingText');
const fetchLoadingWrapper = document.getElementById('fetchLoadingWrapper');

function closePopup() {
    successMsg.style.display = "none";
    fetchOverlay.classList.add("closing");
    setTimeout(() => {
        fetchOverlay.classList.remove("active", "closing");
    },400);
}

let serverStartTime = null;
const BACKEND_ENDPOINT = '/api/status';

const MASTER_LIST_URL = SERVER_CONFIG.MASTER_LIST_URL; 
let deployedServers = [...SERVER_CONFIG.deployedServers];

let activityHistory = Array(8).fill(0);
let currentLatency = 'good';
let logEntries = [];
const MAX_LOGS = 50;
let pageLoadTime = Date.now();
let selectedTransport = null;
let selectedProtocol = 'vless';
let cloudRunHost = null; 
let transportGlowTimer;

const configTemplates = {
    websocket: {
        vless: 'vless://cxlvin777@{{ADDRESS}}:443?encryption=none&type=ws&host={{SELECTED_HOST}}&headerType=none&path=%2FCxlvinVlWS%3Fed%3D2560&security=tls&sni={{SNI}}#CxlvinVlWS',
        trojan: 'trojan://Cxlvin777@{{ADDRESS}}:443?type=ws&host={{SELECTED_HOST}}&headerType=none&path=%2FCxlvinTRWS%3Fed%3D2560&security=tls&sni={{SNI}}#CxlvinTrWS',
        shadowsocks: 'ss://Y2hhY2hhMjAtaWV0Zi1wb2x5MTMwNTpDeGx2aW43Nzc=@{{ADDRESS}}:443?type=ws&host={{SELECTED_HOST}}&headerType=none&path=%2FCxlvinSSWS%3Fed%3D2560&security=tls&sni={{SNI}}#CxlvinSSWS - use default dns',
        vmess: 'vmess://{{VMESS_WS}}'
    },
    'http-upgrade': {
        vless: 'vless://cxlvin777@{{ADDRESS}}:443?encryption=none&type=httpupgrade&host={{SELECTED_HOST}}&headerType=none&path=%2FCxlvinVlHU%3Fed%3D2560&security=tls&sni={{SNI}}#CxlvinVlHU',
        trojan: 'trojan://Cxlvin777@{{ADDRESS}}:443?type=httpupgrade&host={{SELECTED_HOST}}&headerType=none&path=%2FCxlvinTRHU%3Fed%3D2560&security=tls&sni={{SNI}}#CxlvinTRHU',
        shadowsocks: 'ss://Y2hhY2hhMjAtaWV0Zi1wb2x5MTMwNTpDeGx2aW43Nzc=@{{ADDRESS}}:443?type=httpupgrade&host={{SELECTED_HOST}}&headerType=none&path=%2FCxlvinSSHU%3Fed%3D2560&security=tls&sni={{SNI}}#CxlvinSSHU - use default dns',
        vmess: 'vmess://{{VMESS_HU}}'
    },
    xhttp: {
        vless: 'vless://cxlvin777@{{ADDRESS}}:443?encryption=none&type=xhttp&host={{SELECTED_HOST}}&headerType=auto&path=%2FCxlvinVlXH%3Fed%3D2560&security=tls&sni={{SNI}}#CxlvinVlXH',
        trojan: 'trojan://Cxlvin777@{{ADDRESS}}:443?type=xhttp&host={{SELECTED_HOST}}&headerType=auto&path=%2FCxlvinTRXH%3Fed%3D2560&security=tls&sni={{SNI}}#CxlvinTRXH',
        shadowsocks: 'ss://Y2hhY2hhMjAtaWV0Zi1wb2x5MTMwNTpDeGx2aW43Nzc=@{{ADDRESS}}:443?type=xhttp&host={{SELECTED_HOST}}&headerType=auto&path=%2FCxlvinSSXH%3Fed%3D2560&security=tls&sni={{SNI}}#CxlvinSSXH - use default dns',
        vmess: 'vmess://{{VMESS_XH}}'
    }
};

const vmessBase = {
    ws: {
        add: 'app-analytics-services.com',
        port: '443',
        id: 'cxlvin777',
        aid: '0',
        scy: 'auto',
        net: 'ws',
        type: 'none',
        host: '',
        path: '/CxlvinVMWS?ed=2560',
        tls: 'tls',
        sni: '',
        ps: 'CxlvinVMWS',
        v: '2'
    },
    hu: {
        add: 'app-analytics-services.com',
        port: '443',
        id: 'cxlvin777',
        aid: '0',
        scy: 'auto',
        net: 'httpupgrade',
        type: 'none',
        host: '',
        path: '/CxlvinVMHU?ed=2560',
        tls: 'tls',
        sni: '',
        ps: 'CxlvinVMHU',
        v: '2'
    },
    xh: {
        add: 'app-analytics-services.com',
        port: '443',
        id: 'cxlvin777',
        aid: '0',
        scy: 'auto',
        net: 'xhttp',
        type: 'auto',
        host: '',
        path: '/CxlvinVMXH?ed=2560',
        tls: 'tls',
        sni: '',
        ps: 'CxlvinVMXH',
        v: '2'
    }
};

async function fetchAllServers() {
    addLog('Loading latest server list...');
    const originalCount = deployedServers.length;
    const currentHost = window.location.hostname;

    if(MASTER_LIST_URL){
        try {
            const res = await fetch(MASTER_LIST_URL, { cache: "no-store" });
            if (res.ok) {
                const updatedList = await res.json();
                deployedServers = [];
                updatedList.forEach(host => {
                    host = host.trim().replace('https://','').replace('/','');
                    if(host.includes('.run.app') && !deployedServers.includes(host)){
                        deployedServers.push(host);
                    }
                });
                addLog(`Updated list loaded from master source`);
            }
        } catch {
            addLog('Cannot access master list, using saved list');
        }
    }

    if (currentHost.includes('.run.app') && !deployedServers.includes(currentHost)) {
        deployedServers.push(currentHost);
        addLog(`Added current server: ${currentHost}`);
    }

    updateServerHostDropdown();
}

function updateServerHostDropdown() {
    serverHostSelect.innerHTML = `<option value="">Select Server Host</option>`;
    deployedServers.forEach(host => {
        const option = document.createElement('option');
        option.value = host;
        option.textContent = host;
        serverHostSelect.appendChild(option);
    });
}

async function detectCloudRunHost() {
    try {
        const currentHost = window.location.hostname;
        if (currentHost && currentHost.includes('.run.app')) {
            cloudRunHost = currentHost;
            addLog('Current server host detected');
            updateConfigOutput();
            return currentHost;
        } else {
            cloudRunHost = null;
            return null;
        }
    } catch (err) {
        cloudRunHost = null;
        return null;
    }
}

function formatElapsedTime() {
    const elapsed = Math.floor((Date.now() - pageLoadTime) / 1000);
    const h = String(Math.floor(elapsed / 3600)).padStart(2,'0');
    const m = String(Math.floor((elapsed % 3600) / 60)).padStart(2,'0');
    const s = String(Math.floor(elapsed % 60)).padStart(2,'0');
    return `[+${h}:${m}:${s}]`;
}
function addLog(message) {
    logEntries.push(`<div class="log-entry">${formatElapsedTime()} : ${message}</div>`);
    if (logEntries.length > MAX_LOGS) logEntries.shift();
    elLog.innerHTML = logEntries.join('');
    elLog.scrollTop = elLog.scrollHeight;
}
function getSavedStartTime() {
    const saved = localStorage.getItem('serverStartTime');
    if (saved) return parseInt(saved, 10);
    const now = Date.now();
    localStorage.setItem('serverStartTime', now);
    return now;
}
function formatUptime(seconds) {
    const h = String(Math.floor(seconds / 3600)).padStart(2, '0');
    const m = String(Math.floor((seconds % 3600) / 60)).padStart(2, '0');
    const s = String(Math.floor(seconds % 60)).padStart(2,'0');
    return `${h}:${m}:${s}`;
}
function updateLiveUptime() {
    if (!serverStartTime) return;
    const elapsed = Math.floor((Date.now() - serverStartTime) / 1000);
    elUptime.textContent = formatUptime(elapsed);
}

document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        page1.classList.remove('active');
        page3.classList.add('active');
        
        addLog('System Initializing...');
        loadAllRealData();
        setInterval(updateActivityGraph, 2000);
        setInterval(updateLatencyStatus, 16000);
        serverStartTime = getSavedStartTime();
        updateLiveUptime();
        setInterval(updateLiveUptime, 1000);
        detectCloudRunHost();
        fetchAllServers();
        addLog('System Status: READY');
        updateConfigOutput();
    }, 7000);
});

transportCards.forEach(card => {
    card.addEventListener('click', () => {
        transportCards.forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        selectedTransport = card.dataset.transport;
        addLog(`Transport Selected → ${selectedTransport.toUpperCase()}`);
        clearTimeout(transportGlowTimer);
        transportGlowTimer = setTimeout(() => {
            if (!selectedProtocol) {
                card.classList.remove('selected');
            }
        }, 7000);
        updateConfigOutput();
    });
});

protocolCards.forEach(card => {
    card.addEventListener('click', () => {
        protocolCards.forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        selectedProtocol = card.dataset.protocol;
        addLog(`Protocol Selected → ${selectedProtocol.toUpperCase()}`);
        clearTimeout(transportGlowTimer);
        updateConfigOutput();
    });
});

addressSelect.addEventListener('change', () => {
    addLog(`Address changed → ${addressSelect.value}`);
    updateConfigOutput();
});
sniSelect.addEventListener('change', () => {
    addLog(`SNI changed → ${sniSelect.value}`);
    updateConfigOutput();
});

serverHostSelect.addEventListener('change', () => {
    cloudRunHost = serverHostSelect.value || null;

    if (cloudRunHost) {
        addLog(`Server Host Selected → ${cloudRunHost}`);
        copyConfigBtn.disabled = false;
        fetchHostBtn.classList.remove('active-glow');
    } else {
        addLog('No server host selected');
        copyConfigBtn.disabled = true;
    }

    updateConfigOutput();
});

fetchHostBtn.addEventListener('click', async () => {
     
    fetchHostBtn.disabled = true;
    fetchHostBtn.textContent = 'FETCHING...';
    fetchHostBtn.classList.add('active-glow');
    
    fetchOverlay.classList.remove('active', 'closing');
    void fetchOverlay.offsetWidth;
    fetchLoadingWrapper.classList.remove('hidden');
    successMsg.classList.remove('show');
    fetchOverlay.classList.add('active');

    await fetchAllServers();
    serverHostSelect.disabled = false;

    addLog(`Total ${deployedServers.length} server(s) available`);

    setTimeout(() => {
        fetchLoadingWrapper.classList.add('hidden');

        setTimeout(() => {
            successMsg.style.display = "flex";

            setTimeout(() => {
                closePopup();
            }, 20000);

        }, 300);

    }, 4500);

    fetchHostBtn.textContent = 'FETCH HOSTS';
    fetchHostBtn.disabled = false;
});

copyConfigBtn.addEventListener('click', async () => {
    const text = configOutput.textContent;

    try {
        await navigator.clipboard.writeText(text);
    } catch {
        const ta = document.createElement('textarea');
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
    }

    copyConfigBtn.textContent = 'COPIED ✓';
    copyConfigBtn.classList.add('copied');
    addLog('Configuration Copied: SUCCESS');

    setTimeout(() => {
        copyConfigBtn.textContent = 'COPY CONFIG';
        copyConfigBtn.classList.remove('copied');
    }, 2000);

    document.querySelectorAll('.protocol-card').forEach(card => {
        card.classList.remove('selected');
    });

    selectedTransport = null;
    selectedProtocol = null;
    clearTimeout(transportGlowTimer);
});

function updateActivityGraph(currentVisitors = 0) {
    activityHistory.shift();
    const baseValue = Math.max(1, currentVisitors || Math.floor(Math.random() * 6) + 2);
    activityHistory.push(baseValue * (0.4 + Math.random() * 0.6));
    const maxValue = Math.max(...activityHistory, 1);
    graphBars.forEach((bar, idx) => {
        bar.style.height = `${Math.max(3, (activityHistory[idx]/maxValue)*60)}px`;
    });
}
function updateLatencyStatus() {
    const rand = Math.random();
    if (rand < 0.6) currentLatency = 'good';
    else if (rand < 0.85) currentLatency = 'medium';
    else currentLatency = 'high';
    latencyDot.className = 'status-indicator ' + currentLatency;
    addLog(`System Status → ${currentLatency === 'good' ? 'ST
