// ==UserScript==
// @name         学堂在线助手_全自动版
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  底层API劫持静音、暴力破解可见性检测、柔性处理后台暂停避免死循环。
// @author       Aster.
// @match        *://next.xuetangx.com/learn/*
// @match        *://*.xuetangx.com/learn/*
// @run-at       document-start
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    const CONFIG = {
        speed: 1.0,
        checkInterval: 3000 
    };

    console.log("学堂在线助手 v1.0 已就绪...");

    try {
        const originalMuted = Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, 'muted');
        const originalVolume = Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, 'volume');
        Object.defineProperty(HTMLMediaElement.prototype, 'muted', {
            get: originalMuted.get,
            set: function() { return originalMuted.set.call(this, true); }
        });
        Object.defineProperty(HTMLMediaElement.prototype, 'volume', {
            get: originalVolume.get,
            set: function() { return originalVolume.set.call(this, 0); }
        });
    } catch (err) {}

    Object.defineProperty(document, 'hidden', { value: false, writable: false });
    Object.defineProperty(document, 'visibilityState', { value: 'visible', writable: false });

    Document.prototype.hasFocus = function() { return true; };
    window.document.hasFocus = function() { return true; };

    const blockVisibilityEvent = (e) => {
        e.stopImmediatePropagation();
        e.stopPropagation();
        e.preventDefault();
    };
    window.addEventListener('visibilitychange', blockVisibilityEvent, true);
    window.addEventListener('blur', blockVisibilityEvent, true);
    window.addEventListener('pagehide', blockVisibilityEvent, true);

    if (window.IntersectionObserver) {
        const OriginalObserver = window.IntersectionObserver;
        window.IntersectionObserver = function(callback, options) {
            const modifiedCallback = (entries, observer) => {
                entries.forEach(entry => {
                    Object.defineProperty(entry, 'isIntersecting', { value: true });
                    Object.defineProperty(entry, 'intersectionRatio', { value: 1.0 });
                });
                callback(entries, observer);
            };
            return new OriginalObserver(modifiedCallback, options);
        };
        window.IntersectionObserver.prototype = OriginalObserver.prototype;
    }


    let noVideoCounter = 0;

    const runControl = () => {
        const video = document.querySelector('video');

        if (!video) {
            noVideoCounter++;
            let activeTitle = "";
            const activeItem = document.querySelector('.leaf-item.active') ||
                               document.querySelector('.is-active') ||
                               document.querySelector('.active');
            if (activeItem) activeTitle = activeItem.innerText || "";

            if (activeTitle.includes('作业') || activeTitle.includes('讨论') || noVideoCounter >= 3) {
                console.log("判定当前为非视频任务，正在自动跳过...");
                doJump();
                noVideoCounter = 0;
            }
            return;
        }

        noVideoCounter = 0;

        if (video.playbackRate !== CONFIG.speed) {
            video.playbackRate = CONFIG.speed;
        }

        if (video.paused && !video.ended) {
            const playBtn = document.querySelector('.xt_video_player_play_btn') ||
                            document.querySelector('.play-btn') ||
                            document.querySelector('.xt_video_bit_play_btn');

            if (playBtn) {
                console.log("尝试物理点击唤醒...");
                playBtn.click();
            } else {
                const videoWrapper = video.parentElement;
                if (videoWrapper) videoWrapper.click();
            }
        }

        if (video.ended) {
            console.log("检测到视频播放完毕，正在执行跳转...");
            doJump();
        }
    };

    function doJump() {
        const nextBtns = Array.from(document.querySelectorAll('span, div, a, button'))
            .filter(el => el.innerText && el.innerText.trim() === '下一单元');

        if (nextBtns.length > 0) {
            nextBtns[nextBtns.length - 1].click();
        } else {
            const altNextBtn = document.querySelector('.next');
            if (altNextBtn) altNextBtn.click();
        }
    }

    setTimeout(() => {
        setInterval(runControl, CONFIG.checkInterval);
    }, 3000);

})();
