/**
 * @fileOverview slider.js 幻灯片组件
 * @global window.Slider 
 */
(function() {
    // 效果是单例的，如何满足动画是多例的
    // 变量都读，赋值到slider上的一个接口上
    var guid = 0;
    function uniqueId(){
        return guid++;
    }

    var effectsCollection = {

        hslide: function(){
            var setup =  function(startPanel) {
                this.content.css({
                    position: 'absolute',
                    width: this.length * this.viewWidth
                });
                this.panels.css('float', 'left');
                
                // 初识的
                this.content.css({left: this.stepWidth * - this.activeIndex});

                // attrs 
            };

            var switchTo = function (panelInfo, onFinish) {
                var _this = this,
                    from = panelInfo.fromIndex,
                    to = panelInfo.toIndex;

                // console.log(this.guid + ' move from ' + from + ' to ' + to);
                this.content.stop(true).animate({'left': to * - this.stepWidth}, this.config.duration, function() {
                    onFinish()
                });
            };

            return {
                setup: setup,
                switchTo: switchTo
            }
        }(),
           
        vslide: function(){
                    var setup = function(startPanel){
                        this.content.css({
                            position: 'absolute',
                            height: this.length * this.viewHeight
                        });

                        this.content.css({top: - (this.viewHeight * this.activeIndex)});
                    }

                    var switchTo = function(panelInfo, onFinish){
                        var _this = this,
                            from = panelInfo.fromIndex,
                            to = panelInfo.toIndex;
                        console.log('this');
                        this.content.stop(true).animate({'top': to * - this.viewHeight}, this.config.duration, function() {
                            onFinish();
                        });
                        
                    }

                    return {
                        setup: setup,
                        switchTo: switchTo
                    }

                }(),

        fade: function(){
            var showStyles = {
                opacity: 1,
                display: 'block'
            },
            hideStyles = {
                opacity: 0,
                display: 'none'
            };

            function setup(startPanels) {
                this.panels.css({
                    position: 'absolute',
                    zIndex: 0,
                    opacity: 0,
                    display: 'none'
                });
                startPanels.css(showStyles);
            }

            function switchTo(panelInfo, onFinish) {
                var _this = this;

                var fromPanels = panelInfo.fromPanels,
                    toPanels = panelInfo.toPanels;

                toPanels.css({
                    display: 'block',
                    zIndex: 1
                });

                // TODO 把this指向了Slider，那么我自身的属性没法访问
                // FIX 自身添加上 this.slider属性，指向slider
                toPanels.animate({'opacity': 1}, this.config.duration, function() {
                    fromPanels.css(hideStyles);
                    toPanels.css('zIndex', 0);
                    onFinish();
                });
            }

            return {
                setup: setup,
                switchTo: switchTo
            }
        }(),

        // or rename tab
        tab: {
            setup: function(startPanel) {
                this.panels.hide();
                startPanel.show();
            },

            switchTo: function(panelInfo, onFinish) {
                panelInfo.fromPanels.hide();
                panelInfo.toPanels.show();
                onFinish();
            }
        }

    }

    // @propertis
    // container
    // config
    // nav
    // content
    // triggers
    // panels|panels
    // activeIndex | index 
    // length 面板的length
    var Slider = function(config) {
        this.guid = uniqueId();

        // TODO use this.setConfig
        this._configure(config);

        // new refactor
        // this._initElements();
        // this._bindEvents();

        this._initElements();
      
        // properties
        // -------------
        this._initAttrs();

        this._installEffect();

        this._bindEvents();

        this._forRun();
    };
    
    // TODO 
    // switchToTo方法加上 form, to 参数，供不同的类型判断
    Slider.prototype = {
        config: {
            container: '#slider',
            content: '',
            nav: '',
            // 元素类  
            panels: '.slide-content li',
            // 触发器类
            triggers: '.slide-nav li',
            // TODO 默认为.prev, .next
            prevBtn: '.prev',
            nextBtn: '.next',
            needTriggers: false,
            // 动画时长
            duration: 500,
            // 自动播放间隔时间
            interval: 500,
            // 触发器延时时间，当triggerType为hover时有用
            delay: 200,
            effect: 'tab', // vslide, carousel
            // initIndex  起始索引
            startIndex: 0,
            // 每次移动几个
            step: 1,

            auto: false,
            // 是否循环播放
            circular: false,
            pauseOnHover: true,
            // or name selectedClass, 
            activeTriggerClass: 'cur',
            // hover|click
            triggerType: 'hover',
            viewWidth: 0,
            viewHeight: 0,
            viewSize: null // 可视区大小
            // TODO 添加动画效果，easing支持 低
            // easing: ,
        },

        constructor: Slider,

        // elements
        // ===========
        panels: null,

        triggers: null,

        nav: null,

        content: null,

        // 变量
        // ===========
        autoTimer: null,

        // 延时触发timer
        delayTimer: null,

        // or currentIndex
        activeIndex: 0,

        last: 0,

        length: 0,

        panelwidth: 0,

        panelHeight: 0,

        // slider的长度
        length: 0,

        // rename maxStep
        max: 0,

        effectorData: null,

        step: 1,

        // debug
        runCount: 0,

        _configure: function(config) {
            config = $.extend({}, this.config, config);
            this.config = config;
        },

        _initElements: function() {
            var config = this.config;

            this.el = this.container = $(config.container);

            this._initPanels();
            this._initTriggers();
            this._initBtns();
        },

        _initPanels: function () {
            var config = this.config,   
                container = this.container;

            this.panels = container.find(config.panels);
            // 引用
            this.slides = this.panels;

            this.content = config.content ? container.find(config.content) : this.panels.parent();

            if(!this.panels.length) {
                throw new Error( this.config.container + ' penels.length is ZERO');
            }
        },

        _initTriggers: function () {
            var config = this.config;

            this.triggers = this.container.find(config.triggers);
            this.nav = config.nav ? this.container.find(config.nav) : this.triggers.parent();

            // TODO 如果没有triggers，并且needTriggers为true，则辅助生成
            if(config.needTriggers) {

            }
        },

        _initBtns: function() {
            var config = this.config;

            var prevBtn = this.container.find(config.prevBtn),
                nextBtn = this.container.find(config.nextBtn);

            this.prevBtn = prevBtn.length ?  prevBtn : null;
            this.nextBtn = nextBtn.length ?  nextBtn : null;
        },

        _initAttrs: function() {
            this.step = this.config.step;

            this.panelWidth = this.panels.outerWidth(true);
            this.panelHeight = this.panels.outerHeight(true);

            this.viewWidth = this.stepWidth = this.config.viewWidth || this.panelWidth * this.step;
            this.viewHeight = this.stepHeight = this.config.viewHeight || this.panelHeight * this.step;

            // this.viewSize
            this.length = this.panels.length/this.step;

            this.max = this.length -1;
        },

        _installEffect: function() {
            var effect = this.config.effect;

            this.effector = effectsCollection[effect];
            this.effectorSetup = this.effector['setup'];
            this.effectorSwitchTo = this.effector['switchTo'];

            if(!this.effector) throw new Error('The effect ' + effect + ' not exists, Please check');
        },

        _bindEvents: function() {
            var _this = this,
                config = this.config;

            // 绑定触发器事件
            if(this.triggers.length) {
                // switch(this.triggers.type) {}
                // this.triggers.click
                if(config.triggerType === 'hover') {
                    console.log('something');
                    this.triggers.hover(function mouseover() {
                        clearInterval(_this.delayTimer);

                        var index = _this.triggers.index(this);

                        _this.delayTimer = setTimeout(function() {
                            _this.switchTo(index);
                        }, config.delay);
                    }, function mouseout() {

                        clearInterval(_this.delayTimer);
                    });

                // 绑定点击切换
                } else {
                    this.triggers.click(function() {
                        var index = _this.triggers.index(this);
                        _this.switchTo(index);
                    });
                }
            }

            // 前进，后退按钮
            if(this.prevBtn) {
                this.prevBtn.click($.proxy(this.prev, this));
            }

            if(this.nextBtn) {
                this.nextBtn.click($.proxy(this.next, this));
            }
            
            // pauseOnHover功能，当开启自动播放时
            if(config.pauseOnHover && config.auto) {
                // 自动暂停，鼠标进入的时候
                this.container.on({
                    'mouseenter': function() {
                        _this.stopAutoplay();
                    },
                    'mouseleave': function() {
                        _this.startAutoplay();
                    }
                });
            }
        },

        // TODO 这个也需要重构
        _forRun: function() {
            var config = this.config;

            if(config.circular) this.enableCircular();

            this.activeIndex = config.startIndex;
            // css setup
            // -------------
            
            this.effectorSetup(this.panels.eq(this.activeIndex));

            this._activeTrigger(this.activeIndex);

            // bind events
            // -------------
            console.log(config.auto);
            if(config.auto) this.startAutoplay();
        },


        // toPanels -> 如果step值存在，应该是多个的
        // fromPanels -> 除去toPanels，如果exclude
        _getPanelInfo: function (from, to) {
            var panels = this.panels,
                step = this.config.step;

            // TODO 修正fromPanels, 应该只包含上一步activeIndex展示的panels

            return {
                fromIndex: from,
                toIndex: to,
                fromPanels: panels.not(":eq(" + to  + ")"),
                toPanels: panels.slice(to*step, (to+1)*step )
            }
        },

        startAutoplay: function() {
            var _this = this,
                config = this.config,
                // 其实是下次设置setTimeout的时间，用wholeInterval不太准确
                wholeInterval = config.interval + config.duration;

            // time方案
            // console.log('autoplay');
            // this.autoTimer = setInterval(function(){
            //     console.log( "timer fired" + ++_this.runCount);
            //     _this.next();
            // }, wholeInterval);
            
            // 防止起多个timer
            this.stopAutoplay();

            _this.autoTimer = setTimeout(function() {

                _this.next();
                _this.autoTimer = setTimeout(arguments.callee, config.interval + config.duration);
            }, config.interval + (Math.random() * 10)/* 加随机数避免他们的timer撞车*/);
        },

        stopAutoplay: function() {
            clearTimeout(this.autoTimer);
        },

        // 停止所有进行中的动画
        // 不用jumpToEnd，不然就会让运动距离过大，跨度大，
        stopAnim: function() {
            // this.panels.stop(true);
            this.content.stop(true);
        },

        destroy: function () {
            
        },

        // 下一针
        next: function () {
            if(this.switching) return;
            var target = this.activeIndex + 1;

            if(target > this.max) {
                target = 0;
            } 

            this.switchTo(target);
        },

        // 上一针
        prev: function() {
            // TODO 这种防止多次触发的应该放到哪里
            if(this.switching) return;
            var target = this.activeIndex - 1;

            if(target < 0) {
                target = this.max;
            } 

            this.switchTo(target);
        },

        // switchTo 核心切换方法
        // 要做哪几件事呢？
        // - 
        // - 
        // - 
        switchTo: function(to) {
            if(to == this.activeIndex) return;

            this.targetIndex = to;

            this.beforeSwitch(to);

            this.trigger('switching', [this.activeIndex, to]);

            var panelInfo = this._getPanelInfo(this.activeIndex, this.targetIndex);

            this.effectorSwitchTo(panelInfo, $.proxy(this.afterSwitch, this));
        },

        jumpTo: function() {

        },

        _activeTrigger: function(index) {
            var activeClass = this.config.activeTriggerClass;
            var activeTrigger = this.triggers.eq(index),
                deactiveTrigger = this.triggers.not(':eq(' + index + ')');

            // TODO 如何找到activeTriggers
            // css
            this.trigger('activeTrigger', [activeTrigger, deactiveTrigger]);

            deactiveTrigger.removeClass(activeClass)
            activeTrigger.addClass(activeClass);
        },  

        beforeSwitch: function(toIndex) {

            // OPTI 是否也放到beforeSwitch中比较清晰
            this.trigger('beforeSwitch', [toIndex])

            this.switching = true;
            this.targetIndex = toIndex;
            this._activeTrigger(toIndex);
        },

        afterSwitch: function() {
            this.switching = false;
            this.activeIndex = this.targetIndex;

            this.trigger('afterSwitch', [this]);
        },

        // 开启循环功能
        // 两个插入点，
        // TODO 可以改为beforeSwitch和afterSwitch
        enableCircular: function() {
            var _this = this,
                sliceView = null,
                isVertical = _this.config.effect === 'vslide',
                prop = isVertical ? 'top': 'left',
                moveSpeed = isVertical ? _this.viewHeight : _this.viewWidth,
                invokeCircular = false; 

            // TODO 重构 这个版本有点羞涩难懂
            this.on('beforeSwitch', function() {    
                var fromIndex = _this.activeIndex,
                    toIndex = _this.targetIndex;

                // 最后一个切换到第一个
                // 做法：把最后几个元素，移到最前面，同时把content重置一下位置，让最后几个仍在当前显示
                if(fromIndex == _this.max && toIndex == 0) {
                    // debugger;
                    invokeCircular = true;
                    // 也即sliceView
                    // 
                    sliceView = _this.panels.slice(-_this.step);

                    // 把开头的几个panel，放到最后
                    sliceView.css({'position': 'relative'});
                    sliceView.css(prop, -(_this.length * moveSpeed) )

                    // 把内容置到
                    _this.content.css(prop, 1 * moveSpeed + 'px');

                // 第一个切换到最后一个
                // 做法：最前面几个元素，移到最后面，
                } else if (fromIndex == 0 && toIndex == _this.max ) {
                    invokeCircular = true;

                    sliceView = _this.panels.slice(0, _this.step);

                    // 把开头的几个panel，放到最后，同时把content重置一下位置，让最前几个仍在当前显示
                    sliceView.css({'position': 'relative'});
                    sliceView.css(prop, (_this.length * moveSpeed) )

                    // 把内容置到
                    _this.content.css(prop, - _this.length * moveSpeed + 'px');
                }
            });

            this.on('afterSwitch', function() {
                if(invokeCircular) {
                    sliceView.css({
                        'position': 'static',
                    });
                }
                invokeCircular = false;
            });
            
        },

        // Helper methods
        // ----------------
        isLast: function() {
            return this.activeIndex === this.max;
        },

        isFirst: function() {
            return this.activeIndex === 0;
        }
        
    }

    window.Slider = Slider;

    // 添加事件处理函数，on, one, off, trigger
    var methods = ['on', 'one', 'off', 'trigger'];

    $.each(methods, function(i, method) {
        Slider.prototype[method] = function() {
            if(!this._events) this._events = $({});
            this._events[method].apply(this._events ,arguments);
        };
    });

})();