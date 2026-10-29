console.log(
    '%cbuild from PakePlus： https://github.com/Sjj1024/PakePlus',
    'color:orangered;font-weight:bolder'
)

// very important, if you don't know what it is, don't touch it
const hookClick = (e) => {
    const origin = e.target.closest('a')
    const isBaseTargetBlank = document.querySelector(
        'head base[target="_blank"]'
    )
    console.log('origin', origin, isBaseTargetBlank)
    if (
        (origin && origin.href && origin.target === '_blank') ||
        (origin && origin.href && isBaseTargetBlank)
    ) {
        e.preventDefault()
        console.log('handle origin', origin)
        location.href = origin.href
    } else {
        console.log('not handle origin', origin)
    }
}

window.open = function (url, target, features) {
    console.log('open', url, target, features)
    location.href = url
}

document.addEventListener('click', hookClick, { capture: true })

// ============================
// 补充：PakePlus 桌面端下载拦截 (只拦截 download 属性)
// ============================
(function () {
    if (!('__TAURI__' in window)) return;

    const { invoke } = window.__TAURI__.core;
    const { listen } = window.__TAURI__.event;

    function getFileName(url) {
        try {
            return decodeURIComponent(new URL(url).pathname.split('/').pop()) || 'download';
        } catch {
            return 'download';
        }
    }

    async function handleDownload(url, fileName) {
        try {
            await invoke('download_file', {
                url,
                savePath: fileName || '',
                fileId: fileName || 'default',
            });
        } catch (e) {
            console.error('PakePlus 下载失败：', e);
        }
    }

    function interceptLink(a) {
        if (a.__pakeDownloadIntercepted) return;
        a.__pakeDownloadIntercepted = true;

        a.addEventListener('click', function (e) {
            if (!a.hasAttribute('download')) return;

            e.preventDefault();
            e.stopPropagation();

            const href = a.getAttribute('href') || a.href;
            const fileName = a.getAttribute('download') || getFileName(href);
            handleDownload(href, fileName);
        }, true);
    }

    function interceptAll() {
        document.querySelectorAll('a[download]').forEach(interceptLink);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', interceptAll);
    } else {
        interceptAll();
    }

    new MutationObserver(function (mutations) {
        for (const m of mutations) {
            for (const node of m.addedNodes) {
                if (node.nodeType !== 1) continue;
                if (node.tagName === 'A' && node.hasAttribute('download')) {
                    interceptLink(node);
                }
                node.querySelectorAll && node.querySelectorAll('a[download]').forEach(interceptLink);
            }
        }
    }).observe(document.documentElement, { childList: true, subtree: true });

    listen('download_progress', function (event) {
        const { fileId, downloaded, total } = event.payload || {};
        const percent = total ? ((downloaded / total) * 100).toFixed(2) : 0;
        console.log('下载进度：' + (fileId || '') + ' ' + percent + '%');
    });
})();