// ==UserScript==
// @name         学堂在线小助手
// @namespace    http://tampermonkey.net/
// @version      6.0
// @description  底层API劫持实现绝对静音、模拟点击、自动跳转、智能跳过。
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

    console.log("学堂在线助手 v6.0 已就绪...");

    try {
        const originalMuted = Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, 'muted');
        const originalVolume = Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, 'volume');

        Object.defineProperty(HTMLMediaElement.prototype, 'muted', {
            get: originalMuted.get,
            set: function(val) {
                return originalMuted.set.call(this, true);
            }
        });

        Object.defineProperty(HTMLMediaElement.prototype, 'volume', {
            get: originalVolume.get,
            set: function(val) {
                return originalVolume.set.call(this, 0);
            }
        });
        console.log("成功劫持浏览器底层音量 API，网页已物理失声！");
    } catch (err) {
        console.error("底层音量劫持失败:", err);
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
            if (activeItem) {
                activeTitle = activeItem.innerText || "";
            }

            if (activeTitle.includes('作业') || activeTitle.includes('讨论') || noVideoCounter >= 3) {
                console.log("判定当前为非视频任务，正在自动跳过...");
                doJump();
                noVideoCounter = 0;
            }
            return;
        }

        noVideoCounter = 0;

        if (!video.dataset.superMute) {
            video.muted = true;
            video.volume = 0;

            const forceSilence = () => {
                if (!video.muted) video.muted = true;
                if (video.volume > 0) video.volume = 0;
                requestAnimationFrame(forceSilence);
            };
            requestAnimationFrame(forceSilence);

            video.dataset.superMute = "true";
        }

        if (video.playbackRate !== CONFIG.speed) {
            video.playbackRate = CONFIG.speed;
        }

        if (video.paused && !video.ended) {
            const playBtn = document.querySelector('.xt_video_player_play_btn') ||
                            document.querySelector('.play-btn') ||
                            document.querySelector('.xt_video_bit_play_btn');

            if (playBtn) {
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
            if (altNextBtn) {
                altNextBtn.click();
            }
        }
    }

    setTimeout(() => {
        setInterval(runControl, CONFIG.checkInterval);
    }, 3000);

})();
